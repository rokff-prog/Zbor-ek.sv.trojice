let canvaSyncRunning = false;
let canvaReturnHandled = false;

async function canvaRequest(path, options = {}) {
  const response = await apiFetch(`/api/canva/${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Povezava s Canvo ni uspela."), { code: data.code });
  return data;
}

async function loadCanvaConnectionStatus() {
  if (!isAdminView || IS_GITHUB_PUBLIC) return null;
  try {
    const data = await canvaRequest("status");
    $("#syncStatus").textContent = data.connected ? "Račun Canva je povezan" : "Račun Canva ni povezan";
    $("#canvaConnection").textContent = data.connected ? "Nastavitve Canve" : "Poveži Canvo";
    $("#canvaConfigFields").hidden = data.configured;
    $("#canvaSaveConnection").hidden = data.configured;
    $("#canvaEditConfig").hidden = !data.configured;
    $("#canvaConnectAccount").hidden = !data.configured;
    $("#canvaDisconnect").hidden = !data.connected;
    $("#canvaRedirectUri").value = data.redirectUri;
    $("#canvaConnectionStatus").textContent = data.connected ? "Račun je povezan." : "Račun še ni povezan.";
    if (!canvaReturnHandled) {
      const url = new URL(location.href);
      const result = url.searchParams.get("canva");
      if (result) {
        canvaReturnHandled = true;
        setView("songbook");
        setPdfImportStatus(result === "connected" ? "Canva je povezana. Za prenos pesmarice klikni Osveži Canvo." : "Povezovanje s Canvo je bilo preklicano.");
        url.searchParams.delete("canva");
        history.replaceState(null, "", url);
      }
    }
    return data;
  } catch (error) {
    $("#syncStatus").textContent = error.message;
    $("#canvaConnectionStatus").textContent = error.message;
    return null;
  }
}

async function openCanvaConnection() {
  if (!isAdminView) return;
  $("#canvaConnectionDialog").showModal();
  await loadCanvaConnectionStatus();
}

async function connectCanvaAccount() {
  const data = await canvaRequest("connect", { method: "POST" });
  const url = new URL(data.url);
  if (url.origin !== "https://www.canva.com" || url.pathname !== "/api/oauth/authorize") throw new Error("Neveljaven naslov povezave s Canvo.");
  location.assign(url.href);
}

async function syncConnectedCanva({ silent = false } = {}) {
  if (silent) return loadCanvaConnectionStatus();
  if (!isAdminView || canvaSyncRunning) return;
  if (IS_GITHUB_PUBLIC) return location.assign(`${HOSTED_APP_ORIGIN}/?source=app`);
  canvaSyncRunning = true;
  const button = $("#syncCanva");
  button.disabled = true;
  try {
    const connection = await loadCanvaConnectionStatus();
    if (!connection) throw new Error("Povezave s Canvo ni mogoče preveriti.");
    if (!connection.connected) {
      await openCanvaConnection();
      return;
    }
    setView("songbook");
    setPdfImportStatus("Canva pripravlja najnovejšo pesmarico ...");
    const job = await canvaRequest("export", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: crypto.randomUUID() }) });
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const progress = await canvaRequest(`export/${encodeURIComponent(job.jobId)}`);
      if (progress.status === "success") { ready = true; break; }
      if (progress.status !== "in_progress") throw new Error("Canva je vrnila neznano stanje izvoza.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!ready) throw new Error("Canva še ni končala izvoza. Poskusi znova pozneje.");
    setPdfImportStatus("Prenašam PDF neposredno iz Canve ...");
    const response = await apiFetch(`/api/canva/export/${encodeURIComponent(job.jobId)}/file`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw Object.assign(new Error(error.error || "Prenos PDF-ja iz Canve ni uspel."), { code: error.code });
    }
    const file = new File([await response.blob()], "Canva-pesmarica.pdf", { type: "application/pdf" });
    if (!await importCanvaPdf(file)) throw new Error("Uvoz PDF-ja iz Canve ni uspel.");
    state.canva.lastDirectSync = new Date().toISOString();
    if (!await saveSongbookToSongs({ download: false })) throw new Error("Spletno shranjevanje ni uspelo. Uvožena pesmarica je ostala na tej napravi.");
    $("#syncStatus").textContent = `Osveženo: ${state.canvaPages.length} strani`;
    setPdfImportStatus(`Canva je osvežena: ${state.canvaPages.length} strani je shranjenih v spletni pesmarici.`);
  } catch (error) {
    $("#syncStatus").textContent = error.message;
    setPdfImportStatus(error.message);
    if (["configuration_required", "reconnect_required"].includes(error.code)) await openCanvaConnection();
  } finally {
    canvaSyncRunning = false;
    button.disabled = false;
  }
}

function wireCanvaConnection() {
  $("#canvaConnection").addEventListener("click", openCanvaConnection);
  $("#closeCanvaConnection").addEventListener("click", () => $("#canvaConnectionDialog").close());
  $("#canvaConnectionDialog").addEventListener("close", () => {
    $("#canvaClientId").value = "";
    $("#canvaClientSecret").value = "";
  });
  $("#canvaEditConfig").addEventListener("click", () => {
    $("#canvaConfigFields").hidden = false;
    $("#canvaSaveConnection").hidden = false;
    $("#canvaConnectAccount").hidden = true;
    $("#canvaEditConfig").hidden = true;
  });
  $("#canvaConnectionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#canvaSaveConnection");
    button.disabled = true;
    try {
      await canvaRequest("config", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: $("#canvaClientId").value.trim(), clientSecret: $("#canvaClientSecret").value.trim() }) });
      $("#canvaClientId").value = "";
      $("#canvaClientSecret").value = "";
      await connectCanvaAccount();
    } catch (error) {
      $("#canvaConnectionStatus").textContent = error.message;
    } finally {
      $("#canvaClientSecret").value = "";
      button.disabled = false;
    }
  });
  $("#canvaConnectAccount").addEventListener("click", async () => {
    try { await connectCanvaAccount(); } catch (error) { $("#canvaConnectionStatus").textContent = error.message; }
  });
  $("#canvaDisconnect").addEventListener("click", async () => {
    try {
      await canvaRequest("disconnect", { method: "POST" });
      await loadCanvaConnectionStatus();
    } catch (error) { $("#canvaConnectionStatus").textContent = error.message; }
  });
}
