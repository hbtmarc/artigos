import { createDefaultState } from "./defaultState.js";
import { createFirebaseClient } from "./firebaseService.js";
import { debounce, safeJSONParse } from "./utils.js";

const STORAGE_KEY = "nucleo-criativo-state-v1";

export class Store {
  constructor() {
    this.state = createDefaultState();
    this.listeners = new Set();
    this.firebaseClient = null;
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

    this.state = {
      ...createDefaultState(),
      ...parsed,
      meta: {
        ...createDefaultState().meta,
        ...parsed.meta
      }
    };
  }

  persistLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  async persistRemote() {
    if (!this.firebaseClient) return;

    await this.firebaseClient.write({
      updatedAt: this.state.meta.updatedAt,
      data: this.state
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
    const settings = this.state.settings.firebase;

    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }

    this.firebaseClient = await createFirebaseClient(settings);

    this.unsubscribeRemote = this.firebaseClient.subscribe((payload) => {
      if (!payload?.data?.meta?.updatedAt) return;

      if (payload.data.meta.updatedAt <= this.state.meta.updatedAt) return;

      this.state = payload.data;
      this.state.settings.firebaseConnected = true;
      this.state.settings.lastSyncAt = new Date().toISOString();
      this.persistLocal();
      this.notify();
    });

    this.state.settings.firebaseConnected = true;
    this.persistLocal();
    this.notify();

    await this.persistRemote();
  }

  disconnectFirebase() {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }

    this.firebaseClient = null;
    this.state.settings.firebaseConnected = false;
    this.persistLocal();
    this.notify();
  }
}
