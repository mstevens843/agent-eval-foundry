export interface Node {
  id: string;
  request: {
    units: number;
    tags: string[];
    minZones: number;
    antiWith: string[];
    shareZoneWith: string | null;
  };
  children: Node[];
}
export interface View {
  resources: { id: string; tags: string[]; zone: string; capacity: number; used: number }[];
  tree: Node;
  storage: string;
}
export interface Api {
  next(x: {}): Promise<string | null>;
  place(x: { node: string; resources: string[] }): Promise<{ stored: true } | { error: string }>;
}
