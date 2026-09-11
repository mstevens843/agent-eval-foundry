export const html = `<!doctype html><html><head><meta charset="utf-8"><title>Meridian Records</title>
<style>body{font:16px system-ui;max-width:900px;margin:40px auto;background:#f6f7fb;color:#18233b}header,section,dialog{padding:20px;background:white;border:1px solid #d6dce8;border-radius:8px;margin:12px 0}input{padding:8px;margin:8px}button{padding:8px 16px;cursor:pointer}small{display:block;color:#52627d}#dialogs article{padding:12px;border:1px solid #acb7ca}</style>
</head><body><header><h1>Meridian Records</h1><p id="location"></p><button id="renew">Renew session</button><button id="advance">Advance background work</button></header><main></main><div id="dialogs"></div><pre id="notice"></pre>
<script>
window.rpc=async(path,data)=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});return r.json()};
window.refresh=async()=>{
 const s=await (await fetch('/facts?path='+encodeURIComponent(location.pathname))).json();window.facts=s;
 document.querySelector('#location').textContent=location.pathname+' · session '+s.session+' · '+(s.authenticated?'active':'expired');
 document.querySelector('main').replaceChildren();document.querySelector('#dialogs').replaceChildren();
 if(!s.authenticated){document.querySelector('main').textContent='Session expired. Renew to edit records.';return;}
 for(const f of s.forms){
  const el=document.createElement('section');
  for(const k of ['operationId','entity','field','generation','selector'])el.dataset[k]=String(f[k]);
  const title=document.createElement('h2');title.textContent=f.entity;
  const meta=document.createElement('small');meta.textContent='Operation '+f.operationId;
  const label=document.createElement('label');label.textContent=f.field;
  const input=document.createElement('input');input.setAttribute('aria-label',f.field);input.value='';
  const button=document.createElement('button');button.textContent='Save';button.disabled=!f.ready;
  button.onclick=async()=>{const result=await window.rpc('/submit',{operationId:f.operationId,entity:f.entity,field:f.field,value:input.value,session:s.session,generation:f.generation});window.lastResult=result;document.querySelector('#notice').textContent=JSON.stringify(result);await window.refresh();};
  label.append(input);el.append(title,meta,label,button);document.querySelector('main').append(el);
 }
 for(const d of s.dialogs){
  const el=document.createElement('article');el.dataset.dialogId=d.id;
  const text=document.createElement('p');text.textContent='Confirm '+d.operationId+' · '+d.entity+' / '+d.field+' = '+d.value;
  const button=document.createElement('button');button.textContent='Confirm';
  button.onclick=async()=>{window.lastResult=await window.rpc('/confirm',{id:d.id,operationId:d.operationId,session:s.session});await window.refresh();};
  el.append(text,button);document.querySelector('#dialogs').append(el);
 }
};
window.describe=el=>({connected:el.isConnected,operationId:el.dataset.operationId,entity:el.dataset.entity,field:el.dataset.field,generation:Number(el.dataset.generation),ready:!el.querySelector('button').disabled,value:el.querySelector('input').value,session:window.facts.session});
window.submitIf=async(el,expected)=>{
 const actual=window.describe(el);
 if(!actual.connected||!actual.ready||['operationId','entity','field','value','generation','session'].some(k=>actual[k]!==expected[k]))return {ok:false,code:'STALE'};
 // Predicate and dispatch share one JS turn; no await opens a check-then-act gap.
 await el.querySelector('button').onclick();return window.lastResult;
};
document.querySelector('#renew').onclick=async()=>{await window.rpc('/renew',{});await window.refresh();};
document.querySelector('#advance').onclick=async()=>{await window.rpc('/advance',{});await window.refresh();};
window.ready=window.refresh();
</script></body></html>`;
