import { coordinate } from "./src/coordinator.mjs";
export const subject={ run(v,api) { return coordinate({...v,dependencies:[]},{...api,maintain:async x=> {await api.maintain(x);return {ok:true};}}); } };
