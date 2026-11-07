const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const c = vm.createContext({});
for (const file of ["vendor/rrule-2.8.1.min.js", "calendar-draft.js", "calendar-events.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), c);
const draft = { title: "Pevske vaje", description: "Opis", date: "2026-10-25", repeat: "weekly", weekdays: [6], until: "2026-11-08" };
const dates = (value) => JSON.parse(JSON.stringify(c.ZborcekCalendarDraft.datesFromDraft(value, new Date("2026-01-01T00:00:00Z"))));
assert.deepEqual(dates(draft), ["2026-10-25", "2026-11-01", "2026-11-08"], "Sunday repeats include the end date across autumn DST");
assert.deepEqual(dates({ ...draft, date: "2026-03-22", until: "2026-04-05" }), ["2026-03-22", "2026-03-29", "2026-04-05"]);
assert.deepEqual(dates({ ...draft, date: "2026-10-26", until: "2026-11-08" }), ["2026-11-01", "2026-11-08"], "A different start weekday begins at the next selected day");
assert.deepEqual(dates({ ...draft, date: "2026-12-28", until: "2027-01-10", weekdays: [0, 6] }), ["2026-12-28", "2027-01-03", "2027-01-04", "2027-01-10"]);
assert.deepEqual(dates({ ...draft, date: "2028-02-29", until: "2028-03-14", weekdays: [1, 1] }), ["2028-02-29", "2028-03-07", "2028-03-14"]);
assert.deepEqual(dates({ ...draft, repeat: "none", until: "", weekdays: [] }), ["2026-10-25"]);
for (const change of [{ title: " " }, { title: "a".repeat(161) }, { description: "a".repeat(3001) }, { date: "2026-02-30" },
  { date: "2025-12-31" }, { until: "2026-10-24" }, { until: "" }, { weekdays: [] }, { weekdays: [7] }, { weekdays: ["6"] },
  { repeat: "invalid" }, { colorId: "unsafe" }, { until: "2032-10-25" }, { weekdays: [0, 1, 2, 3, 4, 5, 6], until: "2028-01-01" }]) {
  assert.throws(() => dates({ ...draft, ...change }), undefined, JSON.stringify(change));
}
assert.throws(() => dates({ ...draft, date: "2026-10-26", until: "2026-10-26" }), /obdobju/);
assert.throws(() => c.ZborcekCalendarDraft.datesFromDraft({ ...draft, repeat: "none", date: "2026-10-25" }, new Date("2026-10-25T23:30:00Z")), /datum/);
const state = { songs: [{ id: "song", title: "Pesem" }], people: [{ name: "PRIVATE_PERSON" }],
  massHistory: [{ date: "2026-12-06", note: "Maša", selections: { Vstopna: "song" } }],
  calendarEvents: [{ id: "custom1", date: "2026-12-06", title: "Vaje", description: "Ob 10.00", colorId: "9", private: "PRIVATE_FIELD" },
    { id: "custom2", date: "2026-12-06", title: "Nastop", description: "Ob 16.00" },
    { id: "custom1", date: "2026-12-07", title: "Duplicate identity" },
    { id: "past", date: "2025-12-01", title: "Past" }, { id: "bad", date: "2026-02-30", title: "Bad" }] };
const now = new Date("2026-10-25T12:00:00Z");
const all = c.ZborcekCalendar.eventsFromState(state, now);
assert.equal(all.length, 3, "Public calendar retains multiple events including a Mass on the same day");
assert.equal(all.find((event) => event.key === 'event:custom1').colorId, '9');
assert.equal(all.filter((event) => event.key.startsWith("mass:")).length, 1, "Custom events can stay out of the Mass planner");
const google = c.ZborcekCalendar.googleEventsFromState(state, now);
assert.equal(google.length, 1, "Existing Google sync receives one stable per-day identity without duplicate collisions");
assert.equal(google[0].key, "mass:2026-12-06");
assert.match(google[0].title, /Vaje/); assert.match(google[0].title, /Nastop/); assert.match(google[0].title, /Maša/);
assert.match(google[0].description, /Ob 10\.00/); assert.match(google[0].description, /Pesem/);
assert.equal(google[0].endDate, "2026-12-07");
assert.ok(!JSON.stringify(google).includes("PRIVATE_"));
const publicData = c.ZborcekCalendar.publicEntries(state);
assert.ok(publicData.every((entry) => Object.keys(entry).sort().join(',') === 'colorId,date,description,id,title'));
assert.equal(publicData.find((entry) => entry.id === 'custom2').colorId, '6');
const luminance = (hex) => {
  const linear = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};
for (const color of Object.values(c.ZborcekCalendar.colors)) {
  const a = luminance(color.background), b = luminance(color.foreground);
  assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${color.name} text must be readable`);
}
console.log("Calendar repeat: proven rrule engine, inclusive weekly/multi-day dates, DST/leap/year handling, validation/bounds, multiple same-day events, unchanged Mass scope and stable private-safe Google export OK.");
