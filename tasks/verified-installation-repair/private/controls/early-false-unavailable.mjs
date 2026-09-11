import {existsSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {install} from "./src/install.mjs";
import {retainContent} from "./src/persisted-content.mjs";
export const subject={async run(v,api){
 const path=join(v.storage,"first-attempt.json"),first=!existsSync(path)&&v.descriptors[0]?.url==="repo/alpha";
 const cached=retainContent(v,api);
 return install(v,{...cached,finish:request=> {
   if(first) {writeFileSync(path,"true");return api.finish({status:"unavailable",digests:[]});}
   return api.finish(request);
 }});
}};
