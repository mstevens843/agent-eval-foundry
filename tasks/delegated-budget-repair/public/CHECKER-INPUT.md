# Release-validator interface
Export run({cases}) from checker.mjs. Each {token,cells} describes one candidate.
Accept iff every cell satisfies SEMANTICS.md. Shared helper modules are permitted.
Return {verdicts:{[token]:{ok:boolean,reasons?:string[]}}}, one verdict per token.
Reasons are diagnostic only. Deterministic, nonmutating; two runs share 60 seconds,
at least one CPU/1 GiB; Node 24 built-ins, no service APIs or network.

Each cell has input:{wallets,reservations,settlements,jobs}. Jobs include raw grants,
requests and race term updates. actual is the final Snapshot. decisions is the
durable terminal command ledger. mutations:[{job,request,revision,before,decision}]
records accepted conditional decisions and the raw authority snapshot before them;
these snapshots contain no eligibility answer. prefixes:[{job,state,decisions}]
records state after every completed job. reports contains actual returned summaries.
observations:{seq,method,request,value,interrupted?}[] and interruptions record actual
calls and lost responses. Judge state, ordered allocation, payloads and reports;
corrected API errors, polling and idempotent retries are legal.
