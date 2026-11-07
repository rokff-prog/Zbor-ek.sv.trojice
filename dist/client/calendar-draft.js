(function (root) {
  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
      && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  }
  function datesFromDraft(draft, now = new Date()) {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Ljubljana" }).format(now);
    if (!String(draft.title || "").trim()) throw Error("Vnesi naslov dogodka.");
    if (String(draft.title).trim().length > 160 || String(draft.description || "").length > 3000) throw Error("Naslov ali opis je predolg.");
    if (draft.colorId && !Object.hasOwn(root.ZborcekCalendar?.colors || {}, String(draft.colorId))) throw Error("Izberi veljavno barvo.");
    if (!validDate(draft.date) || draft.date < today) throw Error("Izberi današnji ali prihodnji datum.");
    if (draft.repeat === "none") return [draft.date];
    if (draft.repeat !== "weekly") throw Error("Izberi veljavno ponavljanje.");
    if (!validDate(draft.until) || draft.until < draft.date) throw Error("Konec ponavljanja ne sme biti pred začetnim datumom.");
    const latest = new Date(`${draft.date}T00:00:00Z`); latest.setUTCFullYear(latest.getUTCFullYear() + 5);
    if (draft.until > latest.toISOString().slice(0, 10)) throw Error("Ponavljanje lahko traja največ pet let.");
    const days = [...new Set(draft.weekdays || [])];
    if (!days.length || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw Error("Izberi vsaj en dan v tednu.");
    const R = root.rrule?.RRule;
    if (!R) throw Error("Ponavljanje trenutno ni na voljo. Osveži stran.");
    const weekdays = [R.MO, R.TU, R.WE, R.TH, R.FR, R.SA, R.SU];
    // All-day occurrences use UTC dates so DST never shifts the selected weekday.
    const rule = new R({ freq: R.WEEKLY, dtstart: new Date(`${draft.date}T00:00:00Z`),
      until: new Date(`${draft.until}T23:59:59Z`), byweekday: days.map((day) => weekdays[day]) });
    const dates = rule.all((date, index) => index <= 365).map((date) => date.toISOString().slice(0, 10));
    if (dates.length > 365) throw Error("Naenkrat lahko dodaš največ 365 dogodkov.");
    if (!dates.length) throw Error("V izbranem obdobju ni izbranega dneva v tednu.");
    return dates;
  }
  root.ZborcekCalendarDraft = { datesFromDraft };
}(globalThis));
