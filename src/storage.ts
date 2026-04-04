const STORAGE_KEY = 'incense-timer-settings-v1'

export type TimerSettings = {
  stickCount: number
  durationMinutes: number
}

const DEFAULTS: TimerSettings = {
  stickCount: 3,
  durationMinutes: 15,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<TimerSettings>
    return {
      stickCount: clamp(
        Number(parsed.stickCount) || DEFAULTS.stickCount,
        1,
        12,
      ),
      durationMinutes: clamp(
        Number(parsed.durationMinutes) || DEFAULTS.durationMinutes,
        1,
        180,
      ),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: TimerSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stickCount: clamp(s.stickCount, 1, 12),
        durationMinutes: clamp(s.durationMinutes, 1, 180),
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}
