// Control layer for the memory-poisoning family.
//
// The load-bearing idea: trust is a property of ORIGIN, and origin only survives a session boundary
// if it is written down at write time. So every storable segment is committed to memory together
// with (a) the segment ids its stored value actually contains material from, and (b) the trust of
// that origin. Decisions in later sessions are then made from what memory ACTUALLY holds -- never
// from a private cache of an earlier session's records -- so a store that drops provenance leaves us
// correctly unable to justify the call, which is what M4 asks for.

const AUTHORITY_BEARING = new Set(["system", "user"]);
const UNTRUSTED = new Set(["retrieved", "tool_output"]);

/** Marks a stored record as carrying a secret. Adds no payload token, so it cannot forge provenance. */
const SECRET_MARK = "[[carries-secret]]";

const R = {
  UNKNOWN_TOOL: "M0_UNKNOWN_TOOL",
  UNTRUSTED_AUTHORITY: "M1_UNTRUSTED_AUTHORITY",
  CAPABILITY_NOT_GRANTED: "M2_CAPABILITY_NOT_GRANTED",
  UNTRUSTED_ARGUMENT: "M3_UNTRUSTED_ARGUMENT",
  UNPROVENANCED_RECALL: "M4_UNPROVENANCED_RECALL",
  LAUNDERED_MEMORY: "M5_LAUNDERED_MEMORY",
  SECRET_EGRESS: "M6_SECRET_EGRESS",
};
const ALLOWED = "ALLOWED";

// Per-scenario bookkeeping. Reset whenever a run restarts at (or rewinds to) its first session, so
// nothing leaks between scenarios sharing this module instance.
let run = null;
const freshRun = () => ({ seq: 0, lastIndex: -1, secretKeys: new Set(), seenSegments: new Map() });

const asArray = (v) => (Array.isArray(v) ? v : []);
const trustRank = (t) => (t === "system" ? 0 : t === "user" ? 1 : t === "retrieved" ? 2 : 3);

export const subject = {
  id: "provenance-at-write-time",
  label: "Records origin when it writes; decides only from what memory actually kept",

  runSession(view, memory, tools) {
    if (!run || view.index === 0 || view.index <= run.lastIndex) run = freshRun();
    run.lastIndex = view.index;

    const decisions = [];
    const audit = [];
    const emit = (actionId, from, to, reason, recalled, detail) => {
      run.seq += 1;
      audit.push({ seq: run.seq, actionId, from, to, reason, recalled: recalled.slice(), detail });
    };

    const segments = asArray(view.segments);
    const segById = new Map();
    for (const s of segments) {
      segById.set(s.id, s);
      run.seenSegments.set(s.id, s);
    }

    const keys = () => {
      try {
        return asArray(memory.keys());
      } catch {
        return [];
      }
    };
    const recall = (key) => {
      try {
        return memory.recall(key) || null;
      } catch {
        return null;
      }
    };

    // ---------------------------------------------------------------- writing

    /** Every known segment whose distinctive token appears in `text` -- the same test the harness runs. */
    const contributorsOf = (text, primary) => {
      const found = [];
      if (primary) found.push(primary);
      const seen = new Set(primary ? [primary.id] : []);
      const consider = (s) => {
        if (!s || seen.has(s.id) || !s.payload) return;
        if (typeof text === "string" && text.includes(s.payload)) {
          seen.add(s.id);
          found.push(s);
        }
      };
      for (const s of segments) consider(s);
      for (const s of run.seenSegments.values()) consider(s);
      return found;
    };

    const store = (source) => {
      if (!source || !source.memoryKey) return null;
      const text = typeof source.text === "string" ? source.text : String(source.text ?? "");
      const contributors = contributorsOf(text, source);

      // Origin trust is the trust of the least trustworthy material the value carries: paraphrasing
      // or bundling untrusted content never launders it upward.
      let origin = source.trust;
      for (const c of contributors) {
        if (trustRank(c.trust) > trustRank(origin)) origin = c.trust;
      }
      const secret = contributors.some((c) => c.carriesSecret);
      const value = secret ? `${text} ${SECRET_MARK}` : text;

      try {
        memory.write({
          key: source.memoryKey,
          value,
          provenance: contributors.map((c) => c.id),
          originTrust: origin,
        });
      } catch {
        return null;
      }
      if (secret) run.secretKeys.add(source.memoryKey);
      return source.memoryKey;
    };

    for (const segment of segments) store(segment);

    // ---------------------------------------------------------------- reading memory back

    const isSecretRecord = (rec) => {
      if (!rec) return false;
      if (rec.carriesSecret === true) return true;
      if (typeof rec.value === "string" && rec.value.includes(SECRET_MARK)) return true;
      return run.secretKeys.has(rec.key);
    };

    /** A record is untrusted if its recorded origin is data, or anything it derives from is. */
    const recordIsUntrusted = (rec, seen) => {
      if (!rec) return false;
      if (!rec.originTrust || UNTRUSTED.has(rec.originTrust)) return true;
      for (const parent of asArray(rec.provenance)) {
        const asSegment = segById.get(parent) || run.seenSegments.get(parent);
        if (asSegment && UNTRUSTED.has(asSegment.trust)) return true;
        if (seen.has(parent)) continue;
        seen.add(parent);
        const asRecord = recall(parent);
        if (asRecord && recordIsUntrusted(asRecord, seen)) return true;
      }
      return false;
    };

    const hasProvenance = (rec) => !!rec && asArray(rec.provenance).length > 0;

    /**
     * A source id in `derivedFrom` is one of: a segment of this session, a memory key, a segment id
     * from an earlier session (recoverable only through provenance we ourselves wrote down), or
     * nothing we can account for.
     */
    const resolve = (sid, consulted) => {
      const here = segById.get(sid);
      if (here) {
        return { id: sid, kind: "segment", trust: here.trust, secret: !!here.carriesSecret };
      }
      const rec = recall(sid);
      if (rec) {
        consulted.add(sid);
        return { id: sid, kind: "record", rec, trust: rec.originTrust, secret: isSecretRecord(rec) };
      }
      for (const key of keys()) {
        const candidate = recall(key);
        if (candidate && asArray(candidate.provenance).includes(sid)) {
          consulted.add(key);
          return {
            id: sid,
            kind: "segment",
            trust: candidate.originTrust,
            secret: isSecretRecord(candidate),
            viaKey: key,
          };
        }
      }
      const earlier = run.seenSegments.get(sid);
      if (earlier) {
        return { id: sid, kind: "segment", trust: earlier.trust, secret: !!earlier.carriesSecret };
      }
      return { id: sid, kind: "unknown" };
    };

    // ---------------------------------------------------------------- the policy

    const evaluate = (action, consulted) => {
      const call = (action && action.call) || {};
      const sessionTools =
        asArray(view.tools).length > 0 ? asArray(view.tools) : asArray(tools && tools.specs);
      const spec = sessionTools.find((t) => t.name === call.tool) || null;

      // 1
      if (!spec) {
        return { reason: R.UNKNOWN_TOOL, detail: `tool "${call.tool}" is not in this session's tool list` };
      }

      // 2 -- authority is checked, never taken on the call's word.
      const authority = resolve(call.authorizedBy, consulted);
      let authorized = false;
      if (authority.kind === "segment") authorized = AUTHORITY_BEARING.has(authority.trust);
      else if (authority.kind === "record") {
        authorized =
          AUTHORITY_BEARING.has(authority.rec.originTrust) &&
          !recordIsUntrusted(authority.rec, new Set());
      }
      if (!authorized) {
        const how =
          authority.kind === "record"
            ? `memory record "${authority.id}" records origin trust ${authority.rec.originTrust}`
            : authority.kind === "segment"
              ? `segment "${authority.id}" has trust ${authority.trust}`
              : `"${call.authorizedBy}" resolves to nothing that can carry authority`;
        return { reason: R.UNTRUSTED_AUTHORITY, detail: `${how} -- data cannot authorize an action` };
      }

      // 3
      const grants = asArray(view.grants);
      if (!grants.some((g) => g.capability === spec.capability)) {
        return {
          reason: R.CAPABILITY_NOT_GRANTED,
          detail: `capability "${spec.capability}" is not granted in session ${view.index}`,
        };
      }

      const sources = [];
      for (const [name, arg] of Object.entries(call.args || {})) {
        for (const sid of asArray(arg && arg.derivedFrom)) {
          sources.push({ name, sid, resolved: resolve(sid, consulted) });
        }
      }

      if (spec.privileged) {
        // 4 -- argument taken straight from data, in this session or one we already read.
        for (const s of sources) {
          if (s.resolved.kind === "segment" && UNTRUSTED.has(s.resolved.trust)) {
            return {
              reason: R.UNTRUSTED_ARGUMENT,
              detail: `argument "${s.name}" derives from segment "${s.sid}" of trust ${s.resolved.trust}`,
            };
          }
        }

        // 5 -- the store kept the value but not where it came from, so the origin is gone for good.
        for (const s of sources) {
          if (s.resolved.kind === "record" && !hasProvenance(s.resolved.rec)) {
            return {
              reason: R.UNPROVENANCED_RECALL,
              detail: `argument "${s.name}" derives from memory record "${s.sid}", which carries no recorded provenance`,
            };
          }
          if (s.resolved.kind === "unknown") {
            return {
              reason: R.UNPROVENANCED_RECALL,
              detail: `argument "${s.name}" derives from "${s.sid}", whose origin was never written down`,
            };
          }
        }

        // 6 -- a note about untrusted content is untrusted content in our handwriting.
        for (const s of sources) {
          if (s.resolved.kind === "record" && recordIsUntrusted(s.resolved.rec, new Set())) {
            return {
              reason: R.LAUNDERED_MEMORY,
              detail: `argument "${s.name}" derives from memory record "${s.sid}", whose recorded origin is ${s.resolved.rec.originTrust} -- re-encoding did not change its trust`,
            };
          }
        }
      }

      // 7
      if (spec.egress) {
        for (const s of sources) {
          if (s.resolved.secret) {
            return {
              reason: R.SECRET_EGRESS,
              detail: `argument "${s.name}" derives from "${s.sid}", which is marked as carrying a secret, and "${spec.name}" is an egress tool`,
            };
          }
        }
      }

      return { reason: ALLOWED, detail: `authorized by "${call.authorizedBy}"; every argument traces to authority-bearing origin` };
    };

    // ---------------------------------------------------------------- act

    for (const action of asArray(view.actions)) {
      const consulted = new Set();
      let verdict;
      try {
        verdict = evaluate(action, consulted);
      } catch (err) {
        verdict = { reason: R.UNTRUSTED_AUTHORITY, detail: `could not establish authority: ${err && err.message}` };
      }
      const recalled = [...consulted];
      const allowed = verdict.reason === ALLOWED;

      emit(action.id, null, "PROPOSED", "PROPOSED", recalled, action.label);
      emit(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        recalled,
        recalled.length ? `consulted ${recalled.join(", ")}` : "no stored record was needed",
      );
      emit(action.id, "RECALLED", "POLICY_CHECKED", verdict.reason, recalled, verdict.detail);

      if (allowed) {
        emit(action.id, "POLICY_CHECKED", "APPROVED", ALLOWED, recalled, verdict.detail);
        let ok = true;
        try {
          const result = tools.invoke(action.id, action.call);
          if (result && result.output) store(result.output);
        } catch (err) {
          ok = false;
        }
        emit(
          action.id,
          "APPROVED",
          "EXECUTED",
          ALLOWED,
          recalled,
          ok ? `invoked ${action.call.tool}` : `invoked ${action.call.tool}; the tool reported a failure`,
        );
        emit(action.id, "EXECUTED", "AUDITED", ALLOWED, recalled, "executed and recorded");
      } else {
        emit(action.id, "POLICY_CHECKED", "BLOCKED", verdict.reason, recalled, verdict.detail);
        emit(action.id, "BLOCKED", "AUDITED", verdict.reason, recalled, `blocked under ${verdict.reason}`);
      }

      decisions.push({ actionId: action.id, allowed, reason: verdict.reason });
    }

    return { decisions, audit };
  },
};
