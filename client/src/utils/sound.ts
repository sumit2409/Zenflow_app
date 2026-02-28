type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let audioContext: AudioContext | null = null

async function getAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext
    if (!AudioCtor) return null
    audioContext = new AudioCtor()
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  return audioContext
}

async function playSequence(
  notes: number[],
  options: { duration?: number; gap?: number; volume?: number; type?: OscillatorType } = {}
) {
  const ctx = await getAudioContext()
  if (!ctx) return

  const duration = options.duration ?? 0.12
  const gap = options.gap ?? 0.05
  const volume = options.volume ?? 0.05
  const type = options.type ?? 'sine'
  const startAt = ctx.currentTime + 0.01

  notes.forEach((freq, idx) => {
    const noteTime = startAt + idx * (duration + gap)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, noteTime)
    gain.gain.setValueAtTime(0.0001, noteTime)
    gain.gain.exponentialRampToValueAtTime(volume, noteTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(noteTime)
    osc.stop(noteTime + duration + 0.02)
  })
}

export async function playStartChime() {
  await playSequence([392, 523.25], { duration: 0.1, gap: 0.04, volume: 0.045, type: 'triangle' })
}

export async function playPauseChime() {
  await playSequence([523.25, 392], { duration: 0.08, gap: 0.03, volume: 0.035, type: 'triangle' })
}

export async function playEndChime() {
  await playSequence([523.25, 659.25, 783.99], { duration: 0.14, gap: 0.05, volume: 0.055, type: 'sine' })
}

export async function playPomodoroCompleteChime() {
  await playSequence([392, 523.25, 659.25, 783.99], {
    duration: 0.16,
    gap: 0.05,
    volume: 0.06,
    type: 'triangle',
  })
}

export async function playMeditationBell() {
  await playSequence([392, 523.25, 659.25, 783.99, 659.25], {
    duration: 0.22,
    gap: 0.08,
    volume: 0.05,
    type: 'sine',
  })
}

export async function playVictoryFanfare() {
  await playSequence([523.25, 659.25, 783.99, 1046.5], {
    duration: 0.16,
    gap: 0.04,
    volume: 0.07,
    type: 'triangle',
  })
}

export type MeditationAmbience = {
  start: () => Promise<void>
  stop: () => void
}

export function createMeditationAmbience(): MeditationAmbience {
  let noiseSource: AudioBufferSourceNode | null = null
  let droneOsc: OscillatorNode | null = null
  let noiseGain: GainNode | null = null
  let droneGain: GainNode | null = null

  return {
    async start() {
      const ctx = await getAudioContext()
      if (!ctx || (noiseSource && droneOsc)) return

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.2
      }

      noiseSource = ctx.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 280
      filter.Q.value = 0.7

      noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.012

      droneOsc = ctx.createOscillator()
      droneOsc.type = 'sine'
      droneOsc.frequency.value = 174

      droneGain = ctx.createGain()
      droneGain.gain.value = 0.01

      noiseSource.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(ctx.destination)

      droneOsc.connect(droneGain)
      droneGain.connect(ctx.destination)

      noiseSource.start()
      droneOsc.start()
    },
    stop() {
      try {
        noiseSource?.stop()
        droneOsc?.stop()
      } catch {
        // Ignore stop errors for already-stopped nodes.
      }

      noiseSource?.disconnect()
      droneOsc?.disconnect()
      noiseGain?.disconnect()
      droneGain?.disconnect()

      noiseSource = null
      droneOsc = null
      noiseGain = null
      droneGain = null
    },
  }
}
