(function (root) {
  const PARTS = ["Vstopna", "Gospod usmili se", "Slava", "Psalm", "Aleluja",
    "Darovanje", "Svet", "Jagnje Bo\u017eje", "Obhajilo", "Zaklju\u010dek"];
  const colors = {
    "1": { name: "Svetlomodra", background: "#a4bdfc", foreground: "#111111" },
    "2": { name: "Mentolova", background: "#7ae7bf", foreground: "#111111" },
    "3": { name: "Vijoli\u010dna", background: "#dbadff", foreground: "#111111" },
    "4": { name: "Ro\u017enata", background: "#ff887c", foreground: "#111111" },
    "5": { name: "Rumena", background: "#fbd75b", foreground: "#111111" },
    "6": { name: "Oran\u017ena", background: "#ffb878", foreground: "#111111" },
    "7": { name: "Turkizna", background: "#46d6db", foreground: "#111111" },
    "8": { name: "Siva", background: "#e1e1e1", foreground: "#111111" },
    "9": { name: "Modra", background: "#5484ed", foreground: "#111111" },
    "10": { name: "Zelena", background: "#51b749", foreground: "#111111" },
    "11": { name: "Rde\u010da", background: "#dc2127", foreground: "#ffffff" },
  };

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function isAdvent(date) {
    const year = date.slice(0, 4);
    const start = new Date(`${year}-11-27T12:00:00Z`);
    start.setUTCDate(27 + (7 - start.getUTCDay()) % 7);
    return date >= start.toISOString().slice(0, 10) && date < `${year}-12-25`;
  }

  function eventsFromState(state, now = new Date()) {
    const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now).map(({ type, value }) => [type, value]));
    const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
    const songs = Array.isArray(state?.songs) ? state.songs.filter((song) => song && typeof song.id === "string") : [];
    const byId = new Map(songs.map((song) => [song.id, song]));
    const aliases = new Map();
    for (const song of songs) {
      if (typeof song.libraryCanonicalId === "string" && !aliases.has(song.libraryCanonicalId)) {
        aliases.set(song.libraryCanonicalId, song);
      }
    }
    const resolveSong = (id) => {
      if (typeof id !== "string" || !id) return null;
      let song = byId.get(id) || aliases.get(id);
      const seen = new Set();
      while (song) {
        if (song.isCover || seen.has(song.id)) return null;
        seen.add(song.id);
        const canonical = byId.get(song.libraryCanonicalId);
        if (!canonical || canonical === song) break;
        song = canonical;
      }
      return song && typeof song.title === "string" && song.title.trim() ? song : null;
    };
    const events = new Map();
    for (const entry of Array.isArray(state?.massHistory) ? state.massHistory : []) {
      if (!entry || !validDate(entry.date) || entry.date < today || events.has(entry.date)) continue;
      const lines = [];
      for (const part of PARTS) {
        if (part === "Slava" && isAdvent(entry.date)) continue;
        const additional = entry.additionalSelections?.[part];
        const ids = [entry.selections?.[part], ...(Array.isArray(additional) ? additional : [])];
        const label = typeof entry.partLabels?.[part] === "string" ? entry.partLabels[part] : part;
        for (const id of ids) {
          const song = resolveSong(id);
          if (song) lines.push(label ? `${label}: ${song.title}` : song.title);
        }
      }
      const note = typeof entry.note === "string" ? entry.note.trim() : "";
      if (!note && !lines.length) continue;
      const end = new Date(`${entry.date}T12:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      events.set(entry.date, {
        key: `mass:${entry.date}`,
        date: entry.date,
        endDate: end.toISOString().split("T")[0],
        title: note ? `Zbor\u010dek - ${note}` : "Zbor\u010dek - sveta ma\u0161a",
        description: lines.join("\n"),
        allDay: true,
        colorId: "6",
      });
    }
    const custom = publicEntries(state).filter((entry) => entry.date >= today).map((entry) => {
      const end = new Date(`${entry.date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
      return { key: `event:${entry.id}`, date: entry.date, endDate: end.toISOString().slice(0, 10),
        title: `Zbor\u010dek - ${entry.title}`, description: entry.description, allDay: true, colorId: entry.colorId };
    });
    return [...events.values(), ...custom].sort((left, right) => left.date.localeCompare(right.date) || left.key.localeCompare(right.key));
  }

  function publicEntries(state) {
    const seen = new Set();
    return (Array.isArray(state?.calendarEvents) ? state.calendarEvents : []).filter((entry) => {
      if (!entry || typeof entry.id !== "string" || !entry.id || seen.has(entry.id) || !validDate(entry.date)
        || typeof entry.title !== "string" || !entry.title.trim()) return false;
      seen.add(entry.id); return true;
    }).map((entry) => ({ id: entry.id, date: entry.date, title: entry.title.trim(),
      description: typeof entry.description === "string" ? entry.description : "",
      colorId: Object.hasOwn(colors, String(entry.colorId)) ? String(entry.colorId) : "6" }));
  }

  function googleEventsFromState(state, now = new Date()) {
    const grouped = new Map();
    for (const event of eventsFromState(state, now)) {
      if (!grouped.has(event.date)) grouped.set(event.date, []);
      grouped.get(event.date).push(event);
    }
    // The existing Google sync owns one stable event per day; keep that identity.
    return [...grouped.values()].map((events) => events.length === 1 ? { ...events[0], key: `mass:${events[0].date}`, colorId: "6" } : ({
      ...events[0], key: `mass:${events[0].date}`, colorId: "6",
      title: `Zbor\u010dek - ${events.map((event) => event.title.replace(/^Zbor\u010dek - /, "")).join(" / ")}`,
      description: events.map((event) => `${event.title}\n${event.description}`).join("\n\n"),
    }));
  }
  root.ZborcekCalendar = { eventsFromState, googleEventsFromState, publicEntries, colors };
}(globalThis));
