import { run } from './src/service.mjs';
export const subject={run(view,api) {
  const wrapped={...api,fetch:async request=>{
    const response=await api.fetch(request);
    return request.table==='credits'&&response.rows?.length===0?{...response,next:null}:response;
  }};
  return run(view,wrapped);
}};
