# Release-validator interface
Export run({cases}) from checker.mjs. Each {token,cells} is one candidate; accept
exactly when every cell satisfies SEMANTICS.md. Helpers may be shared with the service.
Reasons are optional diagnostics and do not affect grading.

Cells contain view:{jobs}, the original ordered deliveries, and actual:
{authorizations,decisions,effects,finished}. Authorizations are accepted admissions,
including superseded pending ones. Decisions have authorizationId and terminal outcome.
Effects contain jobId, principal, resource, action, payload, decisionId,
authorizationId and revision. finished contains deliveryId,jobId,decisionId.
boundaries contains raw {kind:"admission"|"dispatch",id,policy} snapshots; id names
the authorization. These are policy facts, not derived permission answers.
observations are ordered {seq,method,request,value} calls; interrupted:true indicates
a lost response. interruptions and reports are execution metadata/diagnostics.

Return {verdicts:{[token]:{ok:boolean,reasons?:string[]}}}, exactly one per token.
Inputs must not be mutated. Verdicts must be deterministic. Two invocations share
a combined 60-second budget with at least one CPU and 1 GiB. Node 24 built-ins and
submitted helper modules are available; service APIs and network are unavailable.
