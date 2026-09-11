import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {join} from "node:path";
// Keep the rest of a multi-delivery control correct even if later sources disappear.
export function retainContent(v,api) {
  return {...api,fetch:async request=> {
    const path=join(v.storage,"blob-"+request.digest+".json"),response=await api.fetch(request);
    if(response) {writeFileSync(path,JSON.stringify(response));return response;}
    return existsSync(path)?JSON.parse(readFileSync(path,"utf8")):null;
  }};
}
