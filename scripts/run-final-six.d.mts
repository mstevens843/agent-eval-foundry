export function canReachFive(failures: number, scored: number): boolean;
export function validateSchedule(plan: unknown): {
  packages: { id: string; target: string; failures: number; scored: number; remaining: number }[];
};
