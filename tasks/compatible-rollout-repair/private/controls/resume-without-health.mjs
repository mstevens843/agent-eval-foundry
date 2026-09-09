import { rollout } from './src/controller.mjs';
export const subject={run(view,api) {
  const inventory=api.inventory({});
  for(const request of view.requests) {
    const state=inventory.find(s=>s.id===request.service);
    if(state.deployment.release!==state.alias.release) {
      api.bind({service:state.id,...state.deployment});
      api.warm({service:state.id,release:state.deployment.release,abi:state.abi});
    }
  }
  return rollout(view,api);
}};
