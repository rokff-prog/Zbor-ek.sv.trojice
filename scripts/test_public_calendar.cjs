const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const nodes = new Map();
const weekdayInputs = Array.from({ length: 7 }, (_, index) => ({ value: String(index), checked: false }));
let writes = 0;
const node = (id) => {
  if (nodes.has(id)) return nodes.get(id);
  const classes = new Set();
  const item = { id, value: "", textContent: "", innerHTML: "", open: false, dataset: {}, events: {},
    classList: { add: (...names) => names.forEach((name) => classes.add(name)), remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) },
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
    dispatch(name, event = {}) { for (const fn of this.events[name] || []) fn({ target: this, currentTarget: this, preventDefault() {}, ...event }); },
    getAttribute(name) { return this[name]; },
    reset() { if (id === '#newCalendarForm') {
      for (const key of ['Title', 'Date', 'Description', 'Until']) node('#newCalendar' + key).value = '';
      node('#newCalendarRepeat').value = 'none'; weekdayInputs.forEach((input) => { input.checked = false; });
      node('#newCalendarColors input:checked').value = '6';
    } },
    reportValidity() { return !this.invalid; },
    focus() { this.focused = true; }, showModal() { this.open = true; }, close() { this.open = false; this.dispatch("close"); },
  };
  nodes.set(id, item); return item;
};
const c = vm.createContext({ console, crypto: require("node:crypto"), structuredClone, URL, Blob,
  location: { hostname: "localhost" }, localStorage: { getItem: () => null, setItem() { writes++; } },
  document: { body: node("body"), querySelector: node, querySelectorAll: (query) => query === '#newCalendarWeekdays input'
    ? weekdayInputs : query === '#newCalendarWeekdays input:checked' ? weekdayInputs.filter((input) => input.checked) : [] },
  window: {}, setTimeout: () => 1, clearTimeout() {}, wireCanvaConnection() {},
});
for (const file of ["song-catalog.js", "song-numbering.js", "vendor/rrule-2.8.1.min.js", "calendar-draft.js", "calendar-events.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), c);
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), c);
const run = (code) => vm.runInContext(code, c);
writes = 0;
run(`
  wireMobileTabSwipe = () => {}; wireEvents(); isAdminView = false;
  state.songs = [{ id: 's', title: 'Song <safe>', categories: ['Vstopna'] }];
  state.massHistory = [
    { date: '2099-12-05', note: 'Concert <safe> & family', selections: { Vstopna: 's' }, partLabels: { Vstopna: '' } },
    { date: '2099-12-06', note: '', selections: { Vstopna: 's' } },
    { date: '2099-12-07', selections: {} },
    { date: '2000-12-08', note: 'Past event' },
  ];
  visibleEventMonth = '2099-12'; renderCalendar();
`);
const markup = node("#publicEventCalendar").innerHTML;
assert.equal((markup.match(/class="event-calendar-day/g) || []).length, 31);
assert.equal((markup.match(/ has-event/g) || []).length, 2);
assert.match(markup, /Concert &lt;safe&gt; &amp; family/);
assert.match(markup, /sveta maša/);
assert.doesNotMatch(markup, /Past event|<safe>/);
assert.match(node("#googleCalendarOpen").href, /^https:\/\/calendar\.google\.com\/calendar\/render\?cid=/);
assert.equal(new URL(node("#googleCalendarOpen").href).searchParams.get("cid"), run("GOOGLE_CALENDAR_ID"));
assert.equal(writes, 0, "A public calendar is read-only");
run("moveEventMonth(1)"); assert.equal(run("visibleEventMonth"), '2100-01');
run("moveEventMonth(-1)"); assert.equal(run("visibleEventMonth"), '2099-12');
node("#publicEventCalendar").dispatch("click", { target: { closest: () => ({ dataset: { publicEventDate: '2099-12-05' } }) } });
assert.equal(node("#publicEventDialog").open, true);
assert.equal(node("#publicEventTitle").textContent, 'Zborček - Concert <safe> & family');
assert.equal(node("#publicEventDescription").textContent, 'Song <safe>');
assert.match(node("#publicEventDate").textContent, /2099/);
run("state.massHistory[0].note = 'Changed from another device'; renderCalendar()");
assert.equal(node("#publicEventTitle").textContent, 'Zborček - Changed from another device');
assert.equal(run("visibleEventMonth"), '2099-12', "A remote refresh must not change the viewed month");
node("#closePublicEvent").dispatch("click"); assert.equal(node("#publicEventDialog").open, false);
run("openPublicCalendarEvent('2099-12-07')"); assert.equal(node("#publicEventDialog").open, false);
run("openPublicCalendarEvent('2099-12-06')");
node("#publicEventDialog").dispatch("click", { target: node("#publicEventDescription") });
assert.equal(node("#publicEventDialog").open, true);
node("#publicEventDialog").dispatch("click"); assert.equal(node("#publicEventDialog").open, false);
run("openPublicCalendarEvent('2099-12-06'); state.massHistory[1].selections = {}; renderCalendar()");
assert.equal(node("#publicEventDialog").open, false, "A removed event no longer stays visible in an open dialog");
run("visibleEventMonth = '2028-02'; renderPublicCalendar()");
assert.equal((node("#publicEventCalendar").innerHTML.match(/class="event-calendar-day/g) || []).length, 29);
run("visibleEventMonth = '2026-02'; renderPublicCalendar()");
assert.equal((node("#publicEventCalendar").innerHTML.match(/class="event-calendar-day/g) || []).length, 28);
node("#todayEventMonth").dispatch("click");
const todayMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Ljubljana", year: 'numeric', month: '2-digit' }).format(new Date());
assert.equal(run("visibleEventMonth"), todayMonth);
run('openNewCalendarEvent()'); assert.equal(node('#newCalendarDialog').open, false, 'Only admins can open the add form');
run('isAdminView = true; state.calendarEvents = []');
node('#addCalendarEvent').dispatch('click'); assert.equal(node('#newCalendarDialog').open, true);
node('#newCalendarTitle').value = 'Discard draft'; node('#cancelNewCalendarEvent').dispatch('click');
assert.equal(run('state.calendarEvents.length'), 0);
node('#addCalendarEvent').dispatch('click'); assert.equal(node('#newCalendarTitle').value, '');
node('#newCalendarDialog').dispatch('click'); assert.equal(node('#newCalendarDialog').open, false);
node('#addCalendarEvent').dispatch('click');
node('#newCalendarForm').dispatch('submit'); assert.equal(run('state.calendarEvents.length'), 0);
node('#newCalendarTitle').value = 'Choir <safe>';
node('#newCalendarDescription').value = 'Practice';
node('#newCalendarColors input:checked').value = '9';
node('#newCalendarDate').value = '2099-12-06';
node('#newCalendarDate').dispatch('change');
node('#newCalendarRepeat').value = 'weekly'; node('#newCalendarUntil').value = '2099-12-20';
const weekday = (new Date('2099-12-06T00:00:00Z').getUTCDay() + 6) % 7;
weekdayInputs[weekday].checked = true;
node('#newCalendarForm').dispatch('input'); assert.equal(node('#newCalendarWeekly').hidden, false);
node('#newCalendarForm').dispatch('submit');
assert.equal(run('state.calendarEvents.length'), 3, 'Save creates the chosen dated occurrences');
assert.equal(node('#newCalendarDialog').open, false);
assert.equal(run('new Set(state.calendarEvents.map(item => item.seriesId)).size'), 1);
assert.equal(run('new Set(state.calendarEvents.map(item => item.id)).size'), 3);
assert.equal(run('state.calendarEvents.every(item => item.colorId === "9")'), true, 'The chosen color belongs to every repetition');
node('#newCalendarForm').dispatch('submit'); assert.equal(run('state.calendarEvents.length'), 3, 'Double-submit cannot create duplicates');
run("renderCalendar(); openPublicCalendarEvent('2099-12-06')");
assert.equal(node('#publicEventTitle').textContent, 'Zborček - Choir <safe>');
run("state.massHistory[1].selections = { Vstopna: 's' }; renderCalendar()");
assert.equal(node('#publicEventTitle').textContent, 'Dogodki');
assert.match(node('#publicEventDescription').textContent, /Choir <safe>/);
assert.match(node('#publicEventDescription').textContent, /sveta maša/);
assert.match(node('#publicEventCalendar').innerHTML, /Choir &lt;safe&gt;/);
assert.match(node('#publicEventCalendar').innerHTML, /--event-background:#5484ed/);
assert.match(node('#publicEventCalendar').innerHTML, /event-calendar-label/);
assert.match(node('#publicEventCalendar').innerHTML, /class="event-calendar-more" aria-hidden="true">\+1<\/span>/);
run(`state.calendarEvents.push(...Array.from({ length: 3 }, (_, i) => ({
  id: 'crowded-' + i, date: '2099-12-06', title: 'Dolgo ime dogodka ' + i + ' <safe>', description: 'Celoten zapis ' + i, colorId: '2'
}))); renderCalendar(); openPublicCalendarEvent('2099-12-06')`);
assert.match(node('#publicEventCalendar').innerHTML, /class="event-calendar-more" aria-hidden="true">\+4<\/span>/);
assert.match(node('#publicEventCalendar').innerHTML, /aria-label="[^"]*Dolgo ime dogodka 2 &lt;safe&gt;/);
assert.match(node('#publicEventDescription').textContent, /Celoten zapis 2/);
assert.match(node('#calendarEvents').innerHTML, /Dolgo ime dogodka 2 &lt;safe&gt;/, 'Full event names remain available below the compact grid');
run("state.calendarEvents = state.calendarEvents.filter(event => !event.id.startsWith('crowded-'))");
assert.equal(run('upcomingMassEvents().some(event => event.title.includes("Choir"))'), false);
run('isAdminView = false');
node('#newCalendarDialog').open = true; node('#newCalendarForm').dispatch('submit');
assert.equal(run('state.calendarEvents.length'), 3, 'Public submit cannot mutate custom events');
node('#newCalendarDialog').close();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
assert.doesNotMatch(html, /id="(?:googleCalendarFrame|calendarEventForm|googleCalendarIcs|downloadLocalIcs|calendarSetup)"/);
assert.doesNotMatch(source, /#(?:googleCalendarFrame|calendarEventForm|googleCalendarIcs|downloadLocalIcs|calendarSetup)/);
assert.match(html, /<header class="event-calendar-toolbar">[\s\S]*?id="googleCalendarOpen"[^>]*>Namesti v Google koledar<\/a>[\s\S]*?<\/header>/);
assert.match(html, /id="publicEventDialog"[^>]+aria-labelledby="publicEventTitle"/);
assert.equal((html.match(/id="googleCalendarOpen"/g) || []).length, 1);
assert.match(html, /id="addCalendarEvent"[^>]+class="primary admin-only"/);
assert.ok(html.indexOf('vendor/rrule-2.8.1.min.js') < html.indexOf('calendar-draft.js?'));
assert.match(css, /\.event-month-grid\s*\{[^}]+repeat\(7, minmax\(0, 1fr\)\)/s);
assert.match(css, /\.event-calendar-day\.has-event\s*\{[^}]+background: var\(--event-background, var\(--gold\)\)/s);
assert.match(css, /\.event-calendar-day\s*\{[^}]+overflow-wrap: anywhere/s);
const mobileCss = css.slice(css.indexOf('@media (max-width: 700px)'), css.indexOf('@media (max-width: 430px)'));
assert.ok(css.indexOf('@media (max-width: 700px)') > css.indexOf('@media (max-width: 860px)'), 'Calendar overrides follow generic mobile toolbar rules');
assert.match(mobileCss, /\.event-calendar-day, \.event-calendar-empty\s*\{[^}]*height: 88px;[^}]*min-height: 0;[^}]*max-height: 88px/);
assert.match(mobileCss, /\.event-calendar-day > strong\s*\{[^}]*-webkit-line-clamp: 2;[^}]*overflow: hidden/);
assert.match(mobileCss, /\.event-calendar-day > strong ~ strong\s*\{ display: none/);
assert.match(mobileCss, /\.event-calendar-more\s*\{ display: block/);
assert.match(mobileCss, /\.event-calendar-month-controls\s*\{[^}]*grid-template-columns: 44px minmax\(0, 1fr\) 44px/);
assert.match(mobileCss, /\.event-calendar-actions > button\s*\{[^}]*width: auto/);
assert.match(html, /class="toolbar event-calendar-actions"/);
assert.match(css, /\.event-calendar-more\s*\{ display: none/);
console.log("Public calendar: month grid/events/dialog/live updates, public read-only behavior, bounded mobile cells with full accessible/detail/list content, responsive header controls and Google link OK. Browser layout not exercised.");
