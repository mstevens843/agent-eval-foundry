# Aster routing language v1

view has config {egresses:Record<egress,policy>,policies:Record<name,Policy>}, request,
and storage. A Policy is {terms:Term[],fallback:Action}. A Term is {match,action}.
match is {prefix?,ge?,le?,communities?}; empty match means all.
prefix is canonical IPv4 CIDR. A route prefix matches when it is wholly contained in that
CIDR and its prefix length is between ge and le inclusive. Defaults are the match CIDR's
length and 32. No prefix means 0.0.0.0/0. communities is an optional array of strings,
ALL of which must be present. Matching uses the CURRENT route communities.

Action is {kind:"accept"|"reject"|"continue"|"return"|"call",policy?,preference?,add?,remove?}.
First set preference if present (zero is a valid value), remove listed communities, then
add listed communities, deduplicating. accept/reject ends the entire evaluation.
continue advances to the next term. call invokes the named policy; its accept/reject is
terminal, its return resumes the caller's next term. return goes back to the caller.
If no remaining term matches, apply fallback. fallback continue or return returns.
A return from an egress top level means reject. Configurations have no call cycles.
An input route is {prefix,preference,communities}; output is
{decision:"accept"|"reject",preference,communities:sortedUniqueStrings}.

request is {egresses:string[],match:Match,preference:number}. For each requested egress,
every route matching request.match on its ORIGINAL input and accepted by the ORIGINAL
configuration must finish accepted with request.preference. All its other output
attributes must equal the original output. Every rejected route and every route outside
that original-input scope must have exactly its original decision and attributes.
Nonrequested egresses must retain all behavior even if they share policy nodes.
These requirements apply to all valid routes, not just visible test examples.

api.publish({config}) replaces the configuration once; returns {ok:true}, or
{ok:false,error:string} for malformed, cyclic or oversized configurations. Failed publish
does not change configuration. After success no more changes. Return values and simulations
alone do not count. The authority independently evaluates the resulting policy.
At most 8 original policies, 8 terms per policy, call depth 5, 6 egresses. Published config
may contain at most 128 policies and 1024 terms, depth 16. Preferences are integers 0–1000.
Routes have canonical prefix length 0–32 and at most 12 distinct communities. All input
policies and requests are valid. You may clone, inline, or reorganize policies; no particular
edit or policy name is required. The execution envelope is 4000 API calls and 45 seconds.
Each route evaluation must finish within 4096 executed actions; exceeding that deterministic
bound is a configuration work failure. The verifier does not rely on wall-time timing.
