import { useEffect, useState } from 'react'
import Collection from './screens/Collection'
import DeckBuilder from './screens/DeckBuilder'
import GameBoard from './screens/GameBoard'
import MainMenu from './screens/MainMenu'
import Options from './screens/Options'
import PlaceholderScreen from './screens/PlaceholderScreen'
import MusicPlayer from './components/game/MusicPlayer.jsx'
import { configureAudio, getCurrentTrack, getIsPlaying, getRandomTrack, playMusic, setTrack, stopMusic } from './audio/audioEngine.js'
import { loadSettings } from './settings/settingsStore.js'
import './styles/base.css'
import './styles/game.css'
import './styles/cards-filters-deck.css'
import './styles/music-player.css'

function App() {
  const [screen, setScreen] = useState('menu')
  const [loadout, setLoadout] = useState(null)

  useEffect(() => {
    configureAudio(loadSettings())
    const track = getRandomTrack()
    setTrack(track)
    playMusic(track)
    function unlock() {
      if (!getIsPlaying()) playMusic(getCurrentTrack() ?? getRandomTrack())
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopMusic()
    }
  }, [])

  let content

  if (screen === 'menu') {
    content = <MainMenu onNavigate={setScreen} />
  } else if (screen === 'deck-builder') {
    content = <DeckBuilder onBack={() => setScreen('menu')} onStartMatch={(nextLoadout) => { setLoadout(nextLoadout); setScreen('game-board') }} />
  } else if (screen === 'collection') {
    content = <Collection onBack={() => setScreen('menu')} />
  } else if (screen === 'options') {
    content = <Options onBack={() => setScreen('menu')} />
  } else if (screen === 'game-board' && loadout) {
    content = <GameBoard loadout={loadout} onReturn={() => setScreen('menu')} />
  } else {
    content = <PlaceholderScreen screen={screen} loadout={loadout} onBack={() => setScreen('menu')} />
  }

  return (
    <>
      {content}
      <MusicPlayer />
    </>
  )
}

export default App
