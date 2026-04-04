/** Parallel burn: one shared timeline, progress 0 → 1 over durationMs. */
export class BurnTimer {
  private accumulatedMs = 0
  private segmentStart = 0
  private _running = false
  private durationMs: number

  constructor(durationMinutes: number) {
    this.durationMs = Math.max(60_000, durationMinutes * 60_000)
  }

  get totalMs(): number {
    return this.durationMs
  }

  setDurationMinutes(minutes: number): void {
    this.durationMs = Math.max(60_000, minutes * 60_000)
    if (this.progress >= 1) {
      this.accumulatedMs = 0
      this._running = false
    }
  }

  get running(): boolean {
    return this._running
  }

  start(): void {
    if (this.progress >= 1) {
      this.accumulatedMs = 0
    }
    this.segmentStart = performance.now()
    this._running = true
  }

  pause(): void {
    if (!this._running) return
    this.accumulatedMs += performance.now() - this.segmentStart
    this._running = false
  }

  resume(): void {
    if (this._running || this.progress >= 1) return
    this.segmentStart = performance.now()
    this._running = true
  }

  restart(): void {
    this._running = false
    this.accumulatedMs = 0
  }

  /** Call each frame while running to snap to done. */
  tick(): void {
    if (!this._running) return
    if (this.elapsedMs >= this.durationMs) {
      this.accumulatedMs = this.durationMs
      this._running = false
    }
  }

  private get elapsedMs(): number {
    if (!this._running) return this.accumulatedMs
    return this.accumulatedMs + (performance.now() - this.segmentStart)
  }

  get progress(): number {
    return Math.min(1, this.elapsedMs / this.durationMs)
  }

  get remainingMs(): number {
    return Math.max(0, this.durationMs - this.elapsedMs)
  }
}

export type UiPhase = 'idle' | 'running' | 'paused' | 'done'

export function phaseFromTimer(t: BurnTimer): UiPhase {
  if (t.progress >= 1) return 'done'
  if (t.running) return 'running'
  if (t.progress > 0) return 'paused'
  return 'idle'
}
