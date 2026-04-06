import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Timer,
} from 'lucide-react'
import { BurnTimer, phaseFromTimer, type UiPhase } from './burn-timer'
import { DEFAULTS, loadSettings, saveSettings } from './storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const DURATION_SLIDER_MAX = 30
/** Matches `.stick { width }` in incense.css */
const STICK_VISUAL_WIDTH_PX = 52

/**
 * Preferred space between stick centers (px) from count: fewer sticks → wider; more → tighter.
 * Layout may reduce this (including overlap via negative trim) to fit the row — stick width stays 52px.
 */
function sticksGapPxForCount(n: number): number {
  if (n <= 1) return 22
  const maxGap = 32
  const minGap = 2
  const t = (n - 2) / (12 - 2)
  return Math.round(maxGap + t * (minGap - maxGap))
}

/** Deterministic 0..1 pseudo-random from index (stable across re-renders). */
function hash01(i: number, salt: number): number {
  const x = Math.imul(i ^ salt, 2654435761) >>> 0
  return (x % 1000000) / 1000000
}

function smokeTimingForStickIndex(i: number) {
  const r1 = hash01(i, 0x51ec)
  const r2 = hash01(i, 0xa17e)
  const r3 = hash01(i, 0xc0de)
  const r4 = hash01(i, 0xbeef)
  return {
    delayA: r1 * 2.8,
    durA: 2.2 + r2 * 1.2,
    delayB: r3 * 3.4,
    durB: 2.8 + r4 * 1.4,
  }
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StickVisualization({
  count,
  progress,
  burning,
}: {
  count: number
  progress: number
  burning: boolean
}) {
  const p = Math.min(1, Math.max(0, progress))
  const unburnt = 1 - p
  const c = Number(count)
  const n = Math.min(
    12,
    Math.max(1, Number.isFinite(c) ? Math.floor(c) : 1),
  )
  const preferredGapPx = sticksGapPxForCount(n)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidthPx, setRowWidthPx] = useState(0)

  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setRowWidthPx(w)
    })
    ro.observe(el)
    setRowWidthPx(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  let jointSpacingPx = n <= 1 ? 0 : preferredGapPx
  if (n > 1 && rowWidthPx > 0) {
    const fitJointPx = Math.floor(
      (rowWidthPx - n * STICK_VISUAL_WIDTH_PX) / (n - 1),
    )
    jointSpacingPx = Math.min(preferredGapPx, fitJointPx)
  }

  const sticksStyle = {
    '--sticks-gap': `${Math.max(0, jointSpacingPx)}px`,
    '--sticks-slot-trim': `${Math.min(0, jointSpacingPx)}px`,
  } as CSSProperties

  const smokeTimings = useMemo(
    () => Array.from({ length: n }, (_, i) => smokeTimingForStickIndex(i)),
    [n],
  )

  const sticksRow = (
    <div className="sticks" role="presentation" style={sticksStyle}>
      {Array.from({ length: n }, (_, i) => {
        const sm = smokeTimings[i]!
        const smokeAStyle = {
          '--smoke-delay': `${sm.delayA}s`,
          '--smoke-duration': `${sm.durA}s`,
        } as CSSProperties
        const smokeBStyle = {
          '--smoke-delay': `${sm.delayB}s`,
          '--smoke-duration': `${sm.durB}s`,
        } as CSSProperties
        return (
        <div key={i} className="stick-slot">
          <div className="stick">
            <div className="stick__clip">
              <div className="stick__column">
                <div className="stick__burn-zone">
                  <div
                    className={`stick__body ${burning && p > 0 && p < 1 ? 'stick__body--burning' : ''}`}
                    style={{ '--unburnt': String(unburnt) } as CSSProperties}
                  >
                    <div
                      className="stick__smoke stick__smoke--a"
                      style={smokeAStyle}
                      aria-hidden
                    />
                    <div
                      className="stick__smoke stick__smoke--b"
                      style={smokeBStyle}
                      aria-hidden
                    />
                    <div className="stick__ember" aria-hidden />
                  </div>
                </div>
                <div className="stick__handle" aria-hidden />
              </div>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )

  return (
    <div
      ref={rowRef}
      className="flex h-full min-h-0 w-full min-w-0 max-w-full justify-center"
    >
      {sticksRow}
    </div>
  )
}

type Tab = 'flow' | 'config'

export default function App() {
  const initial = loadSettings()
  const [tab, setTab] = useState<Tab>('flow')
  const [stickCount, setStickCount] = useState(initial.stickCount)
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes)
  const timerRef = useRef(new BurnTimer(initial.durationMinutes))
  const rafRef = useRef(0)
  const [, tick] = useReducer((n) => n + 1, 0)

  const syncDuration = useCallback(() => {
    timerRef.current.setDurationMinutes(durationMinutes)
  }, [durationMinutes])

  useEffect(() => {
    syncDuration()
  }, [syncDuration])

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
  }, [])

  const loop = useCallback(() => {
    timerRef.current.tick()
    tick()
    const t = timerRef.current
    if (t.running && t.progress < 1) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [])

  const startLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  useEffect(() => () => stopLoop(), [stopLoop])

  const timer = timerRef.current
  const phase: UiPhase = phaseFromTimer(timer)
  const p = timer.progress
  const burning = phase === 'running'
  const activeSession = phase === 'running' || phase === 'paused'

  const resetSessionIfActive = useCallback(() => {
    const t = timerRef.current
    const ph = phaseFromTimer(t)
    if (ph !== 'running' && ph !== 'paused') return
    stopLoop()
    t.restart()
    t.setDurationMinutes(durationMinutes)
    tick()
  }, [stopLoop, durationMinutes, tick])

  const persist = useCallback(() => {
    saveSettings({
      stickCount,
      durationMinutes,
    })
  }, [stickCount, durationMinutes])

  useEffect(() => {
    persist()
  }, [persist])

  const onStickChange = (v: number) => {
    if (v === stickCount) return
    resetSessionIfActive()
    setStickCount(v)
  }

  const onDurationChange = (v: number) => {
    if (v === durationMinutes) return
    resetSessionIfActive()
    setDurationMinutes(v)
    timerRef.current.setDurationMinutes(v)
    tick()
  }

  const onResetDefaults = () => {
    stopLoop()
    timerRef.current.restart()
    timerRef.current.setDurationMinutes(DEFAULTS.durationMinutes)
    setStickCount(DEFAULTS.stickCount)
    setDurationMinutes(DEFAULTS.durationMinutes)
    saveSettings({ ...DEFAULTS })
    tick()
  }

  const displayRemaining =
    phase === 'idle' && p === 0 ? formatMs(timer.totalMs) : formatMs(timer.remainingMs)

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <main
        className={cn(
          'mx-auto flex min-h-0 min-w-0 w-full max-w-md flex-1 flex-col overflow-hidden px-4',
          'pt-[calc(0.75rem+env(safe-area-inset-top,0px))]',
          'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        {tab === 'flow' && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-visible">
            <div
              className="relative z-10 shrink-0 space-y-5 pb-5 text-center [text-shadow:0_1px_2px_var(--background),0_0_12px_var(--background)] dark:[text-shadow:0_1px_3px_var(--background),0_0_14px_var(--background)]"
              aria-live="polite"
            >
              <div
                className={cn(
                  'grid gap-3',
                  activeSession ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                <ControlTile
                  label={
                    phase === 'done'
                      ? 'Reset'
                      : burning
                        ? 'Pause'
                        : phase === 'paused'
                          ? 'Resume'
                          : 'Start'
                  }
                  icon={
                    phase === 'done' ? (
                      <RotateCcw className="size-5" strokeWidth={1.75} />
                    ) : burning ? (
                      <Pause className="size-5" strokeWidth={1.75} />
                    ) : (
                      <Play className="size-5" strokeWidth={1.75} />
                    )
                  }
                  onClick={() => {
                    if (phase === 'done') {
                      stopLoop()
                      timerRef.current.restart()
                      syncDuration()
                      tick()
                      return
                    }
                    if (burning) {
                      timerRef.current.pause()
                      stopLoop()
                      tick()
                      return
                    }
                    if (phase === 'paused') {
                      timerRef.current.resume()
                      startLoop()
                      tick()
                      return
                    }
                    syncDuration()
                    timerRef.current.start()
                    startLoop()
                    tick()
                  }}
                />
                {activeSession && (
                  <ControlTile
                    label="Reset"
                    icon={<RotateCcw className="size-5" strokeWidth={1.75} />}
                    onClick={() => {
                      stopLoop()
                      timerRef.current.restart()
                      syncDuration()
                      tick()
                    }}
                  />
                )}
              </div>

              <div>
                <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground">
                  TIME REMAINING
                </p>
                <p className="mt-1 text-[2.75rem] font-light tabular-nums tracking-tight text-foreground">
                  {displayRemaining}
                </p>
              </div>
            </div>

            <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center overflow-x-clip overflow-y-visible">
              <StickVisualization count={stickCount} progress={p} burning={burning} />
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden pt-5">
            <div>
              <h2 className="text-[0.7rem] font-semibold tracking-[0.16em] text-foreground">
                TIMER SETTINGS
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Customize your digital incense session. Changes save automatically.
              </p>

              {activeSession && (
                <div
                  className="mt-3 flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs leading-snug text-foreground/90 dark:bg-amber-500/10 dark:text-foreground/85"
                  role="status"
                >
                  <AlertTriangle
                    className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>
                    Changing sticks or duration stops the timer and resets this session.
                  </span>
                </div>
              )}

              <Card className="mt-4 border-border/50 bg-card shadow-md ring-foreground/[0.06]">
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.65rem] font-medium tracking-[0.14em] text-muted-foreground">
                        NUMBER OF STICKS
                      </span>
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {String(stickCount).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/50 px-2 py-2.5">
                      <button
                        type="button"
                        disabled={stickCount <= 1}
                        className="flex size-10 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-background/50 disabled:opacity-35"
                        aria-label="Decrease sticks"
                        onClick={() => onStickChange(Math.max(1, stickCount - 1))}
                      >
                        <Minus className="size-4" strokeWidth={2} />
                      </button>
                      <span className="text-xs font-medium text-muted-foreground">
                        Adjust Quantity
                      </span>
                      <button
                        type="button"
                        disabled={stickCount >= 12}
                        className="flex size-10 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-background/50 disabled:opacity-35"
                        aria-label="Increase sticks"
                        onClick={() => onStickChange(Math.min(12, stickCount + 1))}
                      >
                        <Plus className="size-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.65rem] font-medium tracking-[0.14em] text-muted-foreground">
                        BURNING DURATION
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {durationMinutes} mins
                      </span>
                    </div>
                    <input
                      type="range"
                      className="moment-range"
                      min={1}
                      max={DURATION_SLIDER_MAX}
                      value={durationMinutes}
                      aria-valuemin={1}
                      aria-valuemax={DURATION_SLIDER_MAX}
                      aria-valuenow={durationMinutes}
                      aria-label="Burning duration in minutes"
                      onChange={(e) =>
                        onDurationChange(Number(e.target.value) || 1)
                      }
                    />
                    <div className="flex justify-between px-0.5 text-[0.65rem] tabular-nums text-muted-foreground">
                      <span>1M</span>
                      <span>15M</span>
                      <span>30M</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-auto">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-12 w-full rounded-xl text-[0.9375rem] font-medium"
                onClick={onResetDefaults}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-border/50 bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-md">
          <button
            type="button"
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              tab === 'flow' ? 'text-foreground' : 'text-muted-foreground',
            )}
            onClick={() => setTab('flow')}
          >
            <Timer className="size-5" strokeWidth={tab === 'flow' ? 2 : 1.5} />
            Flow
          </button>
          <button
            type="button"
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              tab === 'config' ? 'text-foreground' : 'text-muted-foreground',
            )}
            onClick={() => setTab('config')}
          >
            <SlidersHorizontal className="size-5" strokeWidth={tab === 'config' ? 2 : 1.5} />
            Config
          </button>
        </div>
      </nav>
    </div>
  )
}

function ControlTile({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-border/45 bg-transparent py-4 text-foreground transition-colors',
        'hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-35',
      )}
    >
      <span className="text-foreground [&_svg]:text-foreground">{icon}</span>
      <span className="text-[0.7rem] font-medium tracking-wide">{label}</span>
    </button>
  )
}
