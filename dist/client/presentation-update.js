let presentationUpdateRunning = false;

async function presentationFileExists(directory, name) {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (error) {
    if (error.name === "NotFoundError") return false;
    throw error;
  }
}

async function writePresentationFile(directory, name, content) {
  const file = await directory.getFileHandle(name, { create: true });
  const stream = await file.createWritable();
  try {
    await stream.write(content);
    await stream.close();
  } catch (error) {
    await stream.abort().catch(() => {});
    throw error;
  }
}

function presentationImageFile(song) {
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/.exec(song.imageDataUrl || "");
  if (!match) throw new Error(`Manjka slika pesmi št. ${song.number}.`);
  const bytes = Uint8Array.from(atob(match[2].replace(/\s/g, "")), (char) => char.charCodeAt(0));
  const png = match[1] === "png";
  const signature = png ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
  if (!signature.every((byte, index) => bytes[index] === byte)) throw new Error(`Neveljavna slika pesmi št. ${song.number}.`);
  return { extension: png ? "png" : "jpg", bytes };
}

function songbookUsbPageDetails(item) {
  const number = Number(numberForSongbookItem(item));
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Pesem nima veljavne stalne številke.");
  const sameNumberPages = (state.canvaPages?.length ? state.canvaPages : state.songs.filter((song) => song.inBook))
    .filter((page) => Number(numberForSongbookItem(page)) === number)
    .sort((a, b) => Number(a.canvaDbPage || a.canvaPage || a.page || 0) - Number(b.canvaDbPage || b.canvaPage || b.page || 0));
  const pageIndex = Math.max(1, sameNumberPages.findIndex((page) => page.id === item.id) + 1);
  return { number, pageIndex };
}

async function downloadCurrentSongbookPageForUsb() {
  const item = currentSongbookItem();
  if (!item) return false;
  const button = $("#downloadSongbookPageForUsb");
  button.disabled = true;
  try {
    const sourcePage = Number(item.canvaDbPage || item.canvaPage || item.page || 0);
    let imageDataUrl = canvaPageImages.get(sourcePage) || item.canvaImage || "";
    if (imageDataUrl) imageDataUrl = await imageUrlToDataUrl(imageDataUrl);
    if (!imageDataUrl) {
      const bundled = (window.ZBORCEK_SONGBOOK?.songs || []).find((song) => Number(song.page) === sourcePage);
      imageDataUrl = bundled?.imageDataUrl || "";
    }
    const details = songbookUsbPageDetails(item);
    const image = presentationImageFile({ number: details.number, imageDataUrl });
    const filename = `pesem-${String(details.number).padStart(3, "0")}-${details.pageIndex}.${image.extension}`;
    const blob = new Blob([image.bytes], { type: image.extension === "png" ? "image/png" : "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setPdfImportStatus(`Prenesena je ${filename}. Dodaj jo v mapo »dodane-pesmi« na USB-ju.`);
    return true;
  } catch (error) {
    setPdfImportStatus(`Prenos ni uspel: ${error.message}`);
    return false;
  } finally {
    button.disabled = false;
  }
}

async function updatePresentationFolder(directory, payload, progress = () => {}) {
  const songs = payload.songs || [];
  if (!songs.length) throw new Error("Pesmarica je prazna.");
  const numbers = new Set();
  const images = songs.map((song) => {
    if (!Number.isSafeInteger(song.number) || song.number < 1 || numbers.has(song.number)) {
      throw new Error("Številke pesmi niso enolične. Najprej osveži pesmarico.");
    }
    numbers.add(song.number);
    return presentationImageFile(song);
  });
  const nativePlayer = await presentationFileExists(directory, "zborcek-predvajalnik.ps1");
  if (nativePlayer) {
    const imageDirectory = await directory.getDirectoryHandle("predvajalnik-pesmi");
    if (!await presentationFileExists(imageDirectory, "katalog.tsv")) throw new Error("V izbrani mapi manjka katalog pesmi.");
    const updateId = crypto.randomUUID();
    const rows = ["# številka\tdatoteka\tnaslov"];
    for (let index = 0; index < songs.length; index += 1) {
      const song = songs[index];
      const image = images[index];
      const filename = `stran-${song.number}-${updateId}.${image.extension}`;
      progress(`Posodabljam pesem ${index + 1} od ${songs.length} ...`);
      await writePresentationFile(imageDirectory, filename, image.bytes);
      rows.push(`${song.number}\t${filename}\t${String(song.title || "Brez naslova").replace(/[\t\r\n]+/g, " ")}`);
    }
    // Switch the catalog only after every new image has been written successfully.
    await writePresentationFile(imageDirectory, "katalog.tsv", rows.join("\r\n") + "\r\n");
    return songs.length;
  }
  if (await presentationFileExists(directory, "usb-predvajalnik.html")) {
    await writePresentationFile(directory, "zborcek-predstavitev-pesmarica.js", `window.ZBORCEK_SONGBOOK = ${JSON.stringify(payload)};`);
    return songs.length;
  }
  throw new Error("Izberi mapo obstoječega predstavitvenega programa (zborcek-predvajalnik.ps1 ali usb-predvajalnik.html).");
}

async function updatePresentationProgram() {
  if (!isAdminView || presentationUpdateRunning) return false;
  if (typeof window.showDirectoryPicker !== "function") {
    setPdfImportStatus("Za neposredno posodobitev programa odpri aplikacijo v brskalniku Chrome ali Edge na računalniku.");
    return false;
  }
  presentationUpdateRunning = true;
  const button = $("#updatePresentation");
  button.disabled = true;
  try {
    const directory = await window.showDirectoryPicker({ id: "zborcek-presentation", mode: "readwrite" });
    setPdfImportStatus("Pripravljam pesmi za obstoječi predstavitveni program ...");
    const payload = await presentationSongbookPayload({ requireImages: true });
    const count = await updatePresentationFolder(directory, payload, setPdfImportStatus);
    setPdfImportStatus(`Posodobljenih ${count} strani v mapi »${directory.name}«. Program lahko znova odpreš.`);
    return true;
  } catch (error) {
    setPdfImportStatus(error.name === "AbortError" ? "Posodobitev je preklicana." : `Posodobitev ni uspela: ${error.message}`);
    return false;
  } finally {
    presentationUpdateRunning = false;
    button.disabled = false;
  }
}
