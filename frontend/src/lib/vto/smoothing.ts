/** Frame-rate independent-ish exponential smoothing helpers. */

export function lerp(previous: number, next: number, factor: number): number {
  return previous + (next - previous) * factor;
}

/** Lerp an angle in radians along the shortest arc, so ±180° never flips. */
export function lerpAngle(previous: number, next: number, factor: number): number {
  let delta = next - previous;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return previous + delta * factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rolling average used for the FPS readout in debug mode. */
export class RollingAverage {
  private samples: number[] = [];
  private readonly capacity: number;

  constructor(capacity = 30) {
    this.capacity = capacity;
  }

  push(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  get value(): number {
    if (this.samples.length === 0) return 0;
    let total = 0;
    for (const sample of this.samples) total += sample;
    return total / this.samples.length;
  }
}
