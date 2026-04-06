import type { Locale } from './i18n/messages'

const STORAGE_KEY = 'incense-timer-settings-v1'

export type TimerSettings = {
  stickCount: number
  durationMinutes: number
  locale: Locale
}

export const DEFAULTS: TimerSettings = {
  stickCount: 3,
  durationMinutes: 5,
  locale: 'en',
}

const DURATION_MAX = 30

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function parseLocale(v: unknown): Locale {
  return v === 'th' || v === 'en' ? v : DEFAULTS.locale
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
        DURATION_MAX,
      ),
      locale: parseLocale(parsed.locale),
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
        durationMinutes: clamp(s.durationMinutes, 1, DURATION_MAX),
        locale: parseLocale(s.locale),
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}
