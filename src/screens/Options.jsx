import { useEffect, useState } from 'react'
import RangeSlider from '../components/ui/RangeSlider'
import Toggle from '../components/ui/Toggle'
import ScreenShell from '../components/layout/ScreenShell'
import { loadSettings, onFullscreenChange, requestFullscreen, saveSettings } from '../settings/settingsStore.js'
import { configureAudio, setMusicEnabled, setMusicVolume } from '../audio/audioEngine.js'

function Options({ onBack }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    configureAudio(settings)
    onFullscreenChange(() => {
      setSettings((current) => ({ ...current, fullscreen: Boolean(document.fullscreenElement) }))
    })
  }, [])

  function updateSetting(key, value) {
    const nextSettings = { ...settings, [key]: value }
    saveSettings(nextSettings)
    configureAudio(nextSettings)
    if (key === 'music') setMusicEnabled(value)
    if (key === 'musicVolume') setMusicVolume(value)
    if (key === 'fullscreen') requestFullscreen(value)
    setSettings(nextSettings)
  }

  return (
    <ScreenShell title="Options" eyebrow="Field settings" onBack={onBack}>
      <section className="options-panel" aria-label="Game options">
        <div className="options-section">
          <p className="eyebrow">Audio</p>
          <Toggle label="Music" checked={settings.music} onChange={(value) => updateSetting('music', value)} />
          <RangeSlider label="Music volume" value={settings.musicVolume} onChange={(value) => updateSetting('musicVolume', value)} />
          <Toggle label="Sound effects" checked={settings.sfx} onChange={(value) => updateSetting('sfx', value)} />
          <RangeSlider label="SFX volume" value={settings.sfxVolume} onChange={(value) => updateSetting('sfxVolume', value)} />
        </div>
        <div className="options-section">
          <p className="eyebrow">Display</p>
          <Toggle label="Fullscreen" checked={settings.fullscreen} onChange={(value) => updateSetting('fullscreen', value)} />
          <Toggle label="Animations" checked={settings.animations} onChange={(value) => updateSetting('animations', value)} />
        </div>
        <div className="options-section">
          <p className="eyebrow">Gameplay</p>
          <Toggle label="Confirm card play" checked={settings.confirmPlay} onChange={(value) => updateSetting('confirmPlay', value)} />
        </div>
        <p className="options-status" role="status">Settings are saved in this browser.</p>
      </section>
    </ScreenShell>
  )
}

export default Options
