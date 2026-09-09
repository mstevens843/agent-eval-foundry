// Reproduce the pinned private controls from the retained frozen exports and harness.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const here=join(root,'.local/final-six-controls-reproduction');
const frozen=join(root,'.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js');
assert.equal(createHash('sha256').update(readFileSync(frozen)).digest('hex'),'60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26');
const api=await import(frozen);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const prep=read(join(root,'reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json'));
function pkg(id){const p=prep.packages.find(p=>p.id===id);return api.executionPackage(join(root,p.foundry.export));}
function source(p,component,path){return Buffer.from(api.readSnapshotFile(p.snapshot,component,path)).toString();}
function refStage(p,name){const dir=join(here,name);mkdirSync(dir,{recursive:true});for(const f of p.snapshot.record.components.reference.files){if(f.path.startsWith('private/reference/'))write(join(dir,f.path.slice('private/reference/'.length)),source(p,'reference',f.path));}return dir;}
function execute(p,submission,scenarios,name){
 const files=[...p.snapshot.record.components.collector.files,...p.snapshot.record.components.verifier.files].filter(f=>f.path.endsWith('.mjs')&&!f.path.endsWith('bootstrap.mjs')).map(f=>({path:f.path.replace(/^(runtime|private)\//,''),text:source(p,f.path.startsWith('runtime/')?'collector':'verifier',f.path)}));
 const boot=source(p,'collector','runtime/bootstrap.mjs');
 const result=execFileSync('docker',['run','--rm','--network','none','--read-only','--tmpfs','/tmp:rw,size=512m','--tmpfs','/work:rw,size=128m','--shm-size','256m','--cpus','2','--memory','2g','--pids-limit','256','--cap-drop','ALL','--cap-add','SETUID','--cap-add','SETGID','--cap-add','KILL','--cap-add','CHOWN','--security-opt','no-new-privileges','--mount',`type=bind,src=${submission},dst=/submission,readonly`,'-i',p.image,'node','--input-type=module','-e',boot],{input:JSON.stringify({files,scenarios}),encoding:'utf8',timeout:90000,maxBuffer:24*1024*1024});
 const value=JSON.parse(result);assert(value.cells.every(c=>c.status!=='invalid'));write(join(here,name+'.json'),value);return value.cells;
}
function strip(cell){const {checks,status,failures,expected,truth,groundTruth,...rest}=cell;return rest;}
const temporal=pkg('temporal-capacity-repair'),snapshot=pkg('snapshot-recovery-repair');
const temporalRef=refStage(temporal,'temporal-reference');
const noWork=join(here,'temporal-no-work');write(join(noWork,'entry.mjs'),'export const subject={async run(){return {};}};\n');
const emptyScenario={id:'audit-empty-query-source',rows:[],queries:[],pageSize:1};
const badTemporal=execute(temporal,noWork,[emptyScenario],'temporal-no-work-trace')[0];
const goodTemporal=execute(temporal,temporalRef,[emptyScenario],'temporal-good-trace')[0];
assert.equal(badTemporal.status,'semantic-fail');assert(badTemporal.failures.includes('completion'));assert.equal(goodTemporal.status,'semantic-pass');
const snapshotRef=refStage(snapshot,'snapshot-reference');
const staging=refStage(snapshot,'snapshot-staging');cpSync(join(staging,'entry.mjs'),join(staging,'reference-entry.mjs'));
write(join(staging,'entry.mjs'),`import {subject as reference} from './reference-entry.mjs';\nexport const subject={async run(view,api){let once=false;return reference.run(view,{...api,put(request){if(!once&&request.table==='accounts'){once=true;api.put({...request,row:{...request.row,name:request.row.name+' temporary'}});}return api.put(request);}});}};\n`);
const snapshotScenario=JSON.parse(source(snapshot,'scenarios','private/scenarios.json'))[0];
const goodSnapshot=execute(snapshot,snapshotRef,[snapshotScenario],'snapshot-good-trace')[0];
const stagedSnapshot=execute(snapshot,staging,[snapshotScenario],'snapshot-staged-trace')[0];
assert.equal(goodSnapshot.status,'semantic-pass');assert.equal(stagedSnapshot.status,'semantic-pass');
const inputs={
 temporal:{cases:[{token:'valid-empty-query-source',cells:[strip(goodTemporal)]},{token:'invalid-unread-empty-query-source',cells:[strip(badTemporal)]}]},
 snapshot:{cases:[{token:'valid-reference',cells:[strip(goodSnapshot)]},{token:'valid-intermediate-write',cells:[strip(stagedSnapshot)]}]},
};
for(const[k,v]of Object.entries(inputs))write(join(here,k+'-cases.json'),v);
const evaluations=[];
const code=`import{readFileSync}from'node:fs';const m=await import('/subject/checker.mjs');const input=JSON.parse(readFileSync('/cases/input.json'));const before=JSON.stringify(input);const a=await m.run(input);const first=JSON.stringify(a);const b=await m.run(input);console.log(JSON.stringify({first:JSON.parse(first),second:b,mutated:before!==JSON.stringify(input)}));`;
for(const[k,p,group,id]of [['temporal',temporal,'round-three-failing-five','temporal-capacity-repair'],['temporal',temporal,'round-five-continuing-four','temporal-capacity-repair'],['snapshot',snapshot,'round-three-failing-five','snapshot-recovery-repair'],['snapshot',snapshot,'round-four-failing-five','snapshot-recovery-repair']]){
 const record=join(root,`.local/${group}-2026-09-09/real-campaign-frozen/jobs/real-provider/records/${id}-attempt-1`);
 const staged=join(here,group+'-'+id);cpSync(join(record,'submission'),staged,{recursive:true});
 const casesDir=join(here,group+'-'+id+'-input');write(join(casesDir,'input.json'),inputs[k]);
 const out=execFileSync('docker',['run','--rm','--network','none','--read-only','--tmpfs','/tmp:rw,size=256m','--cpus','1','--memory','1g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',`type=bind,src=${staged},dst=/subject,readonly`,'--mount',`type=bind,src=${casesDir},dst=/cases,readonly`,p.image,'node','--input-type=module','-e',code],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 const r=JSON.parse(out);assert.equal(r.mutated,false);assert.deepEqual(r.first,r.second);
 const result={id,group,checkerSha256:hash(join(staged,'checker.mjs')),result:r.first};evaluations.push(result);console.log(JSON.stringify(result));
}
write(join(here,'audit-results.json'),{providerCallsMade:0,evaluations,referenceChecks:{temporalNegative:badTemporal.status,temporalPositive:goodTemporal.status,snapshotOriginal:goodSnapshot.status,snapshotIntermediateWrite:stagedSnapshot.status}});

const policy=read(join(root,'data/final-six-grading-controls/policy.json'));
for(const [short,id]of [['temporal','temporal-capacity-repair'],['snapshot','snapshot-recovery-repair']]){
 const input=read(join(here,short+'-cases.json'));
 input.cases.forEach((c,i)=>{c.token=createHash('sha256').update(id+':final-six-v1:'+i).digest('hex').slice(0,24);});
 const c=policy.controls.find(c=>c.id===id);
 const expected=read(join(root,c.fixture));
 // Resource cleanup timing can vary; compare domain observations and outcomes instead
 // of using ephemeral process identifiers as correctness requirements.
 assert.deepEqual(input,expected,'Reproduced control differs from pinned trace; inspect before changing policy');
}
console.log(JSON.stringify({stage:'reproduced',providerCallsMade:0,fixtures:2}));
