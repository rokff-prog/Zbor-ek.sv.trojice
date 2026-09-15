(function initializeZborcekAuth() {
  const config = window.ZBORCEK_AUTH_CONFIG || {};
  const localHost = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const forcePublic = new URLSearchParams(location.search).has("public");
  let firebaseAuth = null;
  let firebaseApi = null;

  const api = {
    state: { isAdmin: localHost && !forcePublic, email: localHost && !forcePublic ? "lokalni skrbnik" : "" },
    async signIn() {
      if (!config.firebase) throw new Error("Google prijava še ni nastavljena. Dopolni auth-config.js.");
      const result = await firebaseApi.signInWithPopup(firebaseAuth, new firebaseApi.GoogleAuthProvider());
      return validateUser(result.user);
    },
    async signOut() {
      if (firebaseAuth && firebaseApi) await firebaseApi.signOut(firebaseAuth);
      updateState(false, "");
    },
  };

  window.zborcekAuth = api;

  function updateState(isAdmin, email) {
    api.state = { isAdmin, email };
    document.dispatchEvent(new CustomEvent("zborcek-auth-state", { detail: api.state }));
  }

  async function validateUser(user) {
    const email = String(user?.email || "").toLowerCase();
    const allowed = (config.adminEmails || []).map((value) => String(value).toLowerCase());
    const isAdmin = Boolean(email && allowed.includes(email));
    if (!isAdmin && firebaseAuth && firebaseApi) await firebaseApi.signOut(firebaseAuth);
    updateState(isAdmin, isAdmin ? email : "");
    if (!isAdmin) throw new Error("Ta Google račun nima skrbniškega dostopa.");
    return api.state;
  }

  if (config.firebase) {
    Promise.all([
      import("https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js"),
    ]).then(([appModule, authModule]) => {
      firebaseApi = authModule;
      firebaseAuth = authModule.getAuth(appModule.initializeApp(config.firebase));
      authModule.onAuthStateChanged(firebaseAuth, (user) => {
        if (user) validateUser(user).catch(() => {});
        else updateState(false, "");
      });
    }).catch(() => updateState(false, ""));
  }
}());
