import { equal, verdicts } from './checker-utils.mjs';
const tables=['customers','accounts','usage','credits'];
const identity=r=>JSON.stringify([r.tenant,r.id]);
const gcd=(a,b)=>b===0n?a:gcd(b,a%b);
function add([a,b],[c,d]) {const n=a*d+c*b,den=b*d,g=gcd(n,den);return [n/g,den/g];}
export function exhausted(observations) {
  return tables.every(table=>{
    const reached=new Set([null]);
    for(const o of observations) if(o.method==='fetch'&&o.request.table===table&&
      reached.has(o.request.cursor)&&Array.isArray(o.value?.rows)) {
      if(o.value.next===null) return true;
      reached.add(o.value.next);
    }
    return false;
  });
}
export function check(c) {
  if(!exhausted(c.observations)) return false;
  const {view:v,tables:t}=c;
  function facts(rows) {
    const latest=new Map();
    for(const row of rows) {
      const k=identity(row),old=latest.get(k);
      if(!old||old.revision<row.revision) latest.set(k,row);
    }
    return [...latest.values()].filter(r=>r.tenant===v.tenant&&r.state==='posted'&&r.at>=v.from&&r.at<v.to);
  }
  const customers=new Map(t.customers.filter(r=>r.tenant===v.tenant&&r.active).map(r=>[r.id,r]));
  const accounts=new Map(t.accounts.map(r=>[identity(r),r]));
  const usage=facts(t.usage),credits=facts(t.credits),expected=[];
  for(const [id,customer] of customers) {
    let total=0n,amount=[0n,1n],credit=0n;
    const usageIds=[],creditIds=[];
    for(const u of usage) {
      const a=accounts.get(JSON.stringify([u.tenant,u.accountId]));
      if(!a||a.customerId!==id) continue;
      const [whole,fraction='']=u.quantity.split('.');
      const microseconds=(BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0')))*{ms:1n,s:1000n,min:60000n}[u.unit];
      total+=microseconds;usageIds.push(u.id);
      amount=add(amount,[microseconds*BigInt(a.price.n),BigInt(a.price.d)]);
    }
    for(const cr of credits) if(cr.customerId===id) {credit+=BigInt(cr.microcents);creditIds.push(cr.id);}
    const [n,d]=amount,base=n/d,remainder=n%d;
    const rounded=base+(remainder*2n>d||(remainder*2n===d&&base%2n!==0n)?1n:0n);
    expected.push({customerId:id,name:customer.name,usageUs:String(total),chargeMicrocents:String(rounded),
      creditMicrocents:String(credit),balanceMicrocents:String(rounded-credit),usageIds:usageIds.sort(),creditIds:creditIds.sort()});
  }
  const outputs=c.observations.filter(o=>o.method==='record'&&o.value?.stored===true).map(o=>o.request.row);
  const sort=rows=>[...rows].sort((a,b)=>a.customerId<b.customerId?-1:a.customerId>b.customerId?1:0);
  return equal(outputs,c.actual)&&equal(sort(outputs),sort(expected));
}
export const run=({cases})=>verdicts(cases,check);
