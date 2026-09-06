# Repair the compatibility-aware rollout controller

The controller stages model-service releases and publishes deployment aliases and
consumer caches. Its happy-path test passes, but mixed consumer fleets and failed
canaries can leave bindings inconsistent. Repair the application under `src/`.
Preserve the interface in `SEMANTICS.md`; the model names here are fictional.

Run `node --test test/*.test.mjs` and add whatever local checks you need. The driver
owns actual deployment, telemetry, alias and cache state. Your reports are compared
with those observations. The whole requested fleet must converge while unrelated
services retain their state. Distinct correct rollout strategies are accepted.
