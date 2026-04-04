import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
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
  const n = Math.min(12, Math.max(1, Math.floor(count)))
  const clipHeight = 'min(42vh, 220px)'
  /* One row: widen spacing for few sticks, tighten toward 4px at 12 sticks */
  const sticksGapPx = Math.max(4, 22 - Math.round(((n - 1) * 18) / 11))

  return (
    <div
      className="sticks"
      role="presentation"
      style={{ '--sticks-gap': `${sticksGapPx}px` } as CSSProperties}
    >
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="stick-slot">
          <div className="stick">
            <div
              className="stick__clip"
              style={{ height: clipHeight } as CSSProperties}
            >
              <div className="stick__column">
                <div className="stick__burn-zone">
                  <div
                    className={`stick__body ${burning && p > 0 && p < 1 ? 'stick__body--burning' : ''}`}
                    style={{ '--unburnt': String(unburnt) } as CSSProperties}
                  >
                    <div className="stick__smoke stick__smoke--a" aria-hidden />
                    <div className="stick__smoke stick__smoke--b" aria-hidden />
                    <div className="stick__ember" aria-hidden />
                  </div>
                </div>
                <div className="stick__handle" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

type Tab = 'flow' | 'config'

export default function App() {
  const initial = loadSettings()
  const [tab, setTab] = useState<Tab>('flow')
  const [stickCount, setStickCount] = useState(initial.stickCount)
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes)
  const [saveFlash, setSaveFlash] = useState(false)
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
  const settingsLocked = activeSession

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
    setStickCount(v)
  }

  const onDurationChange = (v: number) => {
    setDurationMinutes(v)
    timerRef.current.setDurationMinutes(v)
    tick()
  }

  const onSaveTap = () => {
    persist()
    setSaveFlash(true)
    window.setTimeout(() => setSaveFlash(false), 900)
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
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <main
        className={cn(
          'mx-auto flex w-full max-w-md flex-1 flex-col px-4',
          'pt-[calc(0.75rem+env(safe-area-inset-top,0px))]',
          'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        {tab === 'flow' && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center">
              <StickVisualization count={stickCount} progress={p} burning={burning} />
            </div>

            <div className="space-y-6 pb-2 text-center" aria-live="polite">
              <div>
                <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground">
                  TIME REMAINING
                </p>
                <p className="mt-1 text-[2.75rem] font-light tabular-nums tracking-tight text-foreground">
                  {displayRemaining}
                </p>
              </div>

              <div
                className={cn(
                  'grid gap-3',
                  activeSession ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                <ControlTile
                  label={burning ? 'Stop' : 'Start'}
                  icon={
                    burning ? (
                      <Pause className="size-5" strokeWidth={1.75} />
                    ) : (
                      <Play className="size-5" strokeWidth={1.75} />
                    )
                  }
                  onClick={() => {
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
                    label="Restart"
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
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="flex flex-1 flex-col gap-5 pt-5">
            <div>
              <h2 className="text-[0.7rem] font-semibold tracking-[0.16em] text-foreground">
                TIMER SETTINGS
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Customize your digital incense session.
              </p>

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
                        disabled={settingsLocked || stickCount <= 1}
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
                        disabled={settingsLocked || stickCount >= 12}
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
                      disabled={settingsLocked}
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

            <div className="mt-auto flex flex-col gap-2.5">
              <Button
                type="button"
                size="lg"
                className={cn(
                  'h-12 w-full rounded-xl text-[0.9375rem] font-medium',
                  saveFlash && 'ring-2 ring-foreground/20',
                )}
                onClick={onSaveTap}
              >
                Save Configuration
              </Button>
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
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-border/45 bg-muted/45 py-4 text-foreground transition-colors',
        'hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-35',
      )}
    >
      <span className="text-foreground [&_svg]:text-foreground">{icon}</span>
      <span className="text-[0.7rem] font-medium tracking-wide">{label}</span>
    </button>
  )
}
