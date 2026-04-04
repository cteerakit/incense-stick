import { BurnTimer, phaseFromTimer, type UiPhase } from './app'
import { loadSettings, saveSettings, type TimerSettings } from './storage'

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function readSettingsFromForm(
  stickInput: HTMLInputElement,
  durationInput: HTMLInputElement,
): TimerSettings {
  return {
    stickCount: Number(stickInput.value) || 1,
    durationMinutes: Number(durationInput.value) || 1,
  }
}

function renderSticks(container: HTMLElement, count: number): void {
  container.replaceChildren()
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div')
    slot.className = 'stick-slot'
    slot.innerHTML = `
      <div class="stick">
        <div class="stick__ash"></div>
        <div class="stick__clip">
          <div class="stick__body">
            <div class="stick__smoke stick__smoke--a" aria-hidden="true"></div>
            <div class="stick__smoke stick__smoke--b" aria-hidden="true"></div>
            <div class="stick__ember" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    `
    container.appendChild(slot)
  }
}

function updateStickBodies(
  container: HTMLElement,
  progress: number,
  burning: boolean,
): void {
  const bodies = container.querySelectorAll<HTMLElement>('.stick__body')
  const p = Math.min(1, Math.max(0, progress))
  const unburnt = 1 - p
  bodies.forEach((body) => {
    body.style.setProperty('--unburnt', String(unburnt))
    body.classList.toggle('stick__body--burning', burning && p > 0 && p < 1)
  })
}

export function mount(root: HTMLElement): void {
  const settings = loadSettings()

  root.innerHTML = `
    <main class="app">
      <header class="app__header">
        <h1 class="app__title">Incense timer</h1>
        <p class="app__subtitle">Sticks burn in parallel down to the root</p>
      </header>

      <section class="panel" aria-label="Timer settings">
        <div class="field">
          <label class="field__label" for="stick-count">Sticks</label>
          <input
            class="field__input"
            id="stick-count"
            name="stick-count"
            type="number"
            inputmode="numeric"
            min="1"
            max="12"
            value="${settings.stickCount}"
          />
        </div>
        <div class="field">
          <label class="field__label" for="duration">Minutes each</label>
          <input
            class="field__input"
            id="duration"
            name="duration"
            type="number"
            inputmode="numeric"
            min="1"
            max="180"
            value="${settings.durationMinutes}"
          />
        </div>
      </section>

      <div class="readout" aria-live="polite">
        <span class="readout__time" id="readout-time">--:--</span>
        <span class="readout__hint" id="readout-hint"></span>
      </div>

      <div class="sticks" id="sticks" role="presentation"></div>

      <div class="controls">
        <button type="button" class="btn btn--primary" id="btn-start">Start</button>
        <button type="button" class="btn" id="btn-pause" hidden>Pause</button>
        <button type="button" class="btn" id="btn-resume" hidden>Resume</button>
        <button type="button" class="btn btn--ghost" id="btn-restart">Restart</button>
      </div>
    </main>
  `

  const stickInput = root.querySelector<HTMLInputElement>('#stick-count')!
  const durationInput = root.querySelector<HTMLInputElement>('#duration')!
  const sticksEl = root.querySelector<HTMLElement>('#sticks')!
  const readoutTime = root.querySelector<HTMLElement>('#readout-time')!
  const readoutHint = root.querySelector<HTMLElement>('#readout-hint')!
  const btnStart = root.querySelector<HTMLButtonElement>('#btn-start')!
  const btnPause = root.querySelector<HTMLButtonElement>('#btn-pause')!
  const btnResume = root.querySelector<HTMLButtonElement>('#btn-resume')!
  const btnRestart = root.querySelector<HTMLButtonElement>('#btn-restart')!

  let timer = new BurnTimer(settings.durationMinutes)
  let raf = 0

  function persistInputs(): void {
    saveSettings(readSettingsFromForm(stickInput, durationInput))
  }

  function syncTimerDurationFromInput(): void {
    const { durationMinutes } = readSettingsFromForm(stickInput, durationInput)
    timer.setDurationMinutes(durationMinutes)
  }

  function setInputsDisabled(disabled: boolean): void {
    stickInput.disabled = disabled
    durationInput.disabled = disabled
  }

  function applyPhase(phase: UiPhase): void {
    btnStart.hidden = phase === 'running' || phase === 'paused'
    btnPause.hidden = phase !== 'running'
    btnResume.hidden = phase !== 'paused'
    setInputsDisabled(phase === 'running' || phase === 'paused')
  }

  function render(): void {
    const phase = phaseFromTimer(timer)
    applyPhase(phase)

    const p = timer.progress
    if (phase === 'idle' && p === 0) {
      readoutTime.textContent = formatMs(timer.totalMs)
    } else {
      readoutTime.textContent = formatMs(timer.remainingMs)
    }

    if (phase === 'idle' && p === 0) {
      readoutHint.textContent = 'Ready'
    } else if (phase === 'running') {
      readoutHint.textContent = 'Burning'
    } else if (phase === 'paused') {
      readoutHint.textContent = 'Paused'
    } else {
      readoutHint.textContent = 'Finished'
    }

    const burning = phase === 'running'
    updateStickBodies(sticksEl, p, burning)
  }

  function loop(): void {
    timer.tick()
    render()
    if (timer.running && timer.progress < 1) {
      raf = requestAnimationFrame(loop)
    }
  }

  function startLoop(): void {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(loop)
  }

  function stopLoop(): void {
    cancelAnimationFrame(raf)
  }

  function rebuildSticks(): void {
    const { stickCount } = readSettingsFromForm(stickInput, durationInput)
    renderSticks(sticksEl, Math.min(12, Math.max(1, stickCount)))
    render()
  }

  stickInput.addEventListener('change', () => {
    persistInputs()
    rebuildSticks()
  })
  durationInput.addEventListener('change', () => {
    persistInputs()
    syncTimerDurationFromInput()
    render()
  })

  btnStart.addEventListener('click', () => {
    syncTimerDurationFromInput()
    timer.start()
    startLoop()
    render()
  })

  btnPause.addEventListener('click', () => {
    timer.pause()
    stopLoop()
    render()
  })

  btnResume.addEventListener('click', () => {
    timer.resume()
    startLoop()
    render()
  })

  btnRestart.addEventListener('click', () => {
    stopLoop()
    timer.restart()
    syncTimerDurationFromInput()
    render()
  })

  syncTimerDurationFromInput()
  rebuildSticks()
}
