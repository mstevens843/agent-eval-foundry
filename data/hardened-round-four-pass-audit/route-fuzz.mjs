import {subject} from '/submitted/entry.mjs';
import {run as submittedChecker} from '/submitted/checker.mjs';
import {plan as referencePlan} from '/reference/src/plan.mjs';
import {run as referenceChecker} from '/reference/checker.mjs';
import {runScenario,evaluate} from '/authority/domain.mjs';
import {equivalent,vocabulary,prefixWitnesses} from '/authority/equivalence.mjs';
import {validateTarget,evaluateTarget} from '/authority/target.mjs';
let seed=831991;function rnd(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}const pick=xs=>xs[rnd(xs.length)];
const tags=['red','blue','other:λ'];
const prefixes=['0.0.0.0/0','0.0.0.0/1','128.0.0.0/1','10.0.0.0/8','10.64.0.0/10','10.64.0.0/16','192.0.2.0/24','255.255.255.255/32'];
function match(){const m={};if(rnd(3)){m.prefix=pick(prefixes);const len=+m.prefix.split('/')[1];m.ge=len+rnd(33-len);m.le=m.ge+rnd(33-m.ge);}if(rnd(2))m.communities=tags.filter(()=>rnd(2));return m;}
function action(i){const kind=pick(i===3?['accept','reject','continue','return']:['accept','reject','continue','return','call']);return{kind,...(kind==='call'?{policy:'p'+(i+1+rnd(3-i))}:{}),...(rnd(2)?{preference:pick([0,1,99,1000])}:{}),...(rnd(2)?{add:tags.filter(()=>rnd(2))}:{}),...(rnd(2)?{remove:tags.filter(()=>rnd(2))}:{})};}
const summary={seed:831991,generated:300,validCases:0,skippedCapacity:0,serviceChecks:0,checkerPositive:0,checkerNegative:0,failures:[],maxTargetRules:0};
for(let n=0;n<summary.generated;n++){
 const config={egresses:Object.fromEntries([[n%13===0?'__proto__':'edge','p0'],['other','p1']]),policies:Object.fromEntries(Array.from({length:4},(_,i)=>['p'+i,{terms:Array.from({length:1+rnd(4)},()=>({match:match(),action:action(i)})),fallback:action(i)}]))};
 const request={egresses:[Object.keys(config.egresses)[0]],match:match(),preference:pick([0,1,1000])};
 const view={config,request};let reference;
 try{reference=referencePlan(view);validateTarget(reference,vocabulary(config,request));if(Buffer.byteLength(JSON.stringify(view))+Buffer.byteLength(JSON.stringify({config:reference}))>48*1024){summary.skippedCapacity++;continue;}}
 catch{summary.skippedCapacity++;continue;}
 if(!equivalent(config,request,reference,evaluate)){summary.failures.push({n,kind:'oracle-divergence',view,reference});continue;}
 summary.validCases++;summary.maxTargetRules=Math.max(summary.maxTargetRules,Object.values(reference.egresses).reduce((n,r)=>n+r.length,0));
 const routes=prefixWitnesses(config,request,reference).slice(0,5).flatMap(prefix=>Object.keys(config.egresses).flatMap(egress=>[[],tags].map(communities=>({egress,route:{prefix,preference:17,communities:[...communities,'unregistered']}}))));
 const s={id:'fuzz-'+n,config,request,routes};
 const execute=run=>async a=>{const spec=a.begin(0);const api=Object.fromEntries(spec.facades[0].methods.map(method=>[method,args=>a.invoke('api.'+method,[args])]));await a.report(await run(spec.view,api));};
 const service=await runScenario(s,execute(subject.run),'/tmp');summary.serviceChecks++;
 if(service.failures.length)summary.failures.push({n,kind:'submitted-service',failures:service.failures,view,deployment:service.observations});
 const positive=await runScenario(s,execute(async(v,a)=>a.publish({config:reference})),'/tmp');
 const {checks,failures,expected,...cell}=positive;
 const verdict=await submittedChecker({cases:[{token:'__proto__',cells:[cell]}]});summary.checkerPositive++;
 if(verdict.verdicts.__proto__?.ok!==true)summary.failures.push({n,kind:'checker-rejects-valid',view,reference,verdict});
 const altered=structuredClone(reference),key=Object.keys(config.egresses)[0];altered.egresses[key].unshift({when:{all:[],none:[]},action:{decision:pick(['accept','reject']),preference:rnd(1001),add:[],remove:[]}});
 try{validateTarget(altered,vocabulary(config,request));}catch{continue;}
 const negative=await runScenario(s,execute(async(v,a)=>a.publish({config:altered})),'/tmp');
 const wrong=negative.failures.length>0;const {checks:cc,failures:ff,expected:ee,...raw}=negative;
 const result=await submittedChecker({cases:[{token:'candidate',cells:[raw]}]});summary.checkerNegative++;
 if(result.verdicts.candidate.ok===wrong)summary.failures.push({n,kind:'checker-misclassification',view,altered,wrong,result});
 if(summary.failures.length>=8)break;
}
console.log(JSON.stringify(summary));
