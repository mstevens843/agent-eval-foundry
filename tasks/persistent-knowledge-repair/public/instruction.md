Implement the service in /work/task and its independent execution checker.

SEMANTICS.md defines the required behavior; api.d.ts defines the service interface.
entry.mjs must export subject.run(view, api). Implement the required effects through
the supplied API. The writable storage directory is provided at execution time.

checker.mjs must export run({cases}) as defined in CHECKER-INPUT.md. Both deliverables
are required. You may add helper modules and tests; Node built-ins are available.
