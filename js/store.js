import { createDefaultState, DEFAULT_FIREBASE_CONFIG } from "./defaultState.js";
import { createFirebaseClient } from "./firebaseService.js";
import { debounce, safeJSONParse } from "./utils.js";

const STORAGE_KEY = "nucleo-criativo-state-v1";

function resolveFirebaseSettings(candidate = {}) {
  return {
    apiKey: candidate.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: candidate.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    databaseURL: candidate.databaseURL || DEFAULT_FIREBASE_CONFIG.databaseURL,
    projectId: candidate.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: candidate.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      candidate.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: candidate.appId || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId: candidate.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId,
    workspaceId: candidate.workspaceId || DEFAULT_FIREBASE_CONFIG.workspaceId
  };
}

export class Store {
  constructor() {
    this.state = createDefaultState();
    this.listeners = new Set();
    this.firebaseClient = null;
    this.unsubscribeAuth = null;
    this.unsubscribeRemote = null;

    this.persistDebounced = debounce(() => this.persist(), 450);

    this.loadLocal();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState() {
    return this.state;
  }

  setState(updater, options = { save: true }) {
    const nextState = typeof updater === "function" ? updater(this.state) : updater;

    if (!nextState) return;

    nextState.meta = {
      ...nextState.meta,
      updatedAt: Date.now()
    };

    this.state = nextState;
    this.notify();

    if (options.save) {
      this.persistDebounced();
    }
  }

  loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJSONParse(raw);
    if (!parsed) return;

    const defaults = createDefaultState();

    this.state = {
      ...defaults,
      ...parsed,
      meta: {
        ...defaults.meta,
        ...parsed.meta
      },
      settings: {
        ...defaults.settings,
        ...parsed.settings,
        firebase: {
          ...resolveFirebaseSettings(parsed.settings?.firebase)
        }
      }
    };
  }

  persistLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  async persistRemote() {
    if (!this.firebaseClient || !this.state.settings.authUser?.uid) return;

    const payloadState = {
      ...this.state,
      settings: {
        ...this.state.settings,
        firebase: {
          ...this.state.settings.firebase,
          apiKey: "",
          authDomain: "",
          databaseURL: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: "",
          measurementId: ""
        }
      }
    };

    await this.firebaseClient.write(this.state.settings.authUser.uid, {
      updatedAt: this.state.meta.updatedAt,
      data: payloadState
    });

    this.state.settings.lastSyncAt = new Date().toISOString();
    this.persistLocal();
    this.notify();
  }

  async persist() {
    this.persistLocal();
    await this.persistRemote().catch(() => {});
  }

  async connectFirebase() {
    const settings = resolveFirebaseSettings(this.state.settings.firebase);
    this.state.settings.firebase = settings;

    if (!this.firebaseClient) {
      this.firebaseClient = await createFirebaseClient(settings);
    }

    if (!this.unsubscribeAuth) {
      this.unsubscribeAuth = this.firebaseClient.onAuthChange((authUser) => {
        const previousUid = this.state.settings.authUser?.uid || null;
        this.state.settings.authUser = authUser;

        if (!authUser) {
          if (this.unsubscribeRemote) {
            this.unsubscribeRemote();
            this.unsubscribeRemote = null;
          }
          this.state.settings.firebaseConnected = false;
          this.persistLocal();
          this.notify();
          return;
        }

        if (previousUid !== authUser.uid) {
          this.resetWorkspaceForUser(authUser);
        }

        this.subscribeToUserWorkspace(authUser.uid);
      });
    }

    const previousUid = this.state.settings.authUser?.uid || null;
    const currentUser = this.firebaseClient.getCurrentUser();
    this.state.settings.authUser = currentUser;
    this.persistLocal();
    this.notify();

    if (currentUser?.uid) {
      if (previousUid !== currentUser.uid) {
        this.resetWorkspaceForUser(currentUser);
      }
      this.subscribeToUserWorkspace(currentUser.uid);
    }
  }

  resetWorkspaceForUser(authUser) {
    const defaults = createDefaultState();
    const currentSettings = this.state.settings;

    this.state = {
      ...defaults,
      settings: {
        ...currentSettings,
        authUser,
        firebaseConnected: false,
        lastSyncAt: null
      }
    };

    this.persistLocal();
    this.notify();
  }

  subscribeToUserWorkspace(userId) {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }

    this.unsubscribeRemote = this.firebaseClient.subscribe(userId, (payload) => {
      if (!payload?.data?.meta?.updatedAt) return;

      if (payload.data.meta.updatedAt <= this.state.meta.updatedAt) return;

      const localSettings = this.state.settings;

      this.state = payload.data;
      this.state.settings = {
        ...this.state.settings,
        firebase: localSettings.firebase,
        authUser: localSettings.authUser,
        firebaseConnected: true,
        lastSyncAt: new Date().toISOString()
      };

      this.persistLocal();
      this.notify();
    });

    this.state.settings.firebaseConnected = true;
    this.persistLocal();
    this.notify();

    this.persistRemote().catch(() => {});
  }

  async signIn(email, password) {
    await this.connectFirebase();
    const user = await this.firebaseClient.signIn(email, password);
    this.state.settings.authUser = user;
    this.persistLocal();
    this.notify();
  }

  async signUp(email, password) {
    await this.connectFirebase();
    const user = await this.firebaseClient.signUp(email, password);
    this.state.settings.authUser = user;
    this.persistLocal();
    this.notify();
  }

  async signOut() {
    if (!this.firebaseClient) return;
    await this.firebaseClient.signOut();
  }

  disconnectFirebase() {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }

    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }

    this.firebaseClient = null;
    this.state.settings.authUser = null;
    this.state.settings.firebaseConnected = false;
    this.persistLocal();
    this.notify();
  }
}
