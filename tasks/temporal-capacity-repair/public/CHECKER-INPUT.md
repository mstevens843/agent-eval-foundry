# Checker input and output contract

Export run({cases}) from checker.mjs. It may be async and import submitted helper
modules and Node built-ins. Service APIs and network access are unavailable.
Each case is {token,cells}; each cell is one complete independent execution.
A candidate is correct only if every cell satisfies SEMANTICS.md.
Tokens and scenario IDs are opaque identifiers. Observations are ordered
{seq,method,request,value} host records. Reports contain untrusted diagnostics.

- publicInput: original {queries,records}, including records never fetched.
- writes: persisted report requests {id,total}, in call order.
- observations: fetch/record calls and actual responses.

Return {verdicts:{[token]:{ok:boolean,reasons?:string[]}}} for every token.
Reasons are optional diagnostics and are not graded. Correct alternative algorithms,
object-key ordering and diagnostic reports are permitted. Judge cases independently.
The runner calls run twice on the same input in one process; return deterministic
results without mutating inputs. Both calls share 60 seconds, one CPU and 1 GiB.
Missing, malformed or nondeterministic output fails the checker deliverable.
Both the service and checker must pass.
