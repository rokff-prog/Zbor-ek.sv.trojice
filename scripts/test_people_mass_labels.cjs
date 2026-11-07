const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), selections = new Map();
let writes = 0, confirmDelete = false;
const node = (id) => {
  if (nodes.has(id)) return nodes.get(id);
  const classes = new Set();
  const item = {
    value: "", textContent: "", innerHTML: "", open: false, events: {}, attributes: {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      contains: (name) => classes.has(name),
    },
    addEventListener(name, action) { (this.events[name] ||= []).push(action); },
    removeEventListener(name, action) { this.events[name] = (this.events[name] || []).filter((entry) => entry !== action); },
    dispatch(name, event = {}) {
      for (const action of [...(this.events[name] || [])]) action({ target: this, currentTarget: this, preventDefault() {}, ...event });
    },
    focus() { this.focused = true; },
    blur() { this.focused = false; this.dispatch("blur"); },
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatch("close"); },
    setCustomValidity(message) { this.validationMessage = message; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; if (name === "contenteditable") this.contentEditable = "inherit"; },
    get isContentEditable() { return this.contentEditable === "plaintext-only"; },
    reset() {
      for (const field of ["Name", "BirthDate", "Parents", "Phone", "Email", "Address", "Notes"]) node(`#person${field}`).value = "";
    },
    reportValidity() { return Boolean(node("#personName").value && !node("#personName").validationMessage); },
  };
  nodes.set(id, item);
  return item;
};
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout: () => 1, clearTimeout() {},
  location: { hostname: "localhost" }, window: { confirm: () => confirmDelete }, wireCanvaConnection() {}, recordWrite: () => writes++,
  document: { body: node("body"), querySelector: node, querySelectorAll: (query) => {
    const match = query.match(/^\[data-mass-part="(.+)"\]$/);
    return match ? (selections.get(match[1]) || []).map((value, index) => ({ value, dataset: { massIndex: String(index) } })) : [];
  } },
  localStorage: { getItem: () => null, setItem() {} },
});
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
for (const file of ["song-catalog.js", "song-numbering.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
run(`
  persist = () => recordWrite(); wireMobileTabSwipe = () => {}; isAdminView = true;
  state.people = [];
  state.songs = [{ id: 'song', title: 'Test song', categories: ['Vstopna'], lyrics: 'Lyrics' }];
  state.canvaPages = [];
  state.massHistory = [];
  state.mass = { date: '2099-10-03', note: '', selections: { Vstopna: 'song' }, additionalSelections: {} };
  wireEvents();
`);

// A participant is a draft until a valid Save, regardless of dismissal path.
node("#addPerson").dispatch("click");
assert.equal(node("#personDialog").open, true);
assert.equal(node("#personName").focused, true);
assert.equal(run("state.people.length"), 0);
assert.equal(writes, 0);
node("#personForm").dispatch("submit");
node("#personName").value = "   ";
node("#personForm").dispatch("submit");
assert.equal(run("state.people.length"), 0, "Empty and whitespace-only names cannot be saved");
for (const dismiss of [
  () => node("#cancelPerson").dispatch("click"),
  () => node("#closePersonDialog").dispatch("click"),
  () => node("#personDialog").dispatch("click"),
  () => { // Model the native dialog Escape default action.
    node("#personDialog").dispatch("cancel"); node("#personDialog").close();
  },
]) {
  node("#addPerson").dispatch("click");
  node("#personName").value = "Discard me";
  dismiss();
  assert.equal(node("#personDialog").open, false);
  assert.equal(run("state.people.length"), 0);
  assert.equal(writes, 0);
}
node("#addPerson").dispatch("click");
node("#personDialog").dispatch("click", { target: node("#personForm") });
assert.equal(node("#personDialog").open, true, "Clicks within the form are not backdrop clicks");
const fields = { Name: '  Ana <test>  ', BirthDate: '2015-03-14', Parents: 'Parent', Phone: '+386 40 123 456',
  Email: 'ana@example.test', Address: 'Test street 1', Notes: 'Some notes' };
for (const [field, value] of Object.entries(fields)) node(`#person${field}`).value = value;
node("#personForm").dispatch("submit");
assert.equal(run("state.people.length"), 1);
assert.equal(writes, 1);
assert.equal(node("#personDialog").open, false);
for (const [field, value] of Object.entries(fields)) {
  const key = field[0].toLowerCase() + field.slice(1);
  assert.equal(run(`state.people[0].${key}`), value.trim());
}
assert.match(node("#peopleRows").innerHTML, /Ana &lt;test&gt;/);
node("#personForm").dispatch("submit");
assert.equal(run("state.people.length"), 1, "A closed form cannot create duplicate rows");
const personId = run("state.people[0].id");
assert.match(node('#peopleRows').innerHTML, /class="person-card"[^>]*aria-haspopup="dialog"/);
assert.doesNotMatch(node('#peopleRows').innerHTML, /<input|data-delete-person|Izbriši/);
const openCard = () => node('#peopleRows').dispatch('click', { target: { closest: () => ({ dataset: { personId } }) } });
openCard(); assert.equal(node('#personDialog').open, true); assert.equal(node('#deletePerson').hidden, false);
assert.equal(node('#personName').value, 'Ana <test>'); assert.equal(node('#personPhone').value, fields.Phone);
const beforeDraft = writes;
node('#personPhone').value = 'Discard'; node('#cancelPerson').dispatch('click');
assert.equal(run('state.people[0].phone'), fields.Phone); assert.equal(writes, beforeDraft);
openCard(); node('#personPhone').value = 'Updated phone'; node('#personBirthDate').value = '2016-05-12';
run("state.people[0].address = 'Remote address'");
node('#personForm').dispatch('submit');
assert.equal(run('state.people.length'), 1); assert.equal(run('state.people[0].id'), personId);
assert.equal(run('state.people[0].phone'), 'Updated phone');
assert.equal(run('state.people[0].birthDate'), '2016-05-12');
assert.equal(run('state.people[0].address'), 'Remote address', 'Untouched fields do not overwrite remote edits');
assert.ok(node('#peopleRows').innerHTML.includes(run('ageLabel(state.people[0])')));
openCard(); node('#personPhone').value = 'Local conflict'; run("state.people[0].phone = 'Remote conflict'");
const beforeConflict = writes; node('#personForm').dispatch('submit');
assert.equal(writes, beforeConflict); assert.equal(run('state.people[0].phone'), 'Remote conflict');
assert.match(node('#personFormStatus').textContent, /spremenjen drugje/); node('#personDialog').close();
run("state.people.push({ id: 'delete-test', name: 'Delete me' }); openPersonDialog('delete-test')");
const beforeDelete = writes;
node('#deletePerson').dispatch('click'); assert.equal(run('state.people.length'), 2); assert.equal(writes, beforeDelete);
confirmDelete = true; node('#deletePerson').dispatch('click'); assert.equal(run('state.people.length'), 1);
assert.equal(node('#personDialog').open, false); assert.equal(node('#deletePerson').hidden, true);
node('#deletePerson').dispatch('click'); assert.equal(run('state.people.length'), 1, 'Closed dialogs cannot delete');
run("state.people.push({ id: 'gone', name: 'Gone' }); openPersonDialog('gone'); state.people = state.people.filter(item => item.id !== 'gone')");
node('#personForm').dispatch('submit'); assert.equal(run('state.people.length'), 1);
assert.match(node('#personFormStatus').textContent, /izbrisan/); node('#personDialog').close();
node("#addPerson").dispatch("click");
assert.equal(node("#personName").value, "", "Reopening starts with an empty draft");
assert.equal(node('#deletePerson').hidden, true, 'New participants have no delete action');
run("isAdminView = false");
const beforePublic = writes;
node("#personName").value = 'Unauthorized';
node("#personForm").dispatch("submit");
openCard(); node('#deletePerson').dispatch('click');
node("#personDialog").close();
node("#addPerson").dispatch("click");
assert.equal(node("#personDialog").open, false);
assert.equal(run("state.people.length"), 1);
assert.equal(run("state.people[0].birthDate"), '2016-05-12');
assert.equal(writes, beforePublic, "Opening, saving, editing and deleting require admin authorization");
run('renderPeople()'); assert.equal(node('#peopleRows').innerHTML, '', 'Public rendering cannot expose cached participant cards');
run("isAdminView = true");

// Edit the existing heading in place, without renaming canonical keys.
const heading = node("heading");
heading.closest = (selector) => selector === 'h3' ? heading : { dataset: { massLabelPart: 'Vstopna' } };
const beginEdit = () => {
  heading.textContent = run("massPartLabel(state.mass, 'Vstopna')");
  node("#massSlots").dispatch("dblclick", { target: heading });
};
beginEdit();
assert.equal(heading.isContentEditable, true);
assert.equal(heading.focused, true);
heading.textContent = 'Custom <heading> & name';
heading.dispatch("keydown", { key: 'Enter' });
assert.equal(heading.isContentEditable, false);
assert.equal(run("state.mass.partLabels.Vstopna"), 'Custom <heading> & name');
assert.equal(run("state.massHistory[0].partLabels.Vstopna"), 'Custom <heading> & name');
assert.equal(run("massProgramRows()[0].part"), 'Vstopna');
assert.equal(run("state.mass.selections.Vstopna"), 'song');
assert.equal(run("state.songs[0].categories.join(',')"), 'Vstopna');
run("renderMass(); renderMassProgramPrint(); renderPrint()");
assert.match(node("#massSlots").innerHTML, /<h3>Custom &lt;heading&gt; &amp; name<\/h3>/);
assert.match(node("#massSlots").innerHTML, /data-mass-part="Vstopna"/);
assert.match(node("#massProgramPrint").innerHTML, /<th scope="row">Custom &lt;heading&gt; &amp; name<\/th>/);
assert.match(node("#printPage").innerHTML, /Custom &lt;heading&gt; &amp; name/);
assert.match(node("#upcomingMasses").innerHTML, /Custom &lt;heading&gt; &amp; name/);
assert.match(run("calendarEventsFromMassHistory()[0].description"), /^Custom <heading> & name: Test song$/);
const beforeCancel = writes;
beginEdit(); heading.textContent = 'Discard'; heading.dispatch("keydown", { key: 'Escape' });
assert.equal(heading.textContent, 'Custom <heading> & name');
assert.equal(writes, beforeCancel);
beginEdit(); heading.textContent = ''; heading.blur();
assert.equal(run("state.mass.partLabels.Vstopna"), '');
assert.equal(run("state.massHistory[0].partLabels.Vstopna"), '');
node("#massDate").value = '2099-10-03';
selections.set('Vstopna', ['song']);
run("autosaveMassFromForm(); state = JSON.parse(JSON.stringify(state)); migrateState()");
assert.equal(run("state.mass.partLabels.Vstopna"), '', "Empty labels survive autosave, serialization and migration");
run("renderMass(); renderMassProgramPrint()");
assert.match(node("#massSlots").innerHTML, /<h3><\/h3>/);
assert.match(node("#massProgramPrint").innerHTML, /<th scope="row"><\/th>/);
assert.equal(run("calendarEventsFromMassHistory().find((entry) => entry.date === '2099-10-03').description"), 'Test song');
run("loadMassFromHistory('2099-10-04')");
assert.equal(run("massPartLabel(state.mass, 'Vstopna')"), 'Vstopna');
beginEdit(); heading.textContent = 'Only second date'; heading.blur();
assert.equal(run("state.massHistory.find((entry) => entry.date === '2099-10-04').partLabels.Vstopna"), 'Only second date');
run("loadMassFromHistory('2099-10-03')");
assert.equal(run("state.mass.partLabels.Vstopna"), '');
node("#massDate").value = '2099-10-05'; node("#massDate").dispatch("change");
assert.equal(run("Object.keys(state.mass.partLabels).length"), 0, "The date input resets labels for a new date too");
beginEdit(); heading.textContent = 'Stale edit';
run("loadMassFromHistory('2099-10-04')"); heading.blur();
assert.equal(run("state.mass.partLabels.Vstopna"), 'Only second date', "An edit started on another date cannot leak");
run("state.mass.partLabels = {}; migrateState()");
assert.equal(run("state.mass.partLabels.Vstopna"), 'Only second date', "Migration restores labels from dated history");
run("state.mass = { date: '2099-10-06', selections: {}, partLabels: { Vstopna: '' } }; migrateState()");
assert.equal(run("state.massHistory.find((entry) => entry.date === '2099-10-06').partLabels.Vstopna"), '',
  "Migration preserves a label-only local draft, even without songs");
run("isAdminView = false");
const beforeDeniedLabel = writes;
beginEdit();
assert.equal(heading.isContentEditable, false);
run("saveMassPartLabel('Vstopna', 'Unauthorized', state.mass.date)");
assert.equal(run("state.mass.partLabels.Vstopna"), '');
assert.equal(writes, beforeDeniedLabel);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<dialog id="personDialog"[^>]+aria-labelledby="personDialogTitle"/);
assert.match(html, /id="personName"[^>]+required/);
assert.match(html, /<button class="primary" type="submit">Shrani<\/button>/);
assert.match(html, /id="peopleRows" class="people-grid"/);
assert.match(html, /id="deletePerson"[^>]*type="button" hidden/);
assert.doesNotMatch(html, /class="people-table"/);
console.log('People cards/modal: required name, fields, Save-only creation/edits, cancel, card open, confirmed dialog-only delete, stable IDs, concurrent edit/deletion protection and public privacy OK. Mass labels: Enter/blur/Escape, date isolation, migration, autosave and print OK. Native browser dialog behavior not exercised.');
