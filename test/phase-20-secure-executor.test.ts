// Phase 20 Lane 2/3: the trusted execution boundary actually holds.
//
// Every case here runs the REAL container path (Docker required — these tests are skipped, not
// falsely passed, when the runtime is unavailable) against the two migrated families. A positive
// control must grade clean; each exploit fixture must fail closed — never a forged pass.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runSecureContainerHost } from "../src/trials/secure-runner.js";

let dockerAvailable = false;
beforeAll(() => {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }
});

const writeSubject = (source: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "secure-exec-test-"));
  const file = join(dir, "subject.mjs");
  writeFileSync(file, source, "utf8");
  return file;
};

const MEMORY_SCENARIO = {
  allSegments: [],
  params: {},
  sessions: [{ index: 0, segments: [], actions: [], grants: [], tools: [] }],
  grants: [],
  tools: [],
};

const CAA_SCENARIO = {
  view: {
    names: [
      { fqdn: "a.example.test", cachedCaa: "ALLOW", validatedAtHour: 0 },
      { fqdn: "b.example.test", cachedCaa: "ALLOW", validatedAtHour: 0 },
    ],
    nowHour: 100,
  },
  current: { "a.example.test": "ALLOW", "b.example.test": "DENY" },
};

describe("Phase 20 secure executor — prompt-injection-memory-poisoning", () => {
  it.runIf(() => dockerAvailable)("a compliant subject grades clean, ledger intact", () => {
    const subject = writeSubject(
      "export const subject = { async runSession(view, memory, tools) {" +
        "memory.write({key:'k1', value:'hello', provenance:[], originTrust:'user'});" +
        "tools.invoke('a1', {tool:'noop', args:{}});" +
        "return {decisions:[{id:'d1'}], audit:['ok']}; } };",
    );
    const result = runSecureContainerHost(
      { modulePath: subject, familyId: "prompt-injection-memory-poisoning" },
      { scenario: MEMORY_SCENARIO },
    );
    expect(result.error).toBeNull();
    expect(result.channels.writes?.length).toBe(1);
    expect(result.channels.ledger?.length).toBe(1);
    expect((result.report as { decisions: unknown[] }).decisions.length).toBe(1);
  });

  it.runIf(() => dockerAvailable)("stdout hijack + early process.exit() cannot forge a report", () => {
    const subject = writeSubject(
      "export const subject = { runSession(view, memory, tools) {" +
        "try { process.stdout.write(JSON.stringify({report:{decisions:[{id:'forged'}],audit:[]}})); } catch {}" +
        "try { process.exit(0); } catch {}" +
        "return {decisions:[], audit:[]}; } };",
    );
    const result = runSecureContainerHost(
      { modulePath: subject, familyId: "prompt-injection-memory-poisoning" },
      { scenario: MEMORY_SCENARIO },
    );
    expect(result.error).not.toBeNull();
    expect(result.report).toBeNull();
    expect(result.diagnostics.stdoutTail).toContain("forged");
  });

  it.runIf(() => dockerAvailable)(
    "Array.prototype.push/JSON.stringify poisoning cannot touch the write channel, only the subject's own claim",
    () => {
      // memory.write() reports through `emit()` immediately — never through a local array this
      // adapter later `.push()`es onto — so poisoning a global builtin cannot suppress or rewrite
      // it. `decisions`/`audit` DO accumulate via `.push()` in this adapter, so a subject that
      // poisons it only sabotages its OWN claimed report; that claim was already 100% subject-
      // controlled before this test (a verifier cross-checks it against the ledger regardless), so
      // losing it to self-inflicted poisoning is not a new hole — it is not evidence the WRITE
      // record can be forged, which is the property this test actually needs to hold.
      const subject = writeSubject(
        "export const subject = { async runSession(view, memory, tools) {" +
          "memory.write({key:'k1', value:'hello', provenance:[], originTrust:'user'});" +
          "Array.prototype.push = function(){return 0;};" +
          "JSON.stringify = () => '{\"forged\":true}';" +
          "return {decisions:[{id:'claim-clean'}], audit:[]}; } };",
      );
      const result = runSecureContainerHost(
        { modulePath: subject, familyId: "prompt-injection-memory-poisoning" },
        { scenario: MEMORY_SCENARIO },
      );
      expect(result.error).toBeNull();
      expect(result.channels.writes?.length).toBe(1);
      expect((result.channels.writes?.[0] as { record: { key: string } }).record.key).toBe("k1");
    },
  );

  it.runIf(() => dockerAvailable)("a direct forged frame on the fd3 channel is rejected", () => {
    const subject = writeSubject(
      "import { writeSync } from 'node:fs';" +
        "export const subject = { async runSession(view, memory, tools) {" +
        "memory.write({key:'k1', value:'hello', provenance:[], originTrust:'user'});" +
        "try { writeSync(3, JSON.stringify({seq:9999,kind:'report',payload:{decisions:[{id:'forged-fd3'}],audit:[]},sig:'0'.repeat(64)}) + '\\n'); } catch {}" +
        "return {decisions:[{id:'real'}], audit:[]}; } };",
    );
    const result = runSecureContainerHost(
      { modulePath: subject, familyId: "prompt-injection-memory-poisoning" },
      { scenario: MEMORY_SCENARIO },
    );
    expect(result.error).toContain("unverifiable frame");
  });

  it.runIf(() => dockerAvailable)("a malformed/absent report fails closed, not silently", () => {
    const subject = writeSubject("export const subject = { /* no runSession */ };");
    const result = runSecureContainerHost(
      { modulePath: subject, familyId: "prompt-injection-memory-poisoning" },
      { scenario: MEMORY_SCENARIO },
    );
    expect(result.error).toContain("no subject with a runSession");
  });
});

describe("Phase 20 secure executor — caa-revalidation", () => {
  it.runIf(() => dockerAvailable)("a compliant subject grades REFUSE when one name is DENY", () => {
    const subject = writeSubject(
      "export const subject = { async run(view, caa) {" +
        "const results = view.names.map((n) => ({fqdn:n.fqdn, caa: caa.current(n.fqdn), source:'CURRENT'}));" +
        "return {decision: results.every((r)=>r.caa==='ALLOW') ? 'ISSUE':'REFUSE', results}; } };",
    );
    const result = runSecureContainerHost(
      { modulePath: subject, familyId: "caa-revalidation" },
      { scenario: CAA_SCENARIO },
    );
    expect(result.error).toBeNull();
    expect((result.report as { decision: string }).decision).toBe("REFUSE");
    expect(result.channels.queries?.length).toBe(2);
  });

  it.runIf(() => dockerAvailable)(
    "forging ISSUE via stdout + early exit, skipping the DENY query, is rejected",
    () => {
      const subject = writeSubject(
        "export const subject = { run(view, caa) {" +
          "process.stdout.write(JSON.stringify({report:{decision:'ISSUE',results:view.names.map((n)=>({fqdn:n.fqdn,caa:'ALLOW',source:'CURRENT'}))},queries:[]}));" +
          "try { process.exit(0); } catch {}" +
          "return {decision:'REFUSE', results:[]}; } };",
      );
      const result = runSecureContainerHost(
        { modulePath: subject, familyId: "caa-revalidation" },
        { scenario: CAA_SCENARIO },
      );
      expect(result.error).not.toBeNull();
      expect(result.report).toBeNull();
      expect(result.diagnostics.stdoutTail).toContain("ISSUE");
    },
  );
});
