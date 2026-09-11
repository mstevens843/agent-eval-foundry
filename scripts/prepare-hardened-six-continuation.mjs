// Prepare conditional slots only. The already-running Round 5 is read-only.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeContinuationPlan} from './hardened-continuation-policy.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const here=join(root,'.local/hardened-six-continuation-2026-09-11');
const prepPath='reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json';
const ledgerPath='reports/screening/evidence/2026-09-11-hardened-six-counting-ledger.json';
const outputPath='reports/screening/evidence/2026-09-11-hardened-six-continuation-preparation.json';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ref=p=>({path:relative(root,p),sha256:hash(p)});
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
assert(!existsSync(here)&&!existsSync(join(root,outputPath)),'Preparation exists; verify it');
execFileSync(process.execPath,[join(root,'scripts/verify-hardened-next-five-trial-five.mjs')],{cwd:root,stdio:'inherit',timeout:90000});
const prior=read(join(root,prepPath)),ledger=read(join(root,ledgerPath));
const plan=makeContinuationPlan(ledger,prior),oldReady=read(join(root,prior.files.ready.path));
const template=readFileSync(join(root,prior.files.controller.path),'utf8');
const frozen=join(root,prior.runtime.directory),oldEvidence=read(join(root,prior.files.hardeningEvidence.path));
mkdirSync(here);mkdirSync(join(here,'slots'));
const preparedSlots=[];
for(const p of plan.packages)for(const slot of p.slots.filter(s=>!s.adoptExisting)){
  const directory=join(here,'slots',p.id,'trial-'+slot.historicalTrial);mkdirSync(directory,{recursive:true});
  let code=template;
  const change=(from,to)=>{assert.equal(code.split(from).length,2,'Controller anchor: '+from);code=code.replace(from,to);};
  change("const liveRepoRoot = join(here, '..', '..');",`const liveRepoRoot = ${JSON.stringify(root)};`);
  change("const frozenRoot = join(here, 'frozen-source');",`const frozenRoot = ${JSON.stringify(frozen)};`);
  const start=code.indexOf('const TASKS = ['),end=code.indexOf('\n];',start)+3;assert(start>=0&&end>start);
  code=code.slice(0,start)+'const TASKS = '+JSON.stringify([{id:p.id,target:slot.target,analysisDocument:p.analysis}],null,2)+';'+code.slice(end);
  change('assert.equal(evidence.tasks.length, 5);','assert.equal(evidence.tasks.length, 1);');
  change('assert.equal(plans.length, 5);','assert.equal(plans.length, 1);');
  change("plans.filter((x) => x.target === 'codex').length, 2",`plans.filter((x) => x.target === 'codex').length, ${slot.target==='codex'?1:0}`);
  change("plans.filter((x) => x.target === 'claude').length, 3",`plans.filter((x) => x.target === 'claude').length, ${slot.target==='claude'?1:0}`);
  change('      historicalTrial: 7,',`      historicalTrial: ${slot.historicalTrial},`);
  change('      versionAttempt: 5,',`      versionAttempt: ${slot.versionRound},`);
  change('    concurrency: 5,','    concurrency: 1,');change('    maxProviderCalls: 5,','    maxProviderCalls: 1,');
  change("  const active = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8', timeout: 15000 }).trim();\n  assert(!active.split('\\n').some((x) => x.startsWith('foundry-real-')), 'Another campaign is using provider slots');",
    "  // The continuation parent owns the global concurrency check. Each child has one signed slot.");
  code=code.replaceAll('--user-authorized-five-concurrent-v3-trial-5','--user-authorized-hardened-continuation-slot').replaceAll('hardened-v3-fifth','hardened-continuation-t'+slot.historicalTrial);
  code=code.replaceAll("stage: 'five-reserved'","stage: 'slot-reserved'");
  code=code.replace(/    userAuthority: .*\n/,`    userAuthority: ${JSON.stringify('Conditional continuation authorized by the user: one fresh '+slot.target+' attempt on '+p.id+', historical Trial '+slot.historicalTrial+'. Launch only after all earlier authorized attempts for this task have scored reward zero, starting with the already-running Round 5. Stop on a new pass or infrastructure/unresolved grading, and never exceed six counted trials or three per provider. Frozen Round 5 package, profile settings and runtime; no automatic retries, subscription-only.')},\n`);
  code=code.replace(/^\/\/ Round 5.*\n/,`// Conditional continuation for ${p.id}, historical Trial ${slot.historicalTrial}.\n`);
  code=code.replace('// Round 5: retain Round 4 providers, two Codex and three Claude.','// Exactly one preassigned provider slot; the parent enforces outcome-dependent continuation.');
  writeFileSync(join(directory,'campaign.mjs'),code,{flag:'wx'});
  save(join(directory,'evidence.json'),{...oldEvidence,tasks:oldEvidence.tasks.filter(t=>t.id===p.id)});
  const diff=spawnSync('diff',['-u',join(root,prior.files.controller.path),join(directory,'campaign.mjs')],{encoding:'utf8'});assert([0,1].includes(diff.status));
  writeFileSync(join(directory,'controller.diff'),diff.stdout,{flag:'wx'});
  execFileSync(process.execPath,[join(directory,'campaign.mjs'),'prepare'],{cwd:frozen,stdio:'pipe',timeout:60000});
  execFileSync(process.execPath,[join(directory,'campaign.mjs'),'verify'],{cwd:frozen,stdio:'pipe',timeout:60000});
  const ready=read(join(directory,'real-campaign-frozen/READY.json')),actual=ready.packages[0],original=oldReady.packages.find(r=>r.id===p.id);
  assert.equal(ready.concurrency,1);assert.equal(ready.maxProviderCalls,1);
  assert.equal(actual.packageDigest,p.packageDigest);assert.equal(actual.instructionSha256,original.instructionSha256);
  assert.equal(actual.target,slot.target);assert.equal(actual.historicalTrial,slot.historicalTrial);
  if(slot.target===original.target)assert.equal(actual.profileDigest,original.profileDigest);
  else {
    assert.equal(p.id,'browser-replay-repair');assert.equal(slot.target,'claude');
    assert.deepEqual(actual.profile.limits,original.profile.limits);
    const claude=oldReady.packages.find(r=>r.target==='claude').profile;
    assert.deepEqual(actual.profile.adapter,claude.adapter);assert.deepEqual(actual.profile.authoring,claude.authoring);
  }
  assert(!existsSync(join(directory,'real-campaign-frozen/DISPATCH-CLAIM')));
  preparedSlots.push({...slot,directory:relative(root,directory),packageDigest:p.packageDigest,profileDigest:actual.profileDigest,
    controller:ref(join(directory,'campaign.mjs')),ready:ref(join(directory,'real-campaign-frozen/READY.json')),evidence:ref(join(directory,'evidence.json')),diff:ref(join(directory,'controller.diff'))});
}
save(join(root,outputPath),{...plan,date:'2026-09-11',purpose:'Adopt completed Round 5 results, then continue each task only after failures, up to six counted trials',ledger:ref(join(root,ledgerPath)),round5:ref(join(root,prepPath)),runtime:prior.runtime,runner:ref(join(root,'scripts/run-hardened-six-continuation.mjs')),policy:ref(join(root,'scripts/hardened-continuation-policy.mjs')),slots:preparedSlots,outputRoot:relative(root,here),alreadyRunningRound5Modified:false,providerCallsMade:0});
save(join(here,'READY.json'),{preparation:ref(join(root,outputPath)),providerCallsMade:0,maxNewProviderCalls:7,maxConcurrent:5});
execFileSync(process.execPath,[join(root,'scripts/run-hardened-six-continuation.mjs'),'verify'],{cwd:root,stdio:'inherit',timeout:120000});
console.log(JSON.stringify({prepared:true,adoptExisting:5,maxFurtherCalls:7,existingRound5Modified:false,providerCallsMade:0}));
