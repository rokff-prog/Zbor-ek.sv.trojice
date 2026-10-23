(function initializeZborcekAuth() {
  const localHost = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const githubPublic = location.hostname === "rokff-prog.github.io";
  const forcePublic = new URLSearchParams(location.search).has("public");
  const adminOrigin = "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site";
  let stateRevision = 0;
  let pendingSessionCheck = null;
  let signingOut = false;

  const api = {
    state: { isAdmin: localHost && !forcePublic, username: localHost && !forcePublic ? "lokalni skrbnik" : "" },
    async signIn(username, password) {
      if (githubPublic) {
        location.assign(`${adminOrigin}/admin`);
        return api.state;
      }
      if (localHost) {
        updateState(true, username || "lokalni skrbnik");
        return api.state;
      }
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prijava ni uspela.");
      updateState(true, result.username);
      return api.state;
    },
    async signOut() {
      signingOut = true;
      try {
        // Finish renewal first so its response cannot restore the logout cookie.
        await pendingSessionCheck;
        if (!localHost) await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
        updateState(false, "");
        if (location.pathname === "/admin") location.assign("/");
      } finally {
        signingOut = false;
      }
    },
  };

  window.zborcekAuth = api;

  function updateState(isAdmin, username) {
    stateRevision += 1;
    api.state = { isAdmin, username, email: username };
    document.dispatchEvent(new CustomEvent("zborcek-auth-state", { detail: api.state }));
    if (!isAdmin && location.pathname === "/admin") {
      const dialog = document.querySelector("#loginDialog");
      if (dialog && !dialog.open) dialog.showModal();
    }
  }

  if (!localHost && !githubPublic) {
    async function refreshSession() {
      if (signingOut || pendingSessionCheck) return pendingSessionCheck;
      const revision = stateRevision;
      pendingSessionCheck = (async () => {
        try {
          const response = await fetch("/api/auth-state", { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) throw new Error("Prijave trenutno ni mogoče preveriti.");
          const state = await response.json();
          if (revision === stateRevision) updateState(Boolean(state.isAdmin), state.username || "");
        } catch {
          // A temporary network failure must not sign out an already verified user.
          if (revision === stateRevision && !api.state.isAdmin) updateState(false, "");
        }
      })();
      try {
        await pendingSessionCheck;
      } finally {
        pendingSessionCheck = null;
      }
    }
    refreshSession();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshSession();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) refreshSession();
    });
    window.addEventListener("online", refreshSession);
  }
}());
