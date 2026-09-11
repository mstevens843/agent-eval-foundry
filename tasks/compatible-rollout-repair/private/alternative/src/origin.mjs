import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
export async function origin(view,api) {
 const path=join(view.storage,'job-'+Buffer.from(JSON.stringify(view.job)).toString('hex')+'.json');
 if(existsSync(path)) return JSON.parse(readFileSync(path,'utf8'));
 const record={services:await api.inventory({}),stages:await api.stages({})};
 writeFileSync(path,JSON.stringify(record),{flag:'wx'});return record;
}
