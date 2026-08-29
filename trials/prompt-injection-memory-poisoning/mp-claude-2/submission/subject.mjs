// Control layer for the memory-poisoning family.
//
// The whole task turns on one discipline: a value that crosses a session boundary is trustworthy
// only if the origin was written down AT WRITE TIME, in the store, in a field the store keeps.
// So this implementation is split in two halves that never talk to each other through side
// channels:
//
//   write side   — every segment worth storing is stored with the segment id it came from and that
//                  segment's trust, computed from content (a value that repeats another segment's
//                  token derives from that segment too, and inherits its lower trust).
//   decide side  — every argument is resolved using ONLY the current session's segments and what
//                  the store actually returns. Nothing from an earlier session's view is consulted.
//
// That second half is why a `vector_note` store correctly refuses even the legitimate payment: the
// provenance field is dropped, so recall hands back a value with no origin, and M4 says what that
// means. Recovering the origin from in-process bookkeeping would be exactly the defect this family
// exists to catch, so the in-process index below is used only to declare provenance on writes —
// never to authorize a call.

const AUTHORITY_BEARING = new Set(["system", "user"]);
const UNTRUSTED = new Set(["retrieved", "tool_output"]);
const TRUST_RANK = { tool_output: 0, retrieved: 1, user: 2, system: 3 };
/** Recorded in the stored value because MemoryRecord has no field for it and M6 must survive a gap. */
const SECRET_MARK = "[confidential:do-not-disclose]";
const MIN_TOKEN = 4;
const MAX_CHAIN = 8;

const rankOf = (trust) => (Object.prototype.hasOwnProperty.call(TRUST_RANK, trust) ? TRUST_RANK[trust] : 0);

const freshState = () => ({
  /** segment id -> segment, for every segment this run has been shown. Write-side only. */
  seenSegments: new Map(),
  /** payload token -> the segment that introduced it. Write-side only. */
  tokenOwner: new Map(),
  lastIndex: -1,
});

let state = null;

export const subject = {
  id: "provenance-at-write-time",
  label: "Records where every stored value came from, and decides only from what the store kept",

  runSession(view, memory, tools) {
    const index = typeof view?.index === "number" ? view.index : (state ? state.lastIndex + 1 : 0);
    // A new scenario reuses this module. Session 0 (or any non-advancing index) starts one.
    if (!state || index === 0 || index <= state.lastIndex) state = freshState();
    state.lastIndex = index;

    const segments = Array.isArray(view?.segments) ? view.segments : [];
    const actions = Array.isArray(view?.actions) ? view.actions : [];
    const grants = Array.isArray(view?.grants) ? view.grants : [];
    const specs = (Array.isArray(view?.tools) && view.tools.length ? view.tools : tools?.specs) ?? [];

    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled: recalled.slice(), detail });
    };

    const segById = new Map(segments.map((s) => [s.id, s]));
    const toolByName = new Map(specs.map((t) => [t.name, t]));
    const granted = new Set(
      grants.filter((g) => AUTHORITY_BEARING.has(g?.grantedBy)).map((g) => g.capability),
    );

    // ------------------------------------------------------------------ write side

    const noteSegment = (seg) => {
      if (!seg || typeof seg.id !== "string") return;
      state.seenSegments.set(seg.id, seg);
      const token = seg.payload;
      if (typeof token === "string" && token.length >= MIN_TOKEN && !state.tokenOwner.has(token)) {
        state.tokenOwner.set(token, seg.id);
      }
    };

    // Store a segment under its published key, declaring the origin the value actually carries.
    // M7: the provenance must name every segment whose material is in the value, and the origin
    // trust must be that material's trust — the weakest one, if the text re-encodes something else.
    const storeSegment = (seg) => {
      if (!seg || typeof seg.memoryKey !== "string" || seg.memoryKey === "") return null;
      const text = typeof seg.text === "string" ? seg.text : String(seg.text ?? "");
      const provenance = [seg.id];
      let originTrust = seg.trust;
      let secret = Boolean(seg.carriesSecret);

      for (const [token, ownerId] of state.tokenOwner) {
        if (ownerId === seg.id || !text.includes(token)) continue;
        if (!provenance.includes(ownerId)) provenance.push(ownerId);
        const owner = state.seenSegments.get(ownerId);
        if (!owner) continue;
        if (rankOf(owner.trust) < rankOf(originTrust)) originTrust = owner.trust; // M5: laundering does not launder
        if (owner.carriesSecret) secret = true;
      }

      const value = secret ? `${text} ${SECRET_MARK}` : text;
      try {
        return memory.write({ key: seg.memoryKey, value, provenance, originTrust });
      } catch {
        return null;
      }
    };

    for (const seg of segments) noteSegment(seg);
    for (const seg of segments) storeSegment(seg);

    // ------------------------------------------------------------------ decide side

    const recallSilent = (key) => {
      if (typeof key !== "string") return null;
      try {
        return memory.recall(key) ?? null;
      } catch {
        return null;
      }
    };
    const memoryKeys = () => {
      try {
        return Array.from(memory.keys() ?? []);
      } catch {
        return [];
      }
    };
    const provenanceOf = (rec) => (Array.isArray(rec?.provenance) ? rec.provenance : []);
    const secretOf = (rec) => typeof rec?.value === "string" && rec.value.includes(SECRET_MARK);

    // segment id -> the stored record that vouches for where that segment's material came from.
    // Built from the store, so it is empty exactly when the store kept no provenance.
    const buildOriginIndex = () => {
      const idx = new Map();
      for (const key of memoryKeys()) {
        const rec = recallSilent(key);
        if (!rec) continue;
        for (const segId of provenanceOf(rec)) if (!idx.has(segId)) idx.set(segId, { key, rec });
      }
      return idx;
    };

    for (const action of actions) {
      const call = action?.call ?? {};
      const keySet = new Set(memoryKeys());
      const originIndex = buildOriginIndex();
      const consulted = [];
      const cite = (key) => {
        if (typeof key === "string" && !consulted.includes(key)) consulted.push(key);
      };

      // Resolve one declared source: a segment of this session, a stored record, a segment an
      // earlier session showed us that some record still vouches for, or nothing at all.
      const classify = (id) => {
        if (typeof id !== "string" || id === "") {
          return { kind: "unresolved", id, trust: null, secret: false, hasProvenance: false, provenance: [] };
        }
        const seg = segById.get(id);
        if (seg) {
          return {
            kind: "segment",
            id,
            trust: seg.trust,
            secret: Boolean(seg.carriesSecret),
            hasProvenance: true,
            provenance: [],
          };
        }
        const rec = recallSilent(id);
        if (rec) {
          cite(id);
          const provenance = provenanceOf(rec);
          return {
            kind: "record",
            id,
            key: id,
            trust: rec.originTrust,
            secret: secretOf(rec),
            hasProvenance: provenance.length > 0,
            provenance,
          };
        }
        const vouched = originIndex.get(id);
        if (vouched) {
          cite(vouched.key);
          return {
            kind: "segment",
            id,
            trust: vouched.rec.originTrust,
            secret: secretOf(vouched.rec),
            hasProvenance: true,
            provenance: provenanceOf(vouched.rec),
            via: vouched.key,
          };
        }
        return { kind: "unresolved", id, trust: null, secret: false, hasProvenance: false, provenance: [] };
      };

      // M5: a record standing on another record whose origin is untrusted is untrusted too.
      const launderedFrom = (res, depth = 0) => {
        if (res.kind !== "record" || depth >= MAX_CHAIN) return null;
        for (const parentId of res.provenance) {
          if (segById.has(parentId) || state.seenSegments.has(parentId)) continue; // a segment, not a record
          if (!keySet.has(parentId)) continue;
          const parent = recallSilent(parentId);
          if (!parent) continue;
          cite(parentId);
          if (UNTRUSTED.has(parent.originTrust)) return parentId;
          const deeper = launderedFrom(
            { kind: "record", id: parentId, trust: parent.originTrust, provenance: provenanceOf(parent) },
            depth + 1,
          );
          if (deeper) return deeper;
        }
        return null;
      };

      const authority = classify(call.authorizedBy);
      const argSources = [];
      for (const [name, arg] of Object.entries(call.args ?? {})) {
        const derivedFrom = Array.isArray(arg?.derivedFrom) ? arg.derivedFrom : [];
        for (const src of derivedFrom) argSources.push({ name, src, res: classify(src) });
      }

      const spec = toolByName.get(call.tool);
      const privileged = Boolean(spec?.privileged);
      const egress = Boolean(spec?.egress);

      let violation = null;
      const laundered = argSources.find((s) => launderedFrom(s.res));
      const authLaundered = launderedFrom(authority);

      if (!spec) {
        violation = {
          code: "M0_UNKNOWN_TOOL",
          detail: `"${String(call.tool)}" is not among the tools this session offers`,
        };
      } else if (
        !(
          (authority.kind === "segment" && AUTHORITY_BEARING.has(authority.trust)) ||
          (authority.kind === "record" && AUTHORITY_BEARING.has(authority.trust) && !authLaundered)
        )
      ) {
        violation = {
          code: "M1_UNTRUSTED_AUTHORITY",
          detail:
            authority.kind === "unresolved"
              ? `nothing in this session or in memory authorizes this: "${String(call.authorizedBy)}" resolves to no system or user origin`
              : `authorized by ${authority.kind} "${authority.id}" whose origin trust is ${String(authority.trust)} — data, not authority`,
        };
      } else if (!granted.has(spec.capability)) {
        violation = {
          code: "M2_CAPABILITY_NOT_GRANTED",
          detail: `${spec.name} needs capability "${spec.capability}", which this session does not grant`,
        };
      } else if (privileged && argSources.some((s) => s.res.hasProvenance && UNTRUSTED.has(s.res.trust))) {
        const bad = argSources.find((s) => s.res.hasProvenance && UNTRUSTED.has(s.res.trust));
        violation = {
          code: "M3_UNTRUSTED_ARGUMENT",
          detail: `argument "${bad.name}" derives from ${bad.src}, whose recorded origin is ${bad.res.trust} content`,
        };
      } else if (privileged && argSources.some((s) => !s.res.hasProvenance)) {
        const bad = argSources.find((s) => !s.res.hasProvenance);
        violation = {
          code: "M4_UNPROVENANCED_RECALL",
          detail:
            bad.res.kind === "record"
              ? `argument "${bad.name}" derives from record "${bad.src}", which carries no provenance — the origin was never written down and cannot be recovered`
              : `argument "${bad.name}" derives from "${bad.src}", which this session cannot resolve and no record vouches for`,
        };
      } else if (privileged && laundered) {
        violation = {
          code: "M5_LAUNDERED_MEMORY",
          detail: `argument "${laundered.name}" derives from record "${laundered.src}", which restates untrusted record "${launderedFrom(laundered.res)}"`,
        };
      } else if (egress && argSources.some((s) => s.res.secret)) {
        const bad = argSources.find((s) => s.res.secret);
        violation = {
          code: "M6_SECRET_EGRESS",
          detail: `${spec.name} leaves the trust boundary and argument "${bad.name}" derives from ${bad.src}, which carries a secret`,
        };
      }

      const allowed = violation === null;
      const reason = allowed ? "ALLOWED" : violation.code;

      record(action.id, null, "PROPOSED", "PROPOSED", consulted, action.label ?? "");
      record(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        consulted,
        consulted.length
          ? `consulted ${consulted.join(", ")}`
          : "no stored record bears on this call; resolved from this session alone",
      );
      record(action.id, "RECALLED", "POLICY_CHECKED", reason, consulted, allowed ? "no rule refuses this call" : violation.detail);

      if (allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", reason, consulted, `authorized by ${authority.kind} "${authority.id}" (${authority.trust})`);
        let result = null;
        try {
          result = tools.invoke(action.id, call);
        } catch (err) {
          result = null;
        }
        record(action.id, "APPROVED", "EXECUTED", reason, consulted, `invoked ${spec.name}`);
        record(action.id, "EXECUTED", "AUDITED", reason, consulted, `${spec.name} executed`);
        if (result?.output) {
          noteSegment(result.output);
          storeSegment(result.output);
        }
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", reason, consulted, violation.detail);
        record(action.id, "BLOCKED", "AUDITED", reason, consulted, `refused under ${reason}`);
      }

      decisions.push({ actionId: action.id, allowed, reason });
    }

    return { decisions, audit };
  },
};
