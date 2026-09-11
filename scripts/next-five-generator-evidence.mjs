import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
const ids=["route-policy-repair","browser-replay-repair","recurring-calendar-repair","workflow-authority-repair","delegated-budget-repair"];
const baseline=JSON.parse(readFileSync(".local/next-five-successors-2026-09-10/baseline.json"));
const prior=JSON.parse(readFileSync("reports/screening/evidence/2026-09-09-next-five-generators.json"));
const fourth=JSON.parse(readFileSync("data/fourth-portfolio-selection-ledger.json"));
const rows=ids.map(id=>{
 const path="tasks/"+id+"/private/scenarios.mjs",predecessor=baseline.maintained.find(r=>r.path===path).sha256;
 return {id,historicalGeneratorSha256:prior.find(r=>r.id===id)?.historicalGeneratorSha256??fourth.generators.find(r=>r.id===id)?.generatorSha256??predecessor,
 predecessorGeneratorSha256:predecessor,generatorSha256:createHash("sha256").update(readFileSync(path)).digest("hex")};
});
writeFileSync("reports/screening/evidence/2026-09-10-next-five-generators.json",JSON.stringify(rows,null,2)+"\n");
console.log(JSON.stringify({generators:rows.length,providerCallsMade:0}));
