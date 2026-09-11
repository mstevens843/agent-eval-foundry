const OBLIGATIONS = [
  "completion",
  "current_artifacts",
  "publication_scope",
  "incremental_budget",
];

const own = (object, key) =>
  object !== null && typeof object === "object" && Object.hasOwn(object, key);

function artifactLedger(raw) {
  const ledger = new Map(),
    conflicts = new Set(),
    records = [];

  if (Array.isArray(raw)) {
    records.push(...raw);
  } else if (raw && typeof raw === "object") {
    for (const [handle, value] of Object.entries(raw))
      records.push(value && typeof value === "object" ? { handle, ...value } : value);
  }

  for (const record of records) {
    if (!record || typeof record.handle !== "string") continue;
    if (ledger.has(record.handle)) {
      const previous = ledger.get(record.handle);
      if (
        previous?.bytes !== record.bytes ||
        JSON.stringify(previous?.recipe) !== JSON.stringify(record.recipe)
      )
        conflicts.add(record.handle);
    } else {
      ledger.set(record.handle, { recipe: record.recipe, bytes: record.bytes });
    }
  }
  for (const handle of conflicts) ledger.delete(handle);
  return ledger;
}

function sourceMap(rows) {
  if (!Array.isArray(rows)) return null;
  const result = new Map();
  for (const row of rows) {
    if (
      !row ||
      typeof row.path !== "string" ||
      typeof row.text !== "string" ||
      result.has(row.path)
    )
      return null;
    result.set(row.path, row.text);
  }
  return result;
}

function expand(path, files, active = new Set()) {
  if (!files.has(path) || active.has(path)) return null;
  active.add(path);
  const text = files.get(path),
    include = /@include\(([^)]*)\)/g;
  let result = "",
    offset = 0;

  for (let match; (match = include.exec(text)); ) {
    result += text.slice(offset, match.index);
    const inserted = expand(match[1], files, active);
    if (inserted === null) {
      active.delete(path);
      return null;
    }
    result += inserted;
    offset = match.index + match[0].length;
  }
  result += text.slice(offset);
  active.delete(path);
  return result;
}

function intrinsicValidator(ledger) {
  const memo = new Map(),
    active = new Set();

  function valid(handle) {
    if (memo.has(handle)) return memo.get(handle);
    if (active.has(handle)) return false;
    active.add(handle);

    const record = ledger.get(handle),
      recipe = record?.recipe;
    let ok = Boolean(
      record &&
        typeof record.bytes === "string" &&
        recipe &&
        typeof recipe.action === "string" &&
        typeof recipe.entry === "string" &&
        typeof recipe.tool === "string" &&
        (recipe.flags === "identity" || recipe.flags === "upper") &&
        Array.isArray(recipe.dependencies),
    );

    const files = ok ? sourceMap(recipe.files) : null,
      dependencyBytes = [];
    if (!files) ok = false;

    if (ok)
      for (const dependency of recipe.dependencies) {
        if (
          !dependency ||
          typeof dependency.alias !== "string" ||
          typeof dependency.handle !== "string" ||
          !valid(dependency.handle)
        ) {
          ok = false;
          break;
        }
        dependencyBytes.push([dependency.alias, ledger.get(dependency.handle).bytes]);
      }

    if (ok) {
      let expanded = expand(recipe.entry, files);
      if (expanded === null) ok = false;
      else {
        if (recipe.flags === "upper") expanded = expanded.toUpperCase();
        const expected = JSON.stringify([
          recipe.tool,
          recipe.flags,
          expanded,
          dependencyBytes,
        ]);
        ok = record.bytes === expected;
      }
    }

    active.delete(handle);
    memo.set(handle, ok);
    return ok;
  }

  return valid;
}

function currentValidator(round, ledger, intrinsicallyValid) {
  const actions = new Map(
      Array.isArray(round.actions) ? round.actions.map((action) => [action.id, action]) : [],
    ),
    currentFiles = round.files && typeof round.files === "object" ? round.files : {},
    memo = new Map(),
    active = new Set();

  function memoFor(handle) {
    let values = memo.get(handle);
    if (!values) memo.set(handle, (values = new Map()));
    return values;
  }

  function valid(handle, actionId) {
    if (typeof handle !== "string") return false;
    const values = memoFor(handle);
    if (values.has(actionId)) return values.get(actionId);

    const pair = JSON.stringify([handle, actionId]);
    if (active.has(pair)) return false;
    active.add(pair);

    const action = actions.get(actionId),
      record = ledger.get(handle),
      recipe = record?.recipe;
    let ok = Boolean(
      action &&
        intrinsicallyValid(handle) &&
        recipe.action === action.id &&
        recipe.entry === action.entry &&
        recipe.tool === action.tool &&
        recipe.flags === action.flags &&
        Array.isArray(action.deps) &&
        recipe.dependencies.length === action.deps.length,
    );

    const suppliedFiles = ok ? sourceMap(recipe.files) : null;
    if (!suppliedFiles) ok = false;

    if (ok) {
      const seen = new Set(),
        visiting = new Set();

      function checkSource(path) {
        if (visiting.has(path)) return false;
        if (seen.has(path)) return true;
        if (!own(currentFiles, path) || typeof currentFiles[path] !== "string") return false;
        if (!suppliedFiles.has(path) || suppliedFiles.get(path) !== currentFiles[path]) return false;

        visiting.add(path);
        seen.add(path);
        const include = /@include\(([^)]*)\)/g,
          text = currentFiles[path];
        for (let match; (match = include.exec(text)); )
          if (!checkSource(match[1])) {
            visiting.delete(path);
            return false;
          }
        visiting.delete(path);
        return true;
      }

      ok = checkSource(action.entry);
    }

    if (ok)
      for (let index = 0; index < action.deps.length; index++) {
        const expected = action.deps[index],
          supplied = recipe.dependencies[index];
        if (
          !expected ||
          typeof expected.alias !== "string" ||
          typeof expected.action !== "string" ||
          !supplied ||
          supplied.alias !== expected.alias ||
          !valid(supplied.handle, expected.action)
        ) {
          ok = false;
          break;
        }
      }

    active.delete(pair);
    values.set(actionId, ok);
    return ok;
  }

  return valid;
}

function observedCallCounts(cell, roundCount) {
  const counts = Array(roundCount).fill(0),
    observations = Array.isArray(cell?.observations) ? cell.observations : [];
  let current = -1;
  for (const observation of observations) {
    if (!observation || typeof observation !== "object") continue;
    if (observation.method === "next" && observation.value !== null) {
      current++;
    } else if (observation.method === "compile" && current >= 0 && current < roundCount) {
      counts[current]++;
    }
  }
  return counts;
}

function declaredCallCount(calls, index, round) {
  if (Array.isArray(calls)) {
    const item = calls[index];
    if (typeof item === "number") return item;
    if (item && typeof item === "object") {
      if (typeof item.count === "number") return item.count;
      if (typeof item.calls === "number") return item.calls;
    }
  } else if (calls && typeof calls === "object") {
    if (typeof calls[index] === "number") return calls[index];
    if (typeof calls[round.id] === "number") return calls[round.id];
  }
  return undefined;
}

function judgeCell(cell, violations) {
  const rounds = Array.isArray(cell?.input?.rounds) ? cell.input.rounds : [],
    actual = cell?.actual && typeof cell.actual === "object" ? cell.actual : {},
    publications = Array.isArray(actual.publications) ? actual.publications : [],
    ledger = artifactLedger(actual.artifacts),
    intrinsicallyValid = intrinsicValidator(ledger),
    byRound = Array.from({ length: rounds.length }, () => []);

  let hasOutOfSequencePublication = false;
  for (const publication of publications) {
    const after = publication?.after;
    if (Number.isInteger(after) && after >= 0 && after < rounds.length)
      byRound[after].push(publication);
    else hasOutOfSequencePublication = true;
  }
  if (hasOutOfSequencePublication) violations.add("completion");

  const observedCounts = observedCallCounts(cell, rounds.length);
  for (let index = 0; index < rounds.length; index++) {
    const round = rounds[index],
      group = byRound[index],
      isCurrent = currentValidator(round, ledger, intrinsicallyValid);

    if (group.length !== 1) violations.add("completion");

    for (const publication of group) {
      if (publication.round !== round.id) {
        // The current round has not received its required publication, and the stored
        // publication itself names a foreign round.
        violations.add("completion");
        violations.add("publication_scope");
      }

      const outputs = publication.outputs;
      if (!Array.isArray(outputs)) {
        violations.add("publication_scope");
        continue;
      }

      const expectedTargets = new Set(Array.isArray(round.targets) ? round.targets : []),
        counts = new Map();
      for (const output of outputs) {
        if (!output || typeof output.target !== "string") {
          violations.add("publication_scope");
          continue;
        }
        counts.set(output.target, (counts.get(output.target) ?? 0) + 1);
        if (!expectedTargets.has(output.target)) {
          violations.add("publication_scope");
          continue;
        }

        if (!isCurrent(output.handle, output.target)) violations.add("current_artifacts");
      }

      if (outputs.length !== expectedTargets.size) violations.add("publication_scope");
      for (const target of expectedTargets)
        if (counts.get(target) !== 1) violations.add("publication_scope");
      for (const [target, count] of counts)
        if (!expectedTargets.has(target) || count !== 1) violations.add("publication_scope");
    }

    const declared = declaredCallCount(actual.calls, index, round),
      calls = declared === undefined ? observedCounts[index] : declared;
    if (!Number.isFinite(calls) || calls < 0 || calls > round.callBudget)
      violations.add("incremental_budget");
  }
}

export function run({ cases } = {}) {
  const verdicts = {};
  for (const candidate of Array.isArray(cases) ? cases : []) {
    const violations = new Set();
    for (const cell of Array.isArray(candidate?.cells) ? candidate.cells : [])
      judgeCell(cell, violations);
    const reasons = OBLIGATIONS.filter((name) => violations.has(name));
    Object.defineProperty(verdicts, candidate.token, {
      value: { ok: reasons.length === 0, reasons },
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { verdicts };
}
