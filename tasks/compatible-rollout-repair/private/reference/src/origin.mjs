import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export function origin(view,api) {
 const path=join(view.storage,'origins.json');
 const entries=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];
 const existing=entries.find(x=>x.job===view.job);
 if(existing) return existing;
 const record={job:view.job,services:api.inventory({}),stages:api.stages({})};
 entries.push(record);writeFileSync(path+'.tmp',JSON.stringify(entries));renameSync(path+'.tmp',path);
 return record;
}
