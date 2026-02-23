export async function createFirebaseClient(firebaseSettings) {
  const {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    workspaceId
  } = firebaseSettings;

  if (!apiKey || !databaseURL || !projectId || !appId || !workspaceId) {
    throw new Error("Configuração Firebase incompleta.");
  }

  const appModule = await import(
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"
  );
  const dbModule = await import(
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js"
  );
  const authModule = await import(
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"
  );

  const config = {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
  };

  const appName = `nucleo_${projectId}`;
  const existing = appModule.getApps().find((app) => app.name === appName);
  const app = existing || appModule.initializeApp(config, appName);

  const db = dbModule.getDatabase(app);
  const auth = authModule.getAuth(app);

  function workspaceRefForUser(userId) {
    return dbModule.ref(db, `users/${userId}/workspaces/${workspaceId}`);
  }

  function toUserPayload(user) {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email || ""
    };
  }

  return {
    getCurrentUser() {
      return toUserPayload(auth.currentUser);
    },

    onAuthChange(onUserChanged) {
      return authModule.onAuthStateChanged(auth, (user) => {
        onUserChanged(toUserPayload(user));
      });
    },

    async signIn(email, password) {
      const credential = await authModule.signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return toUserPayload(credential.user);
    },

    async signUp(email, password) {
      const credential = await authModule.createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return toUserPayload(credential.user);
    },

    async signOut() {
      await authModule.signOut(auth);
    },

    async write(userId, payload) {
      if (!userId) throw new Error("Usuário não autenticado.");
      await dbModule.set(workspaceRefForUser(userId), payload);
    },

    subscribe(userId, onPayload) {
      if (!userId) throw new Error("Usuário não autenticado.");

      const ref = workspaceRefForUser(userId);
      const listener = (snapshot) => {
        const value = snapshot.val();
        if (value) onPayload(value);
      };

      dbModule.onValue(ref, listener);

      return () => dbModule.off(ref, "value", listener);
    }
  };
}
