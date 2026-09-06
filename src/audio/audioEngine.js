let audioContext = null
let masterGain = null
let bgMusic = null
let currentTrack = null
let isPlaying = false
let listeners = new Set()

let audioSettings = { sfx: true, sfxVolume: 80, music: true, musicVolume: 70 }

const PLAYLIST = [
  'The_Drive_re4',
  'Jack_55th',
]

export function getPlaylist() {
  return [...PLAYLIST]
}

export function getCurrentTrack() {
  return currentTrack
}

export function getIsPlaying() {
  return isPlaying
}

export function onMusicStateChange(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notify() {
  listeners.forEach((fn) => fn({ track: currentTrack, playing: isPlaying }))
}

export function setTrack(trackName) {
  currentTrack = trackName
  notify()
}

export function getRandomTrack() {
  return PLAYLIST[Math.floor(Math.random() * PLAYLIST.length)]
}

export function getNextTrack() {
  if (!currentTrack) return getRandomTrack()
  const idx = PLAYLIST.indexOf(currentTrack)
  return PLAYLIST[(idx + 1) % PLAYLIST.length]
}

const CUE_LIBRARY = {
  deploy: { type: 'triangle', from: 180, to: 90, duration: 0.12, volume: 0.9 },
  pass: { type: 'square', from: 220, to: 150, duration: 0.18, volume: 0.5 },
  leader: { type: 'sawtooth', from: 120, to: 480, duration: 0.35, volume: 0.55 },
  roundWon: { type: 'sine', from: 165, to: 196, duration: 0.5, volume: 0.8 },
  roundLost: { type: 'sawtooth', from: 86, to: 78, duration: 0.65, volume: 0.7 },
}

export function configureAudio(settings) {
  audioSettings = {
    sfx: Boolean(settings?.sfx),
    sfxVolume: clampVolume(settings?.sfxVolume),
    music: Boolean(settings?.music),
    musicVolume: clampVolume(settings?.musicVolume),
  }
  if (bgMusic) bgMusic.volume = audioSettings.music ? audioSettings.musicVolume / 100 : 0
}

export function playMusic(trackName) {
  if (!audioSettings.music || audioSettings.musicVolume === 0) return
  stopMusic()

  try {
    bgMusic = new Audio(`/audio/music/${trackName}.mp3`)
    bgMusic.loop = true
    bgMusic.volume = audioSettings.musicVolume / 100
    bgMusic.onended = () => { playMusic(getNextTrack()) }
    bgMusic.play().then(() => {
      currentTrack = trackName
      isPlaying = true
      notify()
    }).catch(() => {
      currentTrack = trackName
      isPlaying = false
      notify()
    })
  } catch {
    currentTrack = trackName
    isPlaying = false
    notify()
  }
}

export function togglePlayPause() {
  if (!bgMusic) {
    playMusic(currentTrack ?? getRandomTrack())
    return
  }
  if (bgMusic.paused) {
    bgMusic.play().then(() => { isPlaying = true; notify() }).catch(() => {})
  } else {
    bgMusic.pause()
    isPlaying = false
    notify()
  }
}

export function skipTrack() {
  playMusic(getNextTrack())
}

export function stopMusic() {
  if (!bgMusic) return
  bgMusic.onended = null
  bgMusic.pause()
  bgMusic.currentTime = 0
  bgMusic = null
  isPlaying = false
  notify()
}

export function setMusicVolume(volume) {
  audioSettings.musicVolume = clampVolume(volume)
  if (bgMusic) bgMusic.volume = audioSettings.music ? audioSettings.musicVolume / 100 : 0
}

export function setMusicEnabled(enabled) {
  audioSettings.music = Boolean(enabled)
  if (!enabled) stopMusic()
}

export function playSfx(cueName) {
  const cue = CUE_LIBRARY[cueName]
  if (!cue || !audioSettings.sfx || audioSettings.sfxVolume === 0) return

  const context = ensureContext()
  if (!context) return

  try {
    if (context.state === 'suspended') context.resume().catch(() => {})

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = cue.type
    oscillator.frequency.setValueAtTime(cue.from, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, cue.to), now + cue.duration)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(cue.volume * (audioSettings.sfxVolume / 100), now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.duration)

    oscillator.connect(gain)
    gain.connect(masterGain ?? context.destination)
    oscillator.start(now)
    oscillator.stop(now + cue.duration + 0.05)
  } catch {
    // Audio unavailable; SFX remain silent rather than breaking gameplay.
  }
}

function ensureContext() {
  const AudioContextConstructor = typeof window === 'undefined' ? null : window.AudioContext ?? window.webkitAudioContext
  if (typeof AudioContextConstructor !== 'function') return null

  if (!audioContext) {
    try {
      audioContext = new AudioContextConstructor()
      masterGain = audioContext.createGain()
      masterGain.gain.value = 0.5
      masterGain.connect(audioContext.destination)
    } catch {
      return null
    }
  }

  return audioContext
}

function clampVolume(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 80
  return Math.min(100, Math.max(0, Math.round(numeric)))
}
