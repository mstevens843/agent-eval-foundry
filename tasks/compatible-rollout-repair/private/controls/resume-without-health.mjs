import { rollout } from './src/controller.mjs';
export const subject={async run(view,api) {
  const inventory=await api.inventory({});
  for(const request of view.requests) {
    const state=inventory.find(s=>s.id===request.service);
    if(state.deployment.release!==state.alias.release) {
      await api.bind({service:state.id,...state.deployment});
      await api.warm({service:state.id,release:state.deployment.release,abi:state.abi});
    }
  }
  return await rollout(view,api);
}};
