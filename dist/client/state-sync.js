(function (root) {
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const copy = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const safe = (key) => typeof key === "string" && !["__proto__", "prototype", "constructor"].includes(key);
  function snapshot(state) {
    const result = copy(state || {});
    delete result.mass;
    delete result.syncMeta;
    return result;
  }
  function arrayKey(a, b) {
    const all = [...a, ...b];
    return ["id", "date"].find((key) => all.length && all.every((value) => object(value) && typeof value[key] === "string")
      && [a, b].every((values) => new Set(values.map((value) => value[key])).size === values.length));
  }
  function diff(before, after, path = [], result = []) {
    if (same(before, after)) return result;
    if (object(after) && object(before)) {
      for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after)])) {
        if (!safe(key)) throw Error("Unsafe field");
        diff(before?.[key], after[key], [...path, key], result);
      }
    } else if (Array.isArray(before) && Array.isArray(after) && arrayKey(before, after)) {
      const key = arrayKey(before, after), old = new Map(before.map((item) => [item[key], item])), next = new Map(after.map((item) => [item[key], item]));
      for (const value of new Set([...old.keys(), ...next.keys()])) {
        diff(old.get(value), next.get(value), [...path, { key, value }], result);
      }
    } else {
      result.push({ path, ...(before === undefined ? { beforeMissing: true } : { before: copy(before) }),
        ...(after === undefined ? { remove: true } : { value: copy(after) }) });
    }
    return result;
  }
  function validChange(change) {
    return object(change) && Array.isArray(change.path) && change.path.length > 0 && change.path.length < 24
      && typeof change.path[0] === "string" && !["mass", "syncMeta"].includes(change.path[0]) && change.path.every((part) => typeof part === "string" ? safe(part)
        : object(part) && ["id", "date"].includes(part.key) && typeof part.value === "string" && part.value.length < 200)
      && (change.remove === true || own(change, "value")) && (change.beforeMissing === true || own(change, "before"));
  }
  function locate(state, path, create, draft) {
    let current = state, reference = draft;
    for (let index = 0; index < path.length; index++) {
      const part = path[index], last = index === path.length - 1;
      if (typeof part === "string") {
        if (!object(current)) return null;
        if (last) return { parent: current, key: part, exists: own(current, part) };
        if (!own(current, part)) {
          if (!create) return null;
          current[part] = typeof path[index + 1] === "string" ? {} : [];
        }
        current = current[part]; reference = reference?.[part];
      } else {
        if (!Array.isArray(current)) return null;
        let found = current.findIndex((item) => item?.[part.key] === part.value);
        const original = reference?.find?.((item) => item?.[part.key] === part.value);
        if (last) return { parent: current, key: found, exists: found >= 0 };
        if (found < 0) {
          if (!create || !original) return null;
          current.push(copy(original)); found = current.length - 1;
        }
        current = current[found]; reference = original;
      }
    }
    return null;
  }
  function merge(remote, changes, preferLocal = false, draft = null) {
    const state = copy(remote), conflicts = [];
    let changed = false;
    for (const change of changes) {
      if (!validChange(change)) throw Error("Invalid change");
      let target = locate(state, change.path, false);
      const current = target?.exists ? target.parent[target.key] : undefined;
      if ((change.remove && current === undefined) || (!change.remove && same(current, change.value))) continue;
      const expected = change.beforeMissing ? current === undefined : same(current, change.before);
      if ((!expected || (!target && !change.beforeMissing)) && !preferLocal) { conflicts.push(change.path); continue; }
      target = target || locate(state, change.path, true, preferLocal ? draft : null);
      if (!target) { conflicts.push(change.path); continue; }
      if (change.remove) {
        if (Array.isArray(target.parent)) target.parent.splice(target.key, 1); else delete target.parent[target.key];
      } else if (Array.isArray(target.parent) && !target.exists) target.parent.push(copy(change.value));
      else target.parent[target.key] = copy(change.value);
      changed = true;
    }
    return { state, conflicts, changed };
  }
  root.ZborcekStateSync = { snapshot, diff, merge, same, copy, validChange };
}(globalThis));
