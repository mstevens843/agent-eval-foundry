// The probe is a gate, so it has to be shown to work in both directions.
//
// A screen that flags everything blocks nothing, because people turn it off. A screen that flags
// nothing passes everything, and passes it silently. Every detector below is therefore tested twice:
// once against a package that omits the rule, and once against the SAME package with the rule added.
// The second half is the half that matters, and it is the half a validation suite usually skips.
//
// The headline case is the last one. `durable-approval-outbox` is the family whose 6/6 frontier
// reward-0 result was withdrawn when it emerged that the graded rule — ACKED is terminal — existed
// only in the hidden verifier. Two arms of that task now exist on disk, differing by ONE SENTENCE
// that states the rule. The probe must flag the arm without it and clear the arm with it. That is
// not a fixture; it is the real task, and the same two directories the paid A2 experiment runs on.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  directoryTarget,
  loadAdjudications,
  probe,
  probeGate,
  probeableFamilies,
} from "../src/spec-probe/index.js";
import type { ProbeFile, ProbeTarget } from "../src/spec-probe/types.js";

const ts = (path: string, source: string): ProbeFile => ({ path, source, language: "ts" });
const py = (path: string, source: string): ProbeFile => ({ path, source, language: "py" });
const md = (path: string, source: string): ProbeFile => ({ path, source, language: "text" });

const target = (hidden: readonly ProbeFile[], visible: readonly ProbeFile[]): ProbeTarget => ({
  id: "fixture",
  hidden,
  visible,
});

const detectors = (t: ProbeTarget) => probe(t).findings.map((f) => f.detector);

describe("D1 — a graded threshold the specification never prints", () => {
  const verifier = ts(
    "verify.ts",
    `export function check(samples: number[]) {
       const failures = [];
       if (samples.length < 3) {
         failures.push(fail("insufficient_evidence", "not enough in-window samples"));
       }
       return failures;
     }`,
  );

  it("flags the constant when no visible file states it", () => {
    const result = probe(
      target([verifier], [md("SPEC.md", "The subject must gather sufficient in-window evidence.")]),
    );
    expect(result.findings.map((f) => f.detector)).toContain("unstated-threshold");
    expect(result.findings[0]?.missing).toEqual(["3"]);
  });

  it("clears once the specification states the quantity", () => {
    const fixed = md("SPEC.md", "The subject must gather at least 3 in-window samples.");
    expect(detectors(target([verifier], [fixed]))).not.toContain("unstated-threshold");
  });

  it("clears when the quantity is spelled in words, because a reader does not care which", () => {
    const fixed = md("SPEC.md", "The subject must gather at least three in-window samples.");
    expect(detectors(target([verifier], [fixed]))).not.toContain("unstated-threshold");
  });

  it("ignores 0 and 1, which are structural rather than graded", () => {
    // A deliberate, measured false negative. Emptiness tests are everywhere and burying the real
    // thresholds under them is how a screen stops being read.
    const structural = ts(
      "verify.ts",
      `if (xs.length > 0) { failures.push(fail("x", "y")); }
       if (i !== 1) { failures.push(fail("x", "y")); }`,
    );
    expect(detectors(target([structural], [md("SPEC.md", "nothing relevant")]))).toEqual([]);
  });

  it("ignores a constant outside any decision, so arithmetic is not a finding", () => {
    const arithmetic = ts(
      "util.ts",
      "export const windowMs = 60 * 5; if (windowMs > 42) { return windowMs; }",
    );
    expect(detectors(target([arithmetic], [md("SPEC.md", "nothing relevant")]))).toEqual([]);
  });
});

describe("D2 — a graded set whose members the specification never enumerates", () => {
  const verifier = ts(
    "verify.ts",
    `const SECRET_CHANNELS = new Set(["api.key", "auth.token", "db.password"]);
     export function check(record) {
       if (SECRET_CHANNELS.has(record.channel)) {
         failures.push(fail("secret_leak", "wrote a record carrying a secret"));
       }
     }`,
  );

  it("flags members that appear nowhere visible", () => {
    const spec = md("SPEC.md", "M6: the subject must not write a record marked as carrying a secret.");
    const findings = probe(target([verifier], [spec])).findings;
    const membership = findings.find((f) => f.detector === "unstated-set-membership");
    expect(membership, "the rule is published but the set it ranges over is not").toBeDefined();
    expect(membership?.missing).toEqual(["api.key", "auth.token", "db.password"]);
    expect(membership?.severity).toBe("high");
  });

  it("clears once the specification enumerates them", () => {
    const spec = md(
      "SPEC.md",
      "M6: the subject must not write a record on a secret-carrying channel. These are `api.key`, `auth.token` and `db.password`.",
    );
    expect(detectors(target([verifier], [spec]))).not.toContain("unstated-set-membership");
  });

  it("downgrades to medium when only some members are missing, because the set is partly published", () => {
    const spec = md("SPEC.md", "Secret channels include `api.key` and `auth.token`.");
    const membership = probe(target([verifier], [spec])).findings.find(
      (f) => f.detector === "unstated-set-membership",
    );
    expect(membership?.severity).toBe("medium");
    expect(membership?.missing).toEqual(["db.password"]);
  });
});

describe("D3 — a terminal state the specification never declares", () => {
  // The real shape, reduced: a Python transition table keyed by module constants, with two states
  // mapped to the empty set. Terminality is a rule stated by ABSENCE, which is why a token search
  // for the state name finds it "documented" and misses the defect entirely.
  const invariants = py(
    "invariants.py",
    `READY = "READY"
LEASED = "LEASED"
EXECUTED = "EXECUTED"
ACKED = "ACKED"
REVOKED = "REVOKED"

LEGAL = {
    READY: {LEASED, REVOKED},
    LEASED: {LEASED, EXECUTED, READY, REVOKED},
    EXECUTED: {ACKED, REVOKED},
    ACKED: set(),
    REVOKED: set(),
}

def check_audit(result):
    for a in result["audit"]:
        if a[3] not in LEGAL[a[2]]:
            raise Violation("audit records a transition the state machine does not contain")`,
  );

  const happyPath = md("SEMANTICS.md", "The normal path is:\n\nREADY -> LEASED -> EXECUTED -> ACKED\n");

  it("flags ACKED as an undeclared terminal state", () => {
    const findings = probe(target([invariants], [happyPath])).findings;
    const transition = findings.filter((f) => f.detector === "unstated-transition");
    expect(transition.map((f) => f.missing[0])).toEqual(["ACKED is terminal", "REVOKED is terminal"]);
    expect(transition[0]?.severity).toBe("high");
  });

  it("is not fooled by the state being mentioned — mention is not declaration", () => {
    // ACKED appears in the arrow chain. That documents that the state EXISTS. The graded rule is
    // that nothing leaves it, and an arrow chain ending at a state says nothing about that.
    const findings = probe(target([invariants], [happyPath])).findings;
    expect(findings.some((f) => f.missing.includes("ACKED is terminal"))).toBe(true);
  });

  it("clears once one sentence declares terminality", () => {
    const repaired = md(
      "SEMANTICS.md",
      "The normal path is:\n\nREADY -> LEASED -> EXECUTED -> ACKED\n\n`ACKED` and `REVOKED` are terminal: neither has an outgoing transition.\n",
    );
    expect(detectors(target([invariants], [repaired]))).not.toContain("unstated-transition");
  });

  it("surfaces visible text that contradicts the hidden table, which is worse than silence", () => {
    // A SQL comment in a file the subject CAN read, grouping EXECUTED with the two terminal states.
    // The hidden table gives EXECUTED two successors, so the grouping is false — and a subject that
    // believed it has been actively misled rather than merely left uninformed.
    const misleading = py(
      "db.py",
      "-- (EXECUTED, ACKED, REVOKED) are history and do not block a successor.\nSQL = 1",
    );
    const findings = probe(target([invariants], [happyPath, { ...misleading, language: "text" }])).findings;
    const acked = findings.find((f) => f.missing.includes("ACKED is terminal"));
    expect(acked?.contradiction?.path).toBe("db.py");
    expect(acked?.contradiction?.text).toContain("history");
  });

  it("matches a bare `new Set()`, not only `new Set([])`", () => {
    // The idiomatic TypeScript spelling. Missing it was a total silent miss on the exact defect
    // class this detector exists for: the entry did not match the entry regex at all, so the table
    // showed no terminals and the detector returned nothing.
    const ts_ = ts(
      "verify.ts",
      `const LEGAL = {
         READY: new Set(["LEASED"]),
         LEASED: new Set(["EXECUTED", "READY"]),
         EXECUTED: new Set(["ACKED"]),
         ACKED: new Set(),
       };
       if (!LEGAL[from].has(to)) { failures.push(fail("audit", "illegal transition")); }`,
    );
    const findings = probe(
      target([ts_], [md("SPEC.md", "States: READY, LEASED, EXECUTED, ACKED.")]),
    ).findings;
    expect(findings.map((f) => f.missing[0])).toContain("ACKED is terminal");
  });

  it("an unrelated numeric array elsewhere in the file cannot veto the whole table", () => {
    // Entries used to be collected across the ENTIRE file, so one config object with numeric values
    // classified as unparsed and suppressed extraction for every real state machine below it. A
    // retry table beside a state machine is an ordinary shape.
    const ts_ = ts(
      "verify.ts",
      `const RETRY_DELAYS = { attempt1: [1, 2, 4], attempt2: [8, 16, 32] };
       const LEGAL = {
         READY: new Set(["LEASED"]),
         LEASED: new Set(["EXECUTED"]),
         EXECUTED: new Set(["ACKED"]),
         ACKED: new Set(),
       };
       if (!LEGAL[from].has(to)) { failures.push(fail("audit", "illegal transition")); }`,
    );
    const findings = probe(
      target([ts_], [md("SPEC.md", "States: READY, LEASED, EXECUTED, ACKED.")]),
    ).findings;
    expect(findings.map((f) => f.missing[0])).toContain("ACKED is terminal");
  });

  it("does not treat an ordinary config object as a state machine", () => {
    const config = ts(
      "config.ts",
      `export const limits = { retries: [1, 2], timeouts: [] };
       if (limits.retries.length > 2) { failures.push(fail("x", "y")); }`,
    );
    expect(detectors(target([config], [md("SPEC.md", "nothing")]))).not.toContain("unstated-transition");
  });
});

describe("D5 — a call the grader requires and the specification merely permits", () => {
  // The access-token defect, reduced. The loop is unconditional over every attempt, including
  // attempts whose decision is to BLOCK, where nothing is granted and nothing needs observing.
  const verifier = ts(
    "verify.ts",
    `function attemptedCurrentObservation(calls, attempt) {
       const own = calls.filter((call) => call.attempt === attempt);
       return own.some((call) => call.method === "currentApproval") &&
              own.some((call) => call.method === "currentToken");
     }
     export function verify(scenario, calls) {
       for (let attempt = 0; attempt < scenario.params.repeatCount; attempt += 1) {
         if (!attemptedCurrentObservation(calls, attempt)) {
           failures.push(fail("current_state_observed", "attempt did not observe both current approval and current token"));
         }
       }
     }`,
  );

  it("flags the requirement and quotes the permissive sentence back", () => {
    const spec = md(
      "SPEC.md",
      "The subject may observe current ledgers through the authority facade and may request a grant effect.",
    );
    const findings = probe(target([verifier], [spec])).findings;
    const calls = findings.filter((f) => f.detector === "unstated-mandatory-call");
    expect(calls.map((f) => f.missing[0]).sort()).toEqual([
      "currentApproval is mandatory",
      "currentToken is mandatory",
    ]);
    expect(calls[0]?.severity).toBe("high");
    // The whole point: the specification does not merely omit the obligation, it licenses the
    // behaviour that loses.
    expect(calls[0]?.contradiction?.text).toContain("may observe");
  });

  it("clears once the specification imposes the call", () => {
    const spec = md(
      "SPEC.md",
      "On every attempt, including attempts it will block, the subject must call `currentApproval` and `currentToken` before deciding.",
    );
    expect(detectors(target([verifier], [spec]))).not.toContain("unstated-mandatory-call");
  });
});

describe("silence is reported as silence, not as cleanliness", () => {
  it("says so loudly when it extracted no commitments at all", () => {
    // The failure mode that looks like success: point the probe at the wrong directory and it finds
    // nothing, prints clean, and nobody checks. `cleared === 0 && findings === 0` must never be
    // reported as a pass.
    const result = probe(target([ts("empty.ts", "export const x = 1;")], [md("SPEC.md", "hello")]));
    expect(result.findings).toEqual([]);
    expect(result.cleared).toBe(0);
  });
});

// ---------------------------------------------------------------- the real thing

const SOURCE_REPO = "/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task";
const hasArms = existsSync(join(SOURCE_REPO, "tasks", "dao-a2-control", "tests", "invariants.py"));

describe.runIf(hasArms)("the A2 arms: the same two directories the paid experiment runs on", () => {
  const arm = (name: string) =>
    directoryTarget(
      name,
      join(SOURCE_REPO, "tasks", name, "tests"),
      join(SOURCE_REPO, "tasks", name, "environment"),
    );

  it("flags ACKED-terminal on the control arm", () => {
    const result = probe(arm("dao-a2-control"));
    const acked = result.findings.find((f) => f.missing.includes("ACKED is terminal"));
    expect(acked, "the probe missed the defect that withdrew this family's flagship result").toBeDefined();
    expect(acked?.severity).toBe("high");
    expect(acked?.hidden.path).toContain("invariants.py");
  });

  it("clears ACKED-terminal on the treatment arm, which differs by one sentence", () => {
    const result = probe(arm("dao-a2-treatment"));
    expect(result.findings.some((f) => f.missing.includes("ACKED is terminal"))).toBe(false);
  });

  it("the discrimination is caused by the sentence and nothing else", () => {
    // Both arms are otherwise byte-identical, so every other finding must be common to both. If the
    // probe reported a different set for unrelated reasons, the discrimination above would be luck.
    const control = probe(arm("dao-a2-control")).findings.map((f) => `${f.detector}|${f.missing.join(",")}`);
    const treatment = probe(arm("dao-a2-treatment")).findings.map(
      (f) => `${f.detector}|${f.missing.join(",")}`,
    );
    const onlyInControl = control.filter((f) => !treatment.includes(f));
    expect(onlyInControl).toEqual([
      "unstated-transition|ACKED is terminal",
      "unstated-transition|REVOKED is terminal",
    ]);
    expect(treatment.filter((f) => !control.includes(f))).toEqual([]);
  });
});

// ---------------------------------------------------------------- the gate

describe("the probe gate blocks on silence, not on findings", () => {
  const ROOT = join(__dirname, "..");

  it("every built family has a written reason for every high-severity finding", () => {
    const adjudications = loadAdjudications(ROOT);
    const results = probeableFamilies(ROOT).map((id) => probeGate(ROOT, id, adjudications));
    const blocked = results.filter((r) => !r.passes);
    expect(
      blocked.map(
        (r) =>
          `${r.familyId}: ${r.unadjudicated
            .map(
              (finding) =>
                `${finding.detector}[${finding.missing.join(", ")}]@${finding.hidden.path}:${finding.hidden.line}`,
            )
            .join("; ")}`,
      ),
      "a family carries a high-severity probe finding nobody has adjudicated",
    ).toEqual([]);
    // Not vacuous: the gate must actually be looking at something.
    expect(results.length).toBeGreaterThanOrEqual(8);
    expect(
      results.some((r) => r.blocking.length > 0),
      "the gate saw no findings at all",
    ).toBe(true);
  });

  it("a finding with no adjudication blocks, and one with a reason does not", () => {
    const adjudications = loadAdjudications(ROOT);
    const withFindings = probeableFamilies(ROOT)
      .map((id) => probeGate(ROOT, id, adjudications))
      .find((r) => r.blocking.length > 0);
    if (withFindings === undefined) throw new Error("no family has a high finding; this test is vacuous");

    // Remove every adjudication for that family: the same family must now block.
    const starved = probeGate(
      ROOT,
      withFindings.familyId,
      adjudications.filter((a) => a.familyId !== withFindings.familyId),
    );
    expect(starved.passes, "the gate passed a family with unread high-severity findings").toBe(false);
    expect(starved.unadjudicated.length).toBe(withFindings.blocking.length);
  });

  it("a reason too short to have said anything does not clear a finding", () => {
    const adjudications = loadAdjudications(ROOT);
    const target = probeableFamilies(ROOT)
      .map((id) => probeGate(ROOT, id, adjudications))
      .find((r) => r.blocking.length > 0);
    if (target === undefined) throw new Error("no family has a high finding; this test is vacuous");

    const hollowed = adjudications.map((a) =>
      a.familyId === target.familyId ? { ...a, reason: "looks fine" } : a,
    );
    expect(probeGate(ROOT, target.familyId, hollowed).passes).toBe(false);
  });

  it("recording a finding as a REAL defect does not clear the gate", () => {
    // Writing down that a defect is real and counting a trial anyway is the exact move this project
    // exists to prevent. Only `false-positive` and `accepted-risk` clear; a real defect must be
    // repaired until the probe stops producing it.
    const adjudications = loadAdjudications(ROOT);
    const target = probeableFamilies(ROOT)
      .map((id) => probeGate(ROOT, id, adjudications))
      .find((r) => r.blocking.length > 0);
    if (target === undefined) throw new Error("no family has a high finding; this test is vacuous");

    const conceded = adjudications.map((a) =>
      a.familyId === target.familyId ? { ...a, verdict: "real-defect" as const } : a,
    );
    expect(probeGate(ROOT, target.familyId, conceded).passes).toBe(false);
  });
});
