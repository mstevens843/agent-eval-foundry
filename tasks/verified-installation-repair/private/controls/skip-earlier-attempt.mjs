import {existsSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {install} from "./src/install.mjs";
import {retainContent} from "./src/persisted-content.mjs";
export const subject={async run(v,api){
 const path=join(v.storage,"first-attempt.json"),cached=retainContent(v,api);
 if(!existsSync(path)&&v.descriptors[0]?.url==="repo/alpha") {
   for(const d of v.descriptors) await cached.fetch({url:d.url,digest:d.digest});
   writeFileSync(path,"true");return {}; // BUG: a required invocation returns without finishing.
 }
 return install(v,cached);
}};
