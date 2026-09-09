# Checker input and output contract

Submit `checker.mjs` exporting `run({cases})`. Each case is `{token,cells}`;
tokens are opaque. A case is correct only when every cell meets SEMANTICS.md.
Node built-ins and submitted helper modules are available; network access is disabled.

Each cell is one independent execution across one or more jobs:

- `input`: original `services`, release catalog `releases`, and pre-existing `stages`.
- `runs`: one entry per completed job, containing `job`, `requests`, job-entry
  services as `[id,service]` pairs in `entry`, final pairs in `state`, remaining
  `stages`, recorded `report`, and that job's ordered `observations`.
- `observations`: all ordered API interactions `{seq,method,request,value}`.
  A committed operation whose response was lost has `interrupted:true`.
- `interruptions`: recorded process interruption boundaries `{job,method,seq}`.
- `state`, `stages`: final external state. `actions` contains stage/bind history.
- `reports`: returned service reports, to be judged against the external facts.

An observation records the actual effect and response, including effects whose
response was lost. Reports are required output, not evidence that their claims are
true. No expected rollout plan, private legality annotations or grading verdicts
are supplied. Unknown metadata can be ignored.

Return `{verdicts:{[token]:{ok:boolean,reasons?:string[]}}}` for every case.
Reasons are optional diagnostics and their wording is not graded. Accept correct
alternative strategies. Do not mutate inputs. Two calls in the same process must
return identical outputs. Both calls share 60 seconds, one CPU and 1 GiB memory.
Both the service and independent validator must pass for overall reward one.
