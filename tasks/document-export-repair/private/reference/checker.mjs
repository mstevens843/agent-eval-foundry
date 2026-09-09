import { gunzipSync } from 'node:zlib';
import { equal, verdicts } from './checker-utils.mjs';
function decode(p) {
  const bytes=Buffer.from(p.data,p.encoding==='utf8'?'utf8':'base64');
  return p.encoding==='gzip-base64'?gunzipSync(bytes,{maxOutputLength:512*1024}):bytes;
}
function text(s,policy) {
  let out='',at=0;
  while(at<s.length) {
    let size=0;
    for(const term of policy.literals) if(term.length>size&&s.startsWith(term,at)) size=term.length;
    out+=size?'[REDACTED]':s[at]; at+=size||1;
  }
  return out;
}
function json(v,p,k) {
  if(typeof v==='string') return p.fields.includes(k)?'[REDACTED]':text(v,p);
  if(Array.isArray(v)) return v.map(x=>json(x,p));
  if(v&&typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,json(x,p,k)]));
  return v;
}
function message(before,after,p) {
  const immutable=m=>{const {subject,headers,parts,...rest}=m;return rest;};
  if(!equal(immutable(before),immutable(after))||after.subject!==text(before.subject,p)||
    after.headers.length!==before.headers.length||after.parts.length!==before.parts.length) return false;
  for(let i=0;i<before.headers.length;i++) {
    const h=before.headers[i]; if(!equal(after.headers[i],{...h,value:text(h.value,p)})) return false;
  }
  for(let i=0;i<before.parts.length;i++) {
    const b=before.parts[i],a=after.parts[i];
    const metadata=part=>{const {data,name,...rest}=part;return rest;};
    if(!equal(metadata(b),metadata(a))||a.name!==text(b.name,p)) return false;
    const raw=decode(b),output=decode(a);
    if(b.media==='application/octet-stream') {if(!raw.equals(output))return false;}
    else if(b.media==='message/support+json') {if(!message(JSON.parse(raw),JSON.parse(output),p))return false;}
    else if(b.media==='application/json') {if(!equal(json(JSON.parse(raw),p),JSON.parse(output)))return false;}
    else if(output.toString('utf8')!==text(raw.toString('utf8'),p)) return false;
  }
  return true;
}
export function check(c) {
  const source=new Map(c.tickets.map(t=>[t.id,t])),seen=new Set();
  const rows=c.observations.filter(o=>o.method==='publish'&&o.value?.stored===true).map(o=>o.request);
  if(rows.length!==c.view.ticketIds.length) return false;
  for(const row of rows) {
    if(!c.view.ticketIds.includes(row.id)||seen.has(row.id)||!source.has(row.id)) return false;
    seen.add(row.id);
    if(!message(source.get(row.id),JSON.parse(Buffer.from(row.data,'base64')),c.view.policy)) return false;
  }
  return c.view.ticketIds.every(id=>seen.has(id));
}
export const run=({cases})=>verdicts(cases,check);
