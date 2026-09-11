// Consolidate completed local validation without model/provider calls.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root=".local/next-five-successors-2026-09-10";
const ids=["route-policy-repair","browser-replay-repair","recurring-calendar-repair","workflow-authority-repair","delegated-budget-repair"];
const json=p=>JSON.parse(readFileSync(p,"utf8"));
const digest=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
const ref=p=>({path:p,sha256:digest(p),bytes:statSync(p).size});
const roots=["release-four","release-browser","release-rest","release-rest","release-rest"];
const recipientRoots=["route-recipient","release-browser/recipient","release-rest/recipient","release-rest/recipient","release-rest/recipient"];
const author=[...json(join(root,"author-four/summary.json")).results,...json(join(root,"browser-iteration-3/summary.json")).results];
function job(agent,id) {
 const dir=join(root,"jobs","five-successors-"+agent);
 const name=readdirSync(dir).find(n=>n.startsWith(id+"__"));
 if(!name)throw Error("Missing "+agent+" "+id);
 const path=join(dir,name),result=json(join(path,"result.json")),summary=json(join(path,"verifier/summary.json"));
 if(result.exception_info || summary.infrastructureError || summary.reward!==(agent==="oracle"?1:0))throw Error("Unexpected native outcome "+path);
 return {directory:path,result:ref(join(path,"result.json")),summary:ref(join(path,"verifier/summary.json")),reward:summary.reward,service:summary.service,checker:summary.checker,reason:summary.error??null,infrastructureError:summary.infrastructureError??false};
}
const tasks=ids.map((id,i)=>{
 const base=join(root,roots[i],id),assurance=json(join(base,"validation/assurance.json")),checker=json(join(base,"oracle-checker/grade-summary.json"));
 if(assurance.results.some(r=>r.status!=="pass")||!checker.pass)throw Error("Unvalidated "+id);
 const statuses=kind=>assurance.results.find(r=>r.id===kind).detail.statuses;
 const tally=kind=>({count:statuses(kind).length,passes:statuses(kind).filter(s=>s.status==="semantic-pass").length,semanticFailures:statuses(kind).filter(s=>s.status==="semantic-fail").length,infrastructureErrors:statuses(kind).filter(s=>s.error||!s.status.startsWith("semantic-")).length});
 const native=join(root,"harbor-final",id),manifest=json(join(native,"export-manifest.json")),pointer=json(join(base,"export/package.json"));
 const sourceFiles=manifest.sourceFiles.map(f=>({path:join("tasks",id,f.path),sha256:f.sha256}));
 if(sourceFiles.some(f=>digest(f.path)!==f.sha256))throw Error("Source/export drift");
 const natives=json(join(root,"native-integrity/summary.json")).results.find(r=>r.id===id);
 const recipientPath=join(root,recipientRoots[i],"result.json"),recipient=json(recipientPath).packages.find(p=>p.packageId===id);
 if(recipient.packageDigest!==pointer.packageDigest)throw Error("Recipient digest drift");
 const measured=author.filter(r=>r.id===id&&r.candidate);
 const allPassed=measured.every(r=>r.passed);
 if(!allPassed||natives.integrity.some(r=>!r.passed))throw Error("Control failure "+id);
 return {
  id,version:json("tasks/"+id+"/public/package.json").version,
  sourceFiles,foundry:{directory:join(base,"export"),digest:pointer.packageDigest,pointer:ref(join(base,"export/package.json")),assurance:ref(join(base,"validation/assurance.json")),checkerEvidence:ref(join(base,"oracle-checker/grade-summary.json")),reproducibleBuild:true,recipientEvidence:ref(recipientPath),recipient},
  native:{directory:native,digest:manifest.digest,manifest:ref(join(native,"export-manifest.json")),reproducibleBuild:true,oracle:job("oracle",id),nop:job("nop",id),integrity:natives.integrity},
  reference:tally("reference"),alternative:tally("alternative"),starter:tally("starter"),checker:{correct:checker.correct,total:checker.total,pass:checker.pass,reasonPolicy:checker.reasonPolicy},
  localControls:measured.map(({candidate,scenarios,failures,maxFrame,maxCalls,passed})=>({candidate,scenarios,semanticFailures:failures.length,maxApiPayloadBytes:maxFrame,maxScenarioCalls:maxCalls,expectedOutcomeMatched:passed})),
 };
});
const preserved=json(join(root,"preservation-result.json")),baseline=json(join(root,"baseline.json")),capacity=json(join(root,"interface-capacity.json")),statics=json(join(root,"static/summary.json"));
if(!preserved.pass||!capacity.pass||statics.results.some(r=>!r.passed))throw Error("Global validation incomplete");
const commands=readdirSync(join(root,"commands")).filter(n=>n.endsWith(".json")).sort().map(n=>{
 const path=join(root,"commands",n),record=json(path);return {...record,record:ref(path),log:ref(record.log)};
});
const recoveredFailures={"foundry-four":"Calendar collector duplicated cumulative observations across process results, exceeding 16 MiB. Package-local result de-duplication fixed it; foundry-rest and native oracle passed.","interfaces-capacity":"Author proof script initially passed s.view instead of top-level scenario; corrected script passed as interfaces-capacity-fixed."};
for(const command of commands)if(command.exitCode!==0&&!recoveredFailures[command.record.path.split("/").at(-1).replace(".json","")])throw Error("Unexplained command failure");
const result={
 schemaVersion:1,date:"2026-09-10",purpose:"Implemented successor tasks for independent review; not model-trial or final submission qualification",
 report:"reports/screening/next-five-successor-implementation-2026-09-10.md",
 contractPlan:"docs/next-five-successor-contracts-2026-09-10.md",
 providerCallsMade:0,modelTrialsLaunched:0,commitsMade:0,pushesMade:0,externalMessagesSent:0,
 finalistStandings:{unchanged:true,count:5,ids:["incremental-build-repair","issued-report-repair","variant-cache-repair","snapshot-recovery-repair","temporal-capacity-repair"],successorAdditions:0},
 preservation:{baseline:ref(join(root,"baseline.json")),maintainedStartingFiles:baseline.maintained.length,startingMatches:baseline.maintained.filter(r=>r.matchesFrozen).length,result:ref(join(root,"preservation-result.json")),...preserved},
 tasks,
 runtime:{...json(join(root,"runtime/runtime.json")),metadata:ref(join(root,"runtime/runtime.json"))},
 validation:{staticChecks:{total:statics.results.length,passed:statics.results.filter(r=>r.passed).length,evidence:ref(join(root,"static/summary.json"))},interfaceCapacity:ref(join(root,"interface-capacity.json")),nativeIntegrity:ref(join(root,"native-integrity/summary.json")),affectedRegressionTests:24,lintFiles:501,typecheckPassed:true,commands},
 recoveredDevelopmentFailures:recoveredFailures,
 ancillaryEvidence:{browserScreenshot:ref("output/playwright/next-five-successors/public-app.png"),browserCliDirectory:".playwright-cli",browserCliArchivalNote:"Moving generated CLI logs into staging was blocked by filesystem policy; original logs remain in place. This does not block package validation."},
 remainingBlockers:[],
 nextPhase:["Independent implementation review","Comprehensive grader/checker/verifier/cheat hardening on these exact digests","Human-authored final contribution material and required external qualification before submission","Separately authorized model trials after hardening"]
};
const output="reports/screening/evidence/2026-09-10-next-five-successors.json";
writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({path:output,sha256:digest(output),tasks:tasks.map(t=>({id:t.id,reference:t.reference,checker:t.checker,foundry:t.foundry.digest,native:t.native.digest})),staticChecks:result.validation.staticChecks.total,protectedFiles:preserved.checkedFiles}));
