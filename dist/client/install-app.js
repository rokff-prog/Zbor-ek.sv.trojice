(function initializeAppInstallation() {
  const installButton = document.querySelector("#installAppButton");
  const helpDialog = document.querySelector("#installHelpDialog");
  const helpText = document.querySelector("#installHelpText");
  let installPrompt = null;

  if (!installButton || !helpDialog || !helpText) return;

  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSamsung = /Android/i.test(navigator.userAgent) && /SamsungBrowser\//i.test(navigator.userAgent);
  const publicInstallUrl = "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site/?source=app";

  function showManualInstructions() {
    const chromeActions = document.querySelector("#installChromeActions");
    if (chromeActions) chromeActions.hidden = !isSamsung;
    if (isSamsung) {
      helpText.textContent = "Za namestitev uporabi posodobljen Google Chrome. Odpri aplikacijo v Chromu in izberi Namesti aplikacijo. Če se Chrome ne odpre, kopiraj spodnjo povezavo vanj. Varnostne zaščite telefona ne izklapljaj.";
      document.querySelector("#openInstallChrome").href = `intent://${publicInstallUrl.slice(8)}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(publicInstallUrl)};end`;
      document.querySelector("#installPublicUrl").value = publicInstallUrl;
      document.querySelector("#installCopyStatus").textContent = "";
      helpDialog.showModal();
      return;
    }
    helpText.textContent = isIos
      ? "Odpri stran v brskalniku Safari, pritisni gumb za deljenje in izberi Dodaj na začetni zaslon."
      : "Odpri meni brskalnika in izberi Namesti aplikacijo ali Dodaj na začetni zaslon.";
    helpDialog.showModal();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
  });

  installButton.addEventListener("click", async () => {
    if (isStandalone()) {
      installButton.hidden = true;
      return;
    }
    if (isSamsung || !installPrompt) {
      showManualInstructions();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      showManualInstructions();
    }
  });

  document.querySelector("#copyInstallUrl")?.addEventListener("click", async () => {
    const status = document.querySelector("#installCopyStatus");
    try {
      await navigator.clipboard.writeText(publicInstallUrl);
      status.textContent = "Povezava je kopirana.";
    } catch {
      document.querySelector("#installPublicUrl").select();
      status.textContent = "Povezavo kopiraj iz označenega polja.";
    }
  });

  document.querySelector("#closeInstallHelp")?.addEventListener("click", () => helpDialog.close());
  document.querySelector("#confirmInstallHelp")?.addEventListener("click", () => helpDialog.close());
  helpDialog.addEventListener("click", (event) => {
    if (event.target === helpDialog) helpDialog.close();
  });

  if (isStandalone()) installButton.hidden = true;

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
  }
}());
