function permanentSongTitleKey(title) {
  return String(title || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function permanentSongKey(song) {
  return song.isCover ? "cover" : `song:${song.libraryCanonicalId || song.id}`;
}

function ensurePermanentSongNumbers(data, previous = null) {
  if (!data || !Array.isArray(data.songs)) return data;
  if (previous) ensurePermanentSongNumbers(previous);
  const source = previous?.songNumbering || data.songNumbering;
  const valid = (number) => Number.isSafeInteger(number) && number > 0;
  const numbers = Object.fromEntries(Object.entries(source?.numbers || {}).filter(([, number]) => valid(number)));
  const entries = Object.fromEntries(Object.entries(source?.entries || {}).map(([key, entry]) =>
    [key, { ...entry, titleKeys: [...(entry.titleKeys || [])] }]));
  // Reserve the user's explicitly confirmed printed numbers before migration.
  if (!source) {
    for (const [number, titles] of [[1, ["Naslovnica"]], [31, ["Ko Jezus je začel učiti"]],
      [32, ["Gospod, usmili se (SDM Toronto 2002)", "Gospod usmili se (toronto)"]]]) {
      numbers[`print:${number}`] = number;
      entries[`print:${number}`] = { titleKeys: titles.map(permanentSongTitleKey) };
    }
  }
  const registry = { version: 1, bookInitialized: Boolean(source?.bookInitialized), numbers, entries,
    nextNumber: Math.max(2, valid(source?.nextNumber) ? source.nextNumber : 2, ...Object.values(numbers).map((number) => number + 1)) };
  const reserved = new Set(Object.values(numbers));
  const usedEntries = new Set();
  const initialBook = !registry.bookInitialized;
  const baseKyrieTitle = "gospodusmilise";
  const torontoTitles = ["gospodusmilisesdmtoronto2002", "gospodusmilisetoronto"];
  const isTorontoSong = (song) => Boolean(song && (song.catalogKey === "gospod-toronto-2002"
    || song.id === "library-gospod-toronto-2002" || /\/song\/365\/?$/.test(song.link || "")
    || torontoTitles.includes(permanentSongTitleKey(song.title))));
  const torontoCanonical = data.songs.find((song) => song.catalogKey === "gospod-toronto-2002") || data.songs.find(isTorontoSong);
  const linkedTorontoPage = (data.canvaPages || []).find((page) => Number(numbers[page.numberKey] || page.printNumber || page.page) === 32
    && isTorontoSong(data.songs.find((song) => song.id === page.songId)));
  const torontoSong = data.songs.find((song) => song.id === linkedTorontoPage?.songId) || torontoCanonical;
  if (torontoCanonical) for (const song of data.songs) if (isTorontoSong(song)) song.libraryCanonicalId = torontoCanonical.id;
  const baseKyrie = data.songs.find((song) => !isTorontoSong(song) && permanentSongTitleKey(song.title) === baseKyrieTitle);
  // Repair historical cross-links without changing either printed number.
  for (const [entry, song, titles] of [["print:12", baseKyrie, [baseKyrieTitle]], ["print:32", torontoSong, torontoTitles]]) {
    if (!entries[entry]) continue;
    entries[entry].songKey = song ? permanentSongKey(song) : "";
    entries[entry].titleKeys = [...new Set([...entries[entry].titleKeys.filter((title) =>
      title !== baseKyrieTitle && !torontoTitles.includes(title)), ...titles])];
  }
  const allocate = () => {
    while (reserved.has(registry.nextNumber)) registry.nextNumber++;
    const number = registry.nextNumber++;
    reserved.add(number);
    return number;
  };
  const pages = [...(data.canvaPages || [])].sort((a, b) => a.page - b.page);
  for (const page of pages) {
    const titleKey = permanentSongTitleKey(page.title);
    const linked = data.songs.find((item) => item.id === page.songId);
    const isToronto = torontoTitles.includes(titleKey);
    const linkedIsToronto = isTorontoSong(linked);
    const exact = data.songs.find((item) => permanentSongTitleKey(item.title) === titleKey)
      || (isToronto ? data.songs.find((item) => torontoTitles.includes(permanentSongTitleKey(item.title))) : null);
    const incompatible = (titleKey === "gospodusmilise" && linkedIsToronto) || (isToronto && !linkedIsToronto);
    const printed = Number(numbers[page.numberKey] || page.printNumber || page.page);
    const kyriePage = titleKey === baseKyrieTitle || isToronto || linkedIsToronto;
    const fixedArrangement = kyriePage && (printed === 12 || printed === 32);
    const song = fixedArrangement ? (printed === 32 ? torontoSong : baseKyrie)
      : (page.cover ? data.songs.find((item) => item.id === "songbook-cover") || data.songs.find((item) => item.isCover) : null)
        || exact || (!incompatible ? linked : null);
    // A stale ID must not join the old Kyrie and the Toronto arrangement.
    if (song) page.songId = song.id;
    else if (linked && (fixedArrangement || permanentSongTitleKey(linked.title) !== titleKey)) delete page.songId;
    const cover = page.cover || song?.isCover || (initialBook && Number(page.page) === 1);
    if (page.cover) {
      const previousKey = previous?.canvaPages?.find((item) => item.id === page.id)?.numberKey || page.numberKey;
      if (previousKey && previousKey !== "print:1" && !pages.some((item) => item !== page && item.numberKey === previousKey)) {
        entries[previousKey] = { songKey: "", titleKeys: [] };
      }
    }
    const songKey = song ? permanentSongKey(song) : "";
    const matches = (key) => !usedEntries.has(key) && valid(numbers[key])
      && (entries[key]?.titleKeys.includes(titleKey) || (songKey && entries[key]?.songKey === songKey));
    let key = cover ? "print:1" : page.numberKey && valid(numbers[page.numberKey]) && !usedEntries.has(page.numberKey) ? page.numberKey : "";
    if (!key) {
      const candidates = Object.keys(entries).filter(matches);
      key = candidates.find((candidate) => numbers[candidate] === page.printNumber) || candidates[0] || "";
    }
    if (!key) {
      const printed = Number(page.page);
      const number = initialBook && valid(printed) && !reserved.has(printed) ? printed : allocate();
      key = `print:${number}`;
      numbers[key] = number;
    }
    const number = numbers[key];
    entries[key] = { songKey: songKey || entries[key]?.songKey || "",
      titleKeys: [...new Set([...(entries[key]?.titleKeys || []), key === "print:32" && titleKey === baseKyrieTitle ? torontoTitles[0] : titleKey])] };
    usedEntries.add(key);
    reserved.add(number);
    registry.nextNumber = Math.max(registry.nextNumber, number + 1);
    page.printNumber = number;
    page.numberKey = key;
  }
  if (pages.length) registry.bookInitialized = true;
  for (const song of data.songs) {
    const key = permanentSongKey(song);
    const titleKey = permanentSongTitleKey(song.title);
    const printNumbers = [...new Set(Object.keys(entries).filter((entry) => valid(numbers[entry]) && ((entries[entry].songKey
      ? entries[entry].songKey === key : entries[entry].titleKeys.includes(titleKey)) || (song.isCover && entry === "print:1")))
      .map((entry) => numbers[entry]))].sort((a, b) => a - b);
    if (printNumbers.length) {
      song.printNumbers = printNumbers;
      song.printNumber = printNumbers[0];
    } else {
      delete song.printNumber;
      delete song.printNumbers;
    }
  }
  data.songNumbering = registry;
  return data;
}
