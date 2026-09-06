import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildScenario as caaScenario } from "../src/families/caa-revalidation/truth.js";
import type { CaaQuery } from "../src/families/caa-revalidation/truth.js";
import type { OrderReport } from "../src/families/caa-revalidation/types.js";
import { verify as verifyCaa } from "../src/families/caa-revalidation/verify.js";
import { buildScenario } from "../src/families/memory-poisoning/scenarios.js";
import type { VerifyInput } from "../src/families/memory-poisoning/verify.js";
import { verify as verifyMemory } from "../src/families/memory-poisoning/verify.js";
import { runSecureContainerHost } from "../src/trials/secure-runner.js";

let available = false;
const scratch = mkdtempSync(join(tmpdir(), "foundry-authority-regression-"));
const subjectFile = (name: string, source: string) => {
  const path = join(scratch, `${name}.mjs`);
  writeFileSync(path, source);
  return path;
};
const scenario = caaScenario({ seed: 7, domainCount: 2, agePattern: "all-stale", denyPosition: "last" });
const compliant = `export const subject = {run(view, caa) {
  const results = view.names.map(n => ({fqdn:n.fqdn, caa:caa.current(n.fqdn), source:'CURRENT'}));
  return {decision:results.every(r=>r.caa==='ALLOW')?'ISSUE':'REFUSE',results};
}};`;
const run = (name: string, source: string) =>
  runSecureContainerHost(
    { familyId: "caa-revalidation", modulePath: subjectFile(name, source) },
    { scenario },
  );

beforeAll(() => {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore", timeout: 20_000 });
    available = true;
  } catch {
    available = false;
  }
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("authority-owned operations, not signed child claims", () => {
  it.runIf(() => available)("preserves UTF-8 across multi-chunk public responses", () => {
    const orderId = "漢🙂é".repeat(2000);
    const large = { ...scenario, view: { ...scenario.view, orderId } };
    const source = `export const subject={run(view,caa){
      if(view.orderId !== '漢🙂é'.repeat(2000)) throw Error('corrupted public view');
      return {decision:'REFUSE',results:view.names.map(n=>({fqdn:n.fqdn,caa:caa.current(n.fqdn),source:'CURRENT'}))};
    }};`;
    const result = runSecureContainerHost(
      { familyId: "caa-revalidation", modulePath: subjectFile("utf8", source) },
      { scenario: large },
    );
    expect(result.error).toBeNull();
    expect(
      verifyCaa({
        scenario: large,
        report: result.report as OrderReport,
        queries: result.channels.queries as CaaQuery[],
      }),
    ).toEqual([]);
  });

  it.runIf(() => available)("accepts real CAA work and independently grades its answer", () => {
    const result = run("reference", compliant);
    expect(result.error).toBeNull();
    expect(
      verifyCaa({
        scenario,
        report: result.report as OrderReport,
        queries: result.channels.queries as CaaQuery[],
      }),
    ).toEqual([]);
  });

  it.runIf(() => available)(
    "keeps privileged process data inaccessible and supplies no signing secret or hidden payload",
    () => {
      const source = `import fs from 'node:fs';
      if (process.getuid() !== 1000 || process.getgid() !== 1000) throw Error('wrong identity');
      if (process.env.RPC_SECRET !== undefined || process.argv.length !== 3) throw Error('private data supplied');
      for (const path of ['/proc/1/environ', '/proc/1/mem', '/proc/1/fd/0']) {
        try { const fd=fs.openSync(path, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK); fs.closeSync(fd); throw Error('PRIVATE_READ_SUCCEEDED'); }
        catch(e) { if(e.message==='PRIVATE_READ_SUCCEEDED') throw e; if(!['EACCES','EPERM'].includes(e.code)) throw e; }
      }
      ${compliant}`;
      const result = run("identity", source);
      expect(result.error).toBeNull();
      expect(result.channels.queries).toHaveLength(2);
    },
  );

  it.runIf(() => available)(
    "does not let crypto monkeypatching obtain hidden answers or create observations",
    () => {
      const result = run(
        "crypto",
        `import crypto from 'node:crypto'; import {syncBuiltinESMExports} from 'node:module';
      crypto.createHmac=()=>{throw Error('child signer invoked')}; syncBuiltinESMExports(); ${compliant}`,
      );
      expect(result.error).toBeNull();
      expect(result.channels.queries).toHaveLength(2);
    },
  );

  for (const kind of ["call", "report", "done"]) {
    it.runIf(() => available)(`rejects an injected legacy ${kind} frame`, () => {
      const result = run(
        `injected-${kind}`,
        `import {writeSync} from 'node:fs';
        writeSync(3,JSON.stringify({seq:1,kind:${JSON.stringify(kind)},payload:{channel:'queries',entry:{seq:1,fqdn:'forged'}},sig:'forged'})+'\\n');
        ${compliant}`,
      );
      expect(result.error).toContain("invalid request sequence, envelope or terminal ordering");
      expect(result.report).toBeNull();
      expect(result.channels.queries ?? []).toEqual([]);
    });
  }

  it.runIf(() => available)("a fabricated answer without actual queries fails positive work", () => {
    const result = run(
      "no-work",
      `export const subject={run(view){return {decision:'REFUSE',results:view.names.map((n,i)=>({fqdn:n.fqdn,caa:i?'DENY':'ALLOW',source:'CURRENT'}))}}};`,
    );
    expect(result.error).toBeNull();
    const failures = verifyCaa({
      scenario,
      report: result.report as OrderReport,
      queries: result.channels.queries as CaaQuery[],
    });
    expect(failures.map((f) => f.check)).toContain("caa_positive_query_work");
  });

  it.runIf(() => available)(
    "preserves multi-session reference behavior across every store and dispute variant",
    () => {
      const entry = join(scratch, "memory-entry.ts");
      writeFileSync(
        entry,
        `export {reference as subject} from ${JSON.stringify(resolve("src/families/memory-poisoning/reference.ts"))};`,
      );
      execFileSync(
        "pnpm",
        [
          "exec",
          "tsup",
          entry,
          "--out-dir",
          join(scratch, "bundle"),
          "--format",
          "esm",
          "--no-dts",
          "--no-sourcemap",
        ],
        { stdio: "pipe", timeout: 30_000 },
      );
      const modulePath = subjectFile(
        "memory-reference",
        readFileSync(join(scratch, "bundle/memory-entry.js"), "utf8"),
      );
      for (const memoryKind of ["summary", "fact_store", "vector_note"] as const) {
        for (const lateDispute of ["none", "legit", "illegit"] as const) {
          const scenario = buildScenario({
            seed: 11,
            attack: "secret_recall",
            sessionsBetween: 3,
            memoryKind,
            benignActions: 2,
            decoySimilarity: "structural",
            lateDispute,
          });
          const result = runSecureContainerHost(
            { familyId: "prompt-injection-memory-poisoning", modulePath },
            { scenario },
          );
          expect(
            result.error,
            `${memoryKind}/${lateDispute}: ${JSON.stringify(result.diagnostics)}`,
          ).toBeNull();
          expect(
            verifyMemory({
              scenario,
              ledger: result.channels.ledger,
              writes: result.channels.writes,
              report: result.report,
            } as VerifyInput),
          ).toEqual([]);
        }
      }
    },
    30_000,
  );
});
