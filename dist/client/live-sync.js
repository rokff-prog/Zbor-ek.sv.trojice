(function (root) {
  root.createZborcekLiveSync = function (options) {
    const S = root.ZborcekStateSync;
    let base = null, etag = "", adminMode = null, working = null, refreshing = null, conflict = null, timer = null, stopped = true, ticking = false;
    const key = "zborcek-live-sync-pair-v1";
    let privatePair = null;
    let initialDraft = S.snapshot(options.read());
    const status = (name) => options.status(name);
    const remember = () => {
      if (!base) return;
      privatePair = { base: S.copy(base), draft: current() };
      try { localStorage.setItem(key, JSON.stringify(privatePair)); } catch {}
    };
    const current = () => S.snapshot(options.read());
    function setBase(remote) { base = S.snapshot(remote); }
    function apply(value, isPublic) { options.apply(value, isPublic); }
    function conflictWith(remote) { conflict = remote; status("conflict"); options.conflict(true); }
    async function refresh(force = false) {
      if (refreshing) return refreshing;
      if (working) return working;
      if (!force && base && options.admin() && options.editing()) return;
      refreshing = (async () => {
        const admin = options.admin();
        if (adminMode !== admin) {
          etag = "";
          if (admin) {
            if (!privatePair) { try { privatePair = JSON.parse(localStorage.getItem(key) || "null"); } catch {} }
            if (privatePair?.base && privatePair?.draft) { setBase(privatePair.base); apply(privatePair.draft, false); }
            else if (adminMode === false) initialDraft = current();
          } else if (adminMode === true) { remember(); base = null; }
          adminMode = admin;
        }
        const response = await options.request(admin ? "/api/state" : "/api/public-state", { headers: etag ? { "If-None-Match": etag } : {} });
        if (admin !== options.admin()) return;
        if (response.status === 304) { if (!conflict) status(admin && base && S.diff(base, current()).length ? "pending" : "saved"); return; }
        if (response.status === 404) { if (admin) base = {}; return; }
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const remote = await response.json();
        etag = response.headers.get("ETag") || "";
        if (admin) {
          if (conflict) { conflict = remote; return; }
          const local = current(), changes = S.diff(base || initialDraft, local);
          const merged = S.merge(S.snapshot(remote), changes, true, local);
          if (changes.length && S.merge(S.snapshot(remote), changes).conflicts.length) { conflictWith(remote); return; }
          setBase(remote); apply(merged.state, false); remember();
          status(changes.length ? "pending" : "saved");
        } else { apply(remote, true); status("saved"); }
      })().catch((error) => { status("offline"); throw error; }).finally(() => { refreshing = null; });
      return refreshing;
    }
    async function flush() {
      if (!options.admin()) return false;
      if (conflict) { status("conflict"); return false; }
      if (!base) throw Error("Podatkov s strežnika ni mogoče preveriti.");
      for (let attempt = 0; attempt < 5; attempt++) {
        const sent = current(), changes = S.diff(base, sent);
        if (!changes.length) { status("saved"); return true; }
        status("saving");
        const response = await options.request("/api/state/changes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ protocol: 1, changes }) });
        const data = await response.json();
        if (!options.admin()) return false;
        if (response.status === 409 && data.state) { conflictWith(data.state); return false; }
        if (!response.ok) throw Error(data.error || `HTTP ${response.status}`);
        const local = current(), more = S.diff(sent, local);
        if (S.merge(S.snapshot(data.state), more).conflicts.length) { conflictWith(data.state); remember(); return false; }
        const merged = S.merge(S.snapshot(data.state), more, true, local);
        setBase(data.state); etag = ""; apply(merged.state, false); remember();
      }
      status("pending"); return false;
    }
    async function save() {
      if (working) return working;
      // Load the initial baseline before taking the save lock.
      if (!base && options.admin()) await refresh(true);
      if (refreshing) await refreshing;
      if (working) return working;
      working = flush().catch((error) => { status("offline"); throw error; }).finally(() => { working = null; });
      return working;
    }
    async function tick() {
      if (stopped || ticking) return;
      ticking = true;
      try {
        await refresh();
        if (options.admin() && base && !conflict && S.diff(base, current()).length) await save();
      } catch {}
      ticking = false;
      if (!stopped) timer = setTimeout(tick, document.visibilityState === "hidden" ? 15000 : 1800);
    }
    async function resolve(preferLocal) {
      if (!conflict) return;
      const local = current(), changes = S.diff(base || {}, local);
      const merged = S.merge(S.snapshot(conflict), changes, preferLocal, local);
      setBase(conflict); conflict = null; etag = ""; options.conflict(false); apply(merged.state, false); remember();
      return save();
    }
    const wake = () => { if (!stopped) { clearTimeout(timer); void tick(); } };
    return { refresh, save, resolve,
      dirty() { if (options.admin()) remember(); if (!conflict) status("pending"); },
      start() { if (!stopped) return; stopped = false; window.addEventListener("online", wake); window.addEventListener("focus", wake);
        window.addEventListener("offline", () => status("offline")); document.addEventListener("visibilitychange", wake); wake(); },
      stop() { stopped = true; clearTimeout(timer); },
    };
  };
}(globalThis));
