export async function createFirebaseClient(firebaseSettings) {
  const {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
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

  const config = {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  };

  const appName = `nucleo_${projectId}`;
  const existing = appModule.getApps().find((app) => app.name === appName);
  const app = existing || appModule.initializeApp(config, appName);

  const db = dbModule.getDatabase(app);
  const workspaceRef = dbModule.ref(db, `workspaces/${workspaceId}`);

  return {
    async write(payload) {
      await dbModule.set(workspaceRef, payload);
    },
    subscribe(onPayload) {
      const listener = (snapshot) => {
        const value = snapshot.val();
        if (value) onPayload(value);
      };

      dbModule.onValue(workspaceRef, listener);

      return () => dbModule.off(workspaceRef, "value", listener);
    }
  };
}
