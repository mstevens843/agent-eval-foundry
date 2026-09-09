export type Lineage = {id: string; revision: number}[];
export type Revision = {id: string; revision: number; kind: 'source'; value: string; authority: 'approved'|'external'; retracted: boolean} | {id: string; revision: number; kind: 'derived'; parents: string[]; separator: string};
export interface Publication { id: string; destination: string; value: string; lineage: Lineage }
export interface View { storage: string; job: number; updates: Revision[]; requests: {id: string; root: string; destination: string; grantVersion: number}[]; grants: {destination: string; version: number; allowed: boolean}[] }
export interface Api { publish(value: Publication): Publication; receipts(request: {}): Publication[] }
