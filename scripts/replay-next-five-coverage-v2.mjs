// Replay retained submissions only. No provider, scheduler, or credential access.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(repo, ".local/next-five-coverage-v2-2026-09-11");
const output = join(root, "saved-submission-replay-v2");
assert(!existsSync(output), "Replay exists; preserve it");
mkdirSync(output);
const read = p => JSON.parse(readFileSync(p, "utf8"));
const hash = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const api = await import(pathToFileURL(join(root, "validation-source/dist/index.js")));
const records = read(join(repo, ".local/hardened-next-five-pass-audit-2026-09-11/records.json")).records;
const worker = `import {readFileSync} from 'node:fs';
const encode=JSON.stringify.bind(JSON),decode=JSON.parse.bind(JSON),freeze=Object.freeze,values=Object.values;
function immutable(x){if(x&&typeof x==='object'){for(const v of values(x))immutable(v);freeze(x)}return x}
const {cases}=decode(readFileSync('/cases/cases.json','utf8'));immutable(cases);const before=encode(cases);
const {run}=await import('/checker/checker.mjs');const first=encode(await run({cases}));const second=await run({cases});
process.stdout.write(encode({first:decode(first),second,mutated:before!==encode(cases)}));`;
function checker(submission, cases, destination) {
  mkdirSync(destination);
  writeFileSync(join(destination,"cases.json"),JSON.stringify({cases}));
  const name = "foundry-coverage-replay-"+randomUUID();
  let result;
  try {
    result=JSON.parse(execFileSync("docker",["run","--rm","--name",name,"--network=none","--read-only","--user=1000:1000","--cpus=1","--memory=1g","--pids-limit=128","--cap-drop=ALL","--security-opt=no-new-privileges","--tmpfs=/tmp:rw,size=256m","--mount",`type=bind,src=${submission},dst=/checker,readonly`,"--mount",`type=bind,src=${destination},dst=/cases,readonly`,"node:24.18.1-bookworm-slim","node","--input-type=module","-e",worker],{encoding:"utf8",timeout:65000,maxBuffer:8*1024*1024}));
  } finally { try {execFileSync("docker",["rm","-f",name],{stdio:"ignore"});} catch {} }
  writeFileSync(join(destination,"result.json"),JSON.stringify(result,null,2)+"\n");
  return result;
}
function assess(result,cases,details) {
  const tokens=cases.map(c=>c.token);
  const shape=v=>v?.verdicts&&typeof v.verdicts==="object"&&!Array.isArray(v.verdicts)&&Object.keys(v.verdicts).length===tokens.length&&tokens.every(t=>Object.hasOwn(v.verdicts,t)&&typeof v.verdicts[t]?.ok==="boolean");
  const complete=Boolean(shape(result.first)&&shape(result.second));
  const deterministic=complete&&result.mutated!==true&&tokens.every(t=>result.first.verdicts[t].ok===result.second.verdicts[t].ok);
  const rows=cases.map((c,i)=>({candidate:details[i].candidateId,token:c.token,expected:details[i].expectedFailingCheck===null,actual:result.first?.verdicts?.[c.token]?.ok??null}));
  return {complete,deterministic,correct:rows.filter(r=>r.actual===r.expected).length,total:rows.length,pass:deterministic&&rows.every(r=>r.actual===r.expected),errors:rows.filter(r=>r.actual!==r.expected)};
}
const results=[];
for(const original of records) {
  assert.equal(hash(join(original.record,"completion.json")),original.completionSha256);
  const id=original.id, directory=join(output,id), base=join(root,"release",id);
  mkdirSync(directory);
  const submission=join(original.record,"submission");
  const service=await api.runPortfolioSubmission(join(base,"export"),submission,join(directory,"service"));
  const cells=read(join(directory,"service/result.json")).cells;
  assert(cells.every(c=>c.status==="semantic-pass"),id+": saved service changed behavior");
  const bank=read(join(base,"oracle-checker/cases/cases.json")).cases;
  const truth=read(join(base,"oracle-checker/grade-summary.json")).details;
  // gradeChecker emits details in groundTruth insertion order, which is cases order.
  const details=truth;assert.equal(details.length,bank.length);
  const observed=assess(checker(submission,bank,join(directory,"opaque")),bank,details);
  // Use ordinary keys as well so an interface defect cannot mask a semantic one.
  const plain=bank.map((c,i)=>({...c,token:"replay-"+i}));
  const ordinary=assess(checker(submission,plain,join(directory,"ordinary")),plain,details);
  assert(!observed.pass,id+": integrated bank did not reproduce checker failure");
  const row={id,originalReward:original.reward,originalCompletionSha256:original.completionSha256,packageDigest:read(join(base,"export/package.json")).packageDigest,service:{correct:cells.length,total:cells.length,pass:true},checker:observed,ordinaryTokens:ordinary,replayReward:0,evidence:relative(repo,directory)};
  results.push(row);writeFileSync(join(output,"summary.json"),JSON.stringify({providerCallsMade:0,historicalRewardsChanged:0,results},null,2)+"\n");
  console.log(JSON.stringify(row));
}
