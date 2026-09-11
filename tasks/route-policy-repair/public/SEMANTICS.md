# Aster to flat deployment migration — successor 3.0

view has config {egresses:Record<egress,policy>,policies:Record<name,Policy>}, request,
and storage. A Policy is {terms:Term[],fallback:Action}. A Term is {match,action}.
match is {prefix?,ge?,le?,communities?}; empty match means all.
prefix is canonical IPv4 CIDR. A route prefix matches when it is wholly contained in that
CIDR and its prefix length is between ge and le inclusive. Defaults are the match CIDR's
length and 32. No prefix means 0.0.0.0/0. communities is an optional array of strings,
ALL of which must be present. Matching uses the CURRENT route communities.

Action is {kind:"accept"|"reject"|"continue"|"return"|"call",policy?,preference?,add?,remove?}.
First set preference if present, remove listed communities, then
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

## Destination: flat-v1
Publish {config:{format:"flat-v1",egresses:Record<string,Rule[]>}}. Each egress has an
ordered flat rule array. Rule is {when:{all:Match[],none:Match[]},action:{decision,
preference?,add:string[],remove:string[]}}. Matches have the source Match schema
but ALL inspect ORIGINAL input. A rule matches iff every all predicate matches and
no none predicate matches. The first matching rule is terminal. Its action removes
then adds communities, and optionally replaces preference, all against original input.
If no rule matches, reject with original preference and sorted unique communities.
There are no calls, returns, intermediate mutations or source-policy objects in a
deployment. Public target.mjs is the exact destination evaluator and shape validator.
No particular compilation algorithm or internal graph representation is required.

The deployment supports at most512 total rules,4096 predicate atoms across all/none,
6 egresses and48 KiB UTF-8 JSON for {config}. add/remove and Match communities have
at most12 registered strings each. The community registry is the set of identifiers
appearing anywhere in the source config or request, at most12 distinct strings.
Target predicates/edits may only use registered identifiers. Input routes may contain
other community strings; those still have to be preserved. All source instances are
guaranteed representable within these combined capacities, including serialization.
Source bounds:8 policies,8 terms/policy,depth5,6 egresses,4096 executed actions/route.
IPv4 prefixes are canonical; preferences integers0–1000; input community sets <=12.
List strings have <=64 characters. Source policies/requests are valid.

api.publish({config}) atomically deploys a valid target with exactly the original
egress keys; returns {ok:true}, otherwise {ok:false,error:string}. Failed calls may
be corrected. Exactly one successful deployment; no further publish after success.
The task requires equivalence for ALL valid routes, not only supplied examples.
No published source graph, simulation result or returned claim counts as deployment.

Node 24 built-ins; storage writable;128 regular files/8 MiB/depth16.45 seconds/process,
4000 protocol frames,64 KiB/frame,16 MiB/channel. Provided views and compact correct
publications jointly fit48 KiB. Authoring internet is available; grading is offline.
