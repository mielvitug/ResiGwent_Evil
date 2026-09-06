const STORAGE_KEY = 'resigwent-evil-settings'

export const defaultSettings = {
  music: true,
  musicVolume: 70,
  sfx: true,
  sfxVolume: 80,
  fullscreen: false,
  animations: true,
  confirmPlay: true,
}

export function loadSettings() {
  if (typeof window === 'undefined') return { ...defaultSettings }

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return sanitizeSettings(saved)
  } catch {
    return { ...defaultSettings }
  }
}

function sanitizeSettings(saved) {
  const merged = { ...defaultSettings }

  if (!saved || typeof saved !== 'object') return merged

  Object.keys(defaultSettings).forEach((key) => {
    const value = saved[key]
    if (typeof value !== typeof defaultSettings[key]) return
    if (typeof value === 'number') merged[key] = Math.min(100, Math.max(0, Math.round(value)))
    else merged[key] = value
  })

  return merged
}

export function saveSettings(settings) {
  applyAnimationPreference(settings)
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable; settings remain session-scoped.
  }
}

export function requestFullscreen(enabled) {
  if (typeof document === 'undefined') return
  try {
    if (enabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (!enabled && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  } catch {
    // Fullscreen denied or unsupported.
  }
}

export function onFullscreenChange(callback) {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('fullscreenchange', callback)
  return () => document.removeEventListener('fullscreenchange', callback)
}

export function applyAnimationPreference(settings) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.animations = settings.animations ? 'on' : 'off'
}
