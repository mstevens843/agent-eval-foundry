# Release-validator interface
Export run({cases}) from checker.mjs; each {token,cells} is one candidate.
Return {verdicts:{[token]:{ok:boolean,reasons?:string[]}}}. Accept exactly when all
cells satisfy SEMANTICS.md. Reasons are diagnostic only; helpers may be shared.
Deterministic, nonmutating; two runs share60 seconds, >=1 CPU/1 GiB, Node24 built-ins,
no network or service APIs.

input contains initial externalBookings and ordered deliveries:{id,updates,
concurrentBooking?}. A scheduled concurrentBooking arrives only when the first
publish boundary is reached. actual is the final persistent State. publications
contains every successful generation with deliveryId. prefixes contains State plus
deliveryId after each completed delivery. acks contains one {deliveryId,generation}
summary per acknowledged delivery, naming its latest successfully acknowledged
generation. The full ordered acknowledgement-call history remains in observations.
observations are {seq,method,request,value,interrupted?}; interruptions and reports
are execution diagnostics. No expected materialization or correctness labels are supplied.
