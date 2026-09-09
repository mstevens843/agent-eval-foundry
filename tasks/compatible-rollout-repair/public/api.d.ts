export interface Deployment { release: string; generation: number }
export interface Service {
  id: string; abi: string; deployment: Deployment; alias: Deployment;
  cache: { release: string; abi: string };
}
export interface Release { id: string; model: string; abi: string; rank: number }
export interface Stage extends Deployment { id: string; service: string }
export interface Sample extends Deployment { service: string; ok: boolean; sequence: number }
export interface View { job: number; storage: string; requests: {service: string; model: string}[] }
export interface API {
  inventory(request: {}): Service[];
  catalog(request: {model: string}): Release[];
  stage(request: {service: string; release: string}): Deployment;
  telemetry(request: {service: string}): Sample[];
  bind(request: Deployment & {service: string}): {ok: true};
  warm(request: {service: string; release: string; abi: string}): {ok: true};
  stages(request: {}): Stage[];
  cleanup(request: {id: string}): {ok: true};
}
export interface Subject {
  run(view: View, api: API): {job: number; results: {service: string; status: 'deployed'|'rolled-back'|'unavailable'; release: string}[]};
}
