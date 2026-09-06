import { useEffect, useState } from 'react'
import { getCurrentTrack, getIsPlaying, onMusicStateChange, togglePlayPause, skipTrack, setMusicVolume } from '../../audio/audioEngine.js'
import { loadSettings } from '../../settings/settingsStore.js'
import Icon from '../ui/Icon'

function formatTrackName(raw) {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function MusicPlayer() {
  const [track, setTrack] = useState(getCurrentTrack)
  const [playing, setPlaying] = useState(getIsPlaying)
  const [volume, setVolume] = useState(() => loadSettings().musicVolume)

  useEffect(() => onMusicStateChange(({ track: t, playing: p }) => {
    setTrack(t)
    setPlaying(p)
  }), [])

  function handleVolume(e) {
    const v = Number(e.target.value)
    setVolume(v)
    setMusicVolume(v)
  }

  function volumeIcon() {
    if (volume === 0) return 'volume-mute'
    if (volume < 40) return 'volume-low'
    return 'volume'
  }

  if (!track) return null

  return (
    <div className="music-player" role="region" aria-label="Music player">
      <div className="music-player__row">
        <span className="music-player__note" aria-hidden="true"><Icon name="music" size={16} /></span>
        <span className="music-player__track">{formatTrackName(track)}</span>
        <div className="music-player__controls">
          <button className="music-player__btn" type="button" onClick={togglePlayPause} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} size={16} />
          </button>
          <button className="music-player__btn" type="button" onClick={skipTrack} aria-label="Next track">
            <Icon name="skip-next" size={16} />
          </button>
        </div>
      </div>
      <div className="music-player__volume">
        <span className="music-player__vol-icon" aria-hidden="true"><Icon name={volumeIcon()} size={16} /></span>
        <input
          className="music-player__slider"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolume}
          aria-label="Music volume"
        />
      </div>
    </div>
  )
}

export default MusicPlayer
