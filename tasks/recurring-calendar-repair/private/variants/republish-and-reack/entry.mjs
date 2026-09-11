import {run} from './src/service.mjs';
export const subject={async run(v,a){
  for(const records of [[null],[{kind:'not-a-record-kind',id:'x',revision:1,value:null}]]){
    const result=await a.publish({baseGeneration:0,records,events:[],bookings:[]});
    if(result.error!=='shape')throw Error('malformed publication did not return a recoverable shape error');
  }
  return run(v,{...a,publish:r=>a.publish({...r,events:r.events.map(e=>({...e,attendees:[...e.attendees].reverse()}))}),ack:async r=>{await a.ack(r);return a.ack(r)}})
}};
