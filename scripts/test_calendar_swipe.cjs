const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
let time = 1000, month = 0, tab = 1;
const timers = [];
function element() {
  const events = {}, classes = new Set();
  return { events, clientWidth: 320, style: { removeProperty() {} },
    classList: { add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) },
    addEventListener(type, fn, options) { (events[type] ||= []).push({ fn, capture: options === true || Boolean(options?.capture) }); },
  };
}
const surface = element(), grid = element(), view = element();
const tabs = Array.from({ length: 3 }, (_, i) => {
  const item = element(); item.click = () => { tabs[tab].classList.remove('active'); tab = i; item.classList.add('active'); }; return item;
});
tabs[tab].classList.add('active');
const target = { closest: selector => selector.includes('[data-no-tab-swipe]') ? grid : null };
const outside = { closest: () => null };
const c = vm.createContext({ console, Date: class extends Date { static now() { return time; } },
  performance: { now: () => time }, window: { innerWidth: 390, scrollTo() {} },
  document: { querySelector: query => query === '.app' ? surface : query === '#publicEventCalendar' ? grid : view },
  $: query => query === '#publicEventCalendar' ? grid : null, $$: () => tabs,
  getComputedStyle: () => ({ display: 'block' }), setTimeout: fn => timers.push(fn), requestAnimationFrame: fn => fn(),
  moveEventMonth: step => { month += step; },
});
vm.runInContext(source.slice(source.indexOf('function wireCalendarMonthSwipe()'), source.indexOf('function wireEvents()')), c);
vm.runInContext('wireCalendarMonthSwipe(); wireMobileTabSwipe()', c);
function dispatch(type, { onGrid = true, x = 160, y = 100, count = 1, id = 1, duration = 50 } = {}) {
  time += duration;
  const point = { clientX: x, clientY: y, identifier: id };
  const event = { target: onGrid ? target : outside, cancelable: true,
    touches: ['touchend', 'touchcancel', 'click'].includes(type) ? [] : Array.from({ length: count }, () => point),
    changedTouches: [point], prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; },
  };
  for (const { fn, capture } of surface.events[type] || []) if (capture) fn(event);
  if (onGrid) for (const { fn, capture } of grid.events[type] || []) if (capture) fn(event);
  if (onGrid && !event.stopped) for (const { fn, capture } of grid.events[type] || []) if (!capture) fn(event);
  while (timers.length) timers.shift()();
  return event;
}
function swipe(options = {}) {
  dispatch('touchstart', options);
  dispatch('touchmove', { ...options, x: 70 });
  return dispatch('touchend', { ...options, x: 70 });
}
assert.equal(swipe().prevented, true); assert.equal(month, 1); assert.equal(tab, 1);
assert.equal(dispatch('click').stopped, true, 'A completed swipe cannot open a date accidentally');
time += 500; assert.equal(dispatch('click').stopped, false, 'Ordinary taps still open details');
dispatch('touchstart', { x: 70 }); dispatch('touchmove', { x: 180 }); dispatch('touchend', { x: 180 });
assert.equal(month, 0, 'Right swipe goes to the previous month');
dispatch('touchstart'); assert.equal(dispatch('touchmove', { x: 165, y: 170 }).prevented, false);
dispatch('touchend', { x: 165, y: 220 }); assert.equal(month, 0, 'Vertical scrolling is not a month swipe');
dispatch('touchstart'); dispatch('touchmove', { x: 154 }); dispatch('touchend', { x: 154 }); assert.equal(month, 0);
dispatch('touchstart'); dispatch('touchmove', { x: 70 }); dispatch('touchcancel'); dispatch('touchend', { x: 70 }); assert.equal(month, 0);
dispatch('touchstart'); dispatch('touchmove', { x: 70, count: 2 }); dispatch('touchend', { x: 70 }); assert.equal(month, 0);
dispatch('touchstart'); dispatch('touchmove', { x: 70, id: 2 }); dispatch('touchend', { x: 70, id: 2 }); assert.equal(month, 0);
vm.runInContext('window.innerWidth = 1200', c); swipe(); assert.equal(month, 0, 'Desktop touch does not change months');
vm.runInContext('window.innerWidth = 390', c);
time += 500; swipe({ onGrid: false }); assert.equal(month, 0); assert.equal(tab, 2, 'Outside dates, the original tab swipe still works');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /id="publicEventCalendar"[^>]*data-no-tab-swipe/);
assert.doesNotMatch(html, /(?:header|section)[^>]*data-no-tab-swipe/);
console.log('Calendar swipe: date-grid priority over tabs, both directions, vertical scroll/taps, cancellation/multi-touch, click suppression, desktop guard and ordinary outside tab swipe OK. Native touch not exercised.');
