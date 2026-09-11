import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
export const read=p=>JSON.parse(readFileSync(p,'utf8'));
export function replay(id,submission,scenarios,label){
 const authority=read(join(root,id,'authority.json')),out=join(root,id,label);mkdirSync(out,{recursive:true});
 const name='foundry-pass-audit-'+randomUUID();
 const input=JSON.stringify({files:authority.files,scenarios});writeFileSync(join(out,'input.json'),input);
 let raw;
 try{raw=execFileSync('docker',['run','--pull=never','--name',name,'--network=none','--read-only','--tmpfs=/tmp:rw,size=512m','--tmpfs=/work:rw,size=128m','--shm-size=256m','--cpus=2','--memory=2g','--pids-limit=256','--cap-drop=ALL','--cap-add=SETUID','--cap-add=SETGID','--cap-add=KILL','--cap-add=CHOWN','--security-opt=no-new-privileges','--mount',`type=bind,src=${resolve(submission)},dst=/submission,readonly`,'-i',authority.runtime.image,'node','--input-type=module','-e',authority.bootstrap],{input,encoding:'utf8',timeout:300000,maxBuffer:24*1024*1024});}
 finally{try{execFileSync('docker',['rm','-f',name],{stdio:'ignore'});}catch{}}
 writeFileSync(join(out,'result.json'),raw);const result=JSON.parse(raw);
 console.log(JSON.stringify({label,id,cells:result.cells.map(c=>({id:c.scenarioId,status:c.status,failures:c.failures,error:c.error}))}));return result.cells;
}
export function check(id,submission,cases,label){
 const authority=read(join(root,id,'authority.json')),out=join(root,id,label);mkdirSync(out,{recursive:true});
 // Strip authority-only grading labels; retain the same release-checker input schema.
 cases=cases.map(c=>({...c,cells:c.cells.map(({checks,status,failures,expected,truth,groundTruth,browserTrace,...cell})=>cell)}));
 writeFileSync(join(out,'cases.json'),JSON.stringify({cases}));
 const code=`import {readFileSync} from 'node:fs';const input=JSON.parse(readFileSync('/cases/cases.json'));function freeze(x){if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x)}return x;}freeze(input);const before=JSON.stringify(input);const {run}=await import('/checker/checker.mjs');const first=await run(input);const second=await run(input);process.stdout.write(JSON.stringify({first,second,mutated:before!==JSON.stringify(input)}));`;
 const name='foundry-checker-audit-'+randomUUID();let raw;
 try{raw=execFileSync('docker',['run','--pull=never','--name',name,'--network=none','--read-only','--user=1000:1000','--cpus=1','--memory=1g','--pids-limit=128','--cap-drop=ALL','--security-opt=no-new-privileges','--tmpfs=/tmp:rw,size=256m','--mount',`type=bind,src=${resolve(submission)},dst=/checker,readonly`,'--mount',`type=bind,src=${out},dst=/cases,readonly`,authority.runtime.image,'node','--input-type=module','-e',code],{encoding:'utf8',timeout:65000,maxBuffer:8*1024*1024});}
 finally{try{execFileSync('docker',['rm','-f',name],{stdio:'ignore'});}catch{}}
 writeFileSync(join(out,'result.json'),raw);const result=JSON.parse(raw);console.log(JSON.stringify({label,id,result}));return result;
}
