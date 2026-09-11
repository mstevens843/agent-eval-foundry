// Provider-free native oracle/nop and isolation validation for the five successor packages.
import { buildHarborTask } from './build-harbor-portfolio.mjs';
import { mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw Error('Usage: validate-queue-eleven-fifteen.mjs SOURCE_ROOT FRESH_OUTPUT');
const source=resolve(sourceArg), output=resolve(outputArg);
mkdirSync(output,{recursive:false});
const ids=['capacity-maintenance-repair','partial-release-repair','verified-installation-repair','compatible-rollout-repair','ticket-consolidation-repair'];
const results=[];
function docker(args,logfile) {
  const chunks=[];
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',args,{stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));
    child.on('error',reject);
    child.on('close',code=>{
      writeFileSync(logfile,Buffer.concat(chunks));
      code===0?resolve():reject(Error('Docker exited '+code+'; see '+logfile));
    });
  });
}
for(const id of ids) {
  const out=join(output,id);mkdirSync(out);
  const manifest=buildHarborTask(source,id,join(out,'export'));
  const image='foundry-checker-audit-'+id+':'+randomUUID();
  await docker(['build','-t',image,join(out,'export/tests')],join(out,'build.log'));
  for(const kind of ['oracle','nop']) {
    const submission=join(out,kind),logs=join(out,'results-'+kind);mkdirSync(logs);
    cpSync(join(out,'export/environment/submission'),submission,{recursive:true});
    if(kind==='oracle')cpSync(join(out,'export/solution/reference'),submission,{recursive:true});
    await docker(['run','--rm','--network=none','--cpus=2','--memory=2g','--pids-limit=256',
      '--mount',`type=bind,source=${submission},target=/app/submission,readonly`,
      '--mount',`type=bind,source=${logs},target=/logs/verifier`,image,'node','/tests/harbor-grade.mjs',
      ...(kind==='oracle'?['--validate']:[])],join(out,kind+'.log'));
    const summary=JSON.parse(readFileSync(join(logs,'summary.json')));
    results.push({id,kind,digest:manifest.digest,image,...summary});
    writeFileSync(join(output,'summary.json'),JSON.stringify({providerCallsMade:0,results},null,2)+'\n');
    console.log(JSON.stringify({id,kind,reward:summary.reward,checkerCorrect:summary.checkerCorrect,checkerTotal:summary.checkerTotal}));
    if(summary.reward!==(kind==='oracle'?1:0)||summary.infrastructureError===true)
      throw Error('Native validation failed: '+id+'/'+kind);
  }
}
