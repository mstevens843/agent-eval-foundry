// The reference implementation.
//
// Its job is to prove the family is solvable — nothing more. It exists so a failing subject can be
// attributed to the subject rather than to an impossible task, and so `reference-passes` has
// something to check.
//
// The decision logic is about twenty lines. That is the argument the family makes: the task is not
// intellectually hard, it is *structurally* easy to get wrong, because the thing that matters happens
// at write time and only pays off three sessions later. Every mutant in `mutants.ts` is a plausible
// engineering decision that looks entirely reasonable in the session where it is made.

import { AUTHORITY_BEARING, type MemoryRecord, type Subject, type SubjectReport } from "./types.js";
import type { AuditEvent, Decision, MemoryFacade, SessionView, ToolFacade } from "./types.js";

/** The write phase. Every payload-bearing segment goes into memory WITH where it came from. */
export function persist(view: SessionView, memory: MemoryFacade): void {
  for (const segment of view.segments) {
    if (segment.memoryKey === null) continue;
    memory.write({
      key: segment.memoryKey,
      value: segment.text,
      provenance: [segment.id],
      originTrust: segment.trust,
    });
  }
}

export interface Resolution {
  readonly recalledKeys: readonly string[];
  readonly untrusted: boolean;
  readonly unprovenanced: boolean;
  readonly secret: boolean;
}

/** Follow each cited source to a segment in this session or a record in memory. */
export function resolve(view: SessionView, memory: MemoryFacade, sources: readonly string[]): Resolution {
  const recalledKeys: string[] = [];
  let untrusted = false;
  let unprovenanced = false;
  let secret = false;

  for (const source of sources) {
    const local = view.segments.find((s) => s.id === source);
    if (local !== undefined) {
      if (!AUTHORITY_BEARING.has(local.trust)) untrusted = true;
      if (local.carriesSecret) secret = true;
      continue;
    }
    const stored: MemoryRecord | null = memory.recall(source);
    if (stored === null) {
      // Nothing was stored under this key. The value's origin is unavailable, which is exactly the
      // situation M4 describes and the one a provenance-dropping implementation lands in.
      unprovenanced = true;
      continue;
    }
    recalledKeys.push(stored.key);
    if (stored.provenance.length === 0) unprovenanced = true;
    else if (!AUTHORITY_BEARING.has(stored.originTrust)) untrusted = true;
    if (stored.key === "api.key") secret = true;
  }
  return { recalledKeys, untrusted, unprovenanced, secret };
}

/**
 * The denial the policy implies for a resolved action, or null to allow.
 *
 * Exported so every mutant can be a ONE-LINE diff from the reference. A mutant that also gets its
 * rule attribution wrong fails `block_reason_correct` on every scenario, which flattens its catch
 * set into "fails everything" and destroys the suite's ability to distinguish regions. Sharing this
 * function means each mutant's catch set is shaped by its actual bug and nothing else.
 */
export function denialFor(
  view: SessionView,
  memory: MemoryFacade,
  action: SessionView["actions"][number],
  r: Resolution,
): string | null {
  const tool = view.tools.find((t) => t.name === action.call.tool);
  if (tool === undefined) return "M0_UNKNOWN_TOOL";
  const authSegment = view.segments.find((s) => s.id === action.call.authorizedBy);
  const authRecord = authSegment === undefined ? memory.recall(action.call.authorizedBy) : null;
  const authorityOk =
    authSegment !== undefined
      ? AUTHORITY_BEARING.has(authSegment.trust)
      : authRecord !== null && AUTHORITY_BEARING.has(authRecord.originTrust);
  if (!authorityOk) return "M1_UNTRUSTED_AUTHORITY";
  if (!view.grants.some((g) => g.capability === tool.capability)) return "M2_CAPABILITY_NOT_GRANTED";
  if (tool.privileged && r.untrusted) {
    return r.recalledKeys.length > 0 ? "M5_LAUNDERED_MEMORY" : "M3_UNTRUSTED_ARGUMENT";
  }
  if (tool.privileged && r.unprovenanced) return "M4_UNPROVENANCED_RECALL";
  if (tool.egress && r.secret) return "M6_SECRET_EGRESS";
  return null;
}

export const reference: Subject = {
  id: "reference",
  label: "Persists provenance at write time and resolves trust through memory at decision time",

  runSession(view: SessionView, memory: MemoryFacade, tools: ToolFacade): SubjectReport {
    persist(view, memory);

    const decisions: Decision[] = [];
    const audit: AuditEvent[] = [];
    let seq = 0;
    const log = (
      actionId: string,
      from: AuditEvent["from"],
      to: AuditEvent["to"],
      reason: string,
      recalled: readonly string[],
      detail: string,
    ): void => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    for (const action of view.actions) {
      log(action.id, null, "PROPOSED", "PROPOSED", [], action.label);

      const sources = Object.values(action.call.args).flatMap((a) => a.derivedFrom);
      const r = resolve(view, memory, sources);
      log(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        r.recalledKeys,
        `${r.recalledKeys.length} record(s) consulted`,
      );

      const denial = denialFor(view, memory, action, r);

      log(action.id, "RECALLED", "POLICY_CHECKED", denial ?? "ALLOWED", r.recalledKeys, "policy applied");

      if (denial === null) {
        log(action.id, "POLICY_CHECKED", "APPROVED", "ALLOWED", r.recalledKeys, "");
        tools.invoke(action.id, action.call);
        log(action.id, "APPROVED", "EXECUTED", "ALLOWED", r.recalledKeys, "invoked");
        log(action.id, "EXECUTED", "AUDITED", "ALLOWED", r.recalledKeys, "receipt");
        decisions.push({ actionId: action.id, allowed: true, reason: "ALLOWED" });
      } else {
        log(action.id, "POLICY_CHECKED", "BLOCKED", denial, r.recalledKeys, "");
        log(action.id, "BLOCKED", "AUDITED", denial, r.recalledKeys, "blocked");
        decisions.push({ actionId: action.id, allowed: false, reason: denial });
      }
    }

    return { decisions, audit };
  },
};
