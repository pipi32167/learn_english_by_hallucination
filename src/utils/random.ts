
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// eslint-disable-next-line  @typescript-eslint/no-unused-vars
export function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}