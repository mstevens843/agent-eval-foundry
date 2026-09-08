export type Node = { kind: "dir"; mode: number } | { kind: "file"; mode: number; data: string };
export type Descriptor = { url: string; digest: string; size: number; plainDigest: string };
export type View = {
  release: string;
  descriptors: Descriptor[];
  initial: Record<string, Node>;
  storage: string;
};
export type Ack = { ok: true } | { ok: false; error: string };
export interface API {
  cache(x: { url: string }): Promise<{ bytes: string } | null>;
  fetch(x: { url: string; digest: string }): Promise<{ bytes: string } | null>;
  list(x: {}): Promise<Record<string, Node>>;
  remove(x: { path: string }): Promise<Ack>;
  write(x: { path: string; entry: Node }): Promise<Ack>;
  finish(x: { status: "installed" | "unavailable"; digests: string[] }): Promise<Ack>;
}
