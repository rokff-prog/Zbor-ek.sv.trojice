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

async function newCanvaPagePdf(planId, page) {
  const job = await canvaRequest("export", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: crypto.randomUUID(), planId, pages: [page.sourcePage] }) });
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const progress = await canvaRequest(`export/${encodeURIComponent(job.jobId)}`);
    if (progress.status === "success") { ready = true; break; }
    if (progress.status !== "in_progress") throw new Error("Canva je vrnila neznano stanje izvoza.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!ready) throw new Error("Canva še ni končala izvoza. Poskusi znova pozneje.");
  const response = await apiFetch(`/api/canva/export/${encodeURIComponent(job.jobId)}/file`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error(error.error || "Prenos nove strani iz Canve ni uspel."), { code: error.code });
  }
  return new File([await response.blob()], `Canva-stran-${page.sourcePage}.pdf`, { type: "application/pdf" });
}

async function publishNewCanvaPages() {
  if (!await saveSongbookToSongs({ download: false, requireImages: true })) throw new Error("Spletno shranjevanje ni uspelo. Nove strani so ostale na tej napravi; ponovi direktni uvoz za ponovno shranjevanje.");
  state.canva.pendingDirectPublish = false;
  persist();
  await saveStateToServer();
}

async function syncConnectedCanva({ silent = false } = {}) {
  if (silent) return loadCanvaConnectionStatus();
  if (!isAdminView || canvaSyncRunning) return;
  if (IS_GITHUB_PUBLIC) return location.assign(`${HOSTED_APP_ORIGIN}/?source=app`);
  canvaSyncRunning = true;
  const button = $("#syncCanva");
  button.disabled = true;
  $("#songbookManualImport").disabled = true;
  let added = 0;
  try {
    const connection = await loadCanvaConnectionStatus();
    if (!connection) throw new Error("Povezave s Canvo ni mogoče preveriti.");
    if (!connection.connected) {
      await openCanvaConnection();
      return;
    }
    setView("songbook");
    if (state.canva?.pendingDirectPublish) await publishNewCanvaPages();
    setPdfImportStatus("Preverjam, katere strani v Canvi so nove ...");
    const plan = await canvaRequest("plan", { method: "POST" });
    const localIds = (state.canvaPages || []).map((page) => page.id).sort();
    if (JSON.stringify(localIds) !== JSON.stringify(plan.localPageIds)) {
      throw new Error("Spletna in lokalna pesmarica se razlikujeta. Najprej shrani pesmarico na splet oziroma osveži aplikacijo.");
    }
    if (plan.requiresBaselineConfirmation && !window.confirm(`Prva povezava strani: ali so vse obstoječe strani v Canvi še vedno v istem vrstnem redu, nove pa dodane na koncu?\n\nČe si nove strani vstavil med stare ali stare prerazporedil, prekliči in uporabi ročni uvoz PDF-ja.`)) {
      setPdfImportStatus("Uvoz je preklican. Obstoječe strani niso bile spremenjene.");
      return;
    }
    for (const mapping of plan.existingPages) {
      const page = state.canvaPages.find((item) => item.id === mapping.localId);
      page.canvaPageId = mapping.canvaPageId;
      page.canvaSourcePage = mapping.sourcePage;
    }
    state.canva = { ...(state.canva || {}), pageCount: plan.pageCount };
    let lastExport = 0;
    for (const [index, page] of plan.newPages.entries()) {
      const wait = Math.max(0, 4100 - (Date.now() - lastExport));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastExport = Date.now();
      setPdfImportStatus(`Prenašam novo stran ${index + 1} od ${plan.newPages.length} (Canva ${page.sourcePage}) ...`);
      const file = await newCanvaPagePdf(plan.planId, page);
      if (await appendCanvaPdfPage(file, page)) {
        added++;
        await publishNewCanvaPages();
      }
    }
    state.canva.lastDirectSync = new Date().toISOString();
    persist();
    await saveStateToServer();
    $("#syncStatus").textContent = added ? `Dodano: ${added} novih strani` : "Ni novih strani";
    setPdfImportStatus(added ? `Dodanih ${added} novih strani. Obstoječe strani in njihove številke niso bile spremenjene.` : "Ni novih strani. Noben PDF ni bil prenesen.");
  } catch (error) {
    const message = `${added ? `Na tej napravi dodanih ${added} novih strani. ` : ""}${error.message}`;
    $("#syncStatus").textContent = message;
    setPdfImportStatus(message);
    if (["configuration_required", "reconnect_required"].includes(error.code)) await openCanvaConnection();
  } finally {
    canvaSyncRunning = false;
    button.disabled = false;
    $("#songbookManualImport").disabled = false;
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
