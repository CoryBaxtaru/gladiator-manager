// Small seedless RNG helpers (Math.random wrappers kept in one place for testability/tuning).

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = randInt(0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}
