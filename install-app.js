(function initializeAppInstallation() {
  const installButton = document.querySelector("#installAppButton");
  const helpDialog = document.querySelector("#installHelpDialog");
  const helpText = document.querySelector("#installHelpText");
  let installPrompt = null;

  if (!installButton || !helpDialog || !helpText) return;

  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function showManualInstructions() {
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
    if (!installPrompt) {
      showManualInstructions();
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
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
