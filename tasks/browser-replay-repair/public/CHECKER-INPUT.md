# Release-validator interface
Export run({cases}) from checker.mjs; each {token,cells} describes one candidate.
Return {verdicts:{[token]:{ok:boolean,reasons?:string[]}}}, one per token; accept iff
every cell satisfies SEMANTICS.md. Reasons are diagnostic only. Helpers may be shared.
Deterministic and nonmutating; two invocations share60 seconds,>=1 CPU/1 GiB.
Node24 built-ins and submission modules are available, no service APIs or network.

Each cell has input:{traceId,events,attempts,confirmation}; effects are actual committed
{operationId,entity,field,value,confirmation:null|{id,operationId}} records in order.
actions contains actual accepted UI submissions/confirmations and their business
payloads, session and (for submissions) generation. No observe-call requirement is
graded: the real UI conditional precondition handles stale state.
perAttempt is the committed-effect snapshot at each completed attempt, and reports
are actual returned summaries. server contains raw actual operations/session/render
state. observations are ordered {seq,method,request,value,interrupted?} calls.
interruptions and page serialization are factual diagnostics. Browser ZIP artifacts
remain verifier-only and contain no expected verdict. No expected results are supplied.
