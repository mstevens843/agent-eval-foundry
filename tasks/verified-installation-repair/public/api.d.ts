export type Node = { kind: "dir"; mode: number } | { kind: "file"; mode: number; data: string };
export type Descriptor = { url: string; digest: string; size: number; plainDigest: string };
export type View = {
  release: string;
  descriptors: Descriptor[];
  initial: Record<string, Node>;
  storage: string;
};
export type Ack = { ok: true } | { ok: false; error: string };
export type Status = { active: string | null; staged: string | null };
export interface API {
  cache(x: { url: string }): Promise<{ bytes: string } | null>;
  fetch(x: { url: string; digest: string }): Promise<{ bytes: string } | null>;
  list(x: {}): Promise<Record<string, Node>>;
  // Durable state of view.storage's installation line, independent of what THIS invocation has
  // done so far. `active` is the release currently exposed (from the last successful, landed
  // "installed" finish for this line), or null if none ever landed. `staged` is the release id
  // of durable staged content left by a PRIOR interrupted attempt that was never activated or
  // discarded, or null if there is none outstanding.
  status(x: {}): Promise<Status>;
  remove(x: { path: string }): Promise<Ack>;
  write(x: { path: string; entry: Node }): Promise<Ack>;
  finish(x: { status: "installed" | "unavailable"; digests: string[] }): Promise<Ack>;
}
