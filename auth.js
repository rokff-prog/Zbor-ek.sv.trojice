(function initializeZborcekAuth() {
  const localHost = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const githubPublic = location.hostname === "rokff-prog.github.io";
  const forcePublic = new URLSearchParams(location.search).has("public");
  const adminOrigin = "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site";

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
      if (!localHost) await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      updateState(false, "");
      if (location.pathname === "/admin") location.assign("/");
    },
  };

  window.zborcekAuth = api;

  function updateState(isAdmin, username) {
    api.state = { isAdmin, username, email: username };
    document.dispatchEvent(new CustomEvent("zborcek-auth-state", { detail: api.state }));
    if (!isAdmin && location.pathname === "/admin") {
      const dialog = document.querySelector("#loginDialog");
      if (dialog && !dialog.open) dialog.showModal();
    }
  }

  if (!localHost && !githubPublic) {
    fetch("/api/auth-state", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : { isAdmin: false, username: "" })
      .then((state) => updateState(Boolean(state.isAdmin), state.username || ""))
      .catch(() => updateState(false, ""));
  }
}());
