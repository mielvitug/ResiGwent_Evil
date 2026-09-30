import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import { cards } from '../data/catalog.js'
import { menuArtwork } from '../data/menuArtManifest.js'
import { loadMatchLog, pullMatchLog } from '../log/matchLog.js'
import { shuffleDeck } from '../utils/shuffleDeck.js'

const menuItems = [
  { key: 'play-game', id: 'deck-builder', label: 'Play Game', note: 'Choose your field team' },
  { key: 'deck-builder', id: 'deck-builder', label: 'Deck Builder', note: 'Prepare your operatives' },
  { key: 'collection', id: 'collection', label: 'Collection', note: 'Review recovered files' },
  { key: 'options', id: 'options', label: 'Options', note: 'Adjust field settings' },
]

const OUTCOME_LABEL = { player: 'Complete', opponent: 'Failed', draw: 'Stalemate' }

const artworkUrl = (artwork) => `/images/cards/${artwork.includes('.') ? artwork : `${artwork}.png`}`

function warmDecode(artwork) {
  const image = new Image()
  image.src = artworkUrl(artwork)
}

function MainMenu({ onNavigate }) {
  const firstButtonRef = useRef(null)
  const [matchLog, setMatchLog] = useState(loadMatchLog)
  const collageRows = useMemo(() => {
    const rarityByArt = new Map()
    cards.forEach((card) => {
      rarityByArt.set(card.artwork, card.rarity ?? 'common')
      card.evolution?.stages.forEach((stage) => rarityByArt.set(stage.artwork, card.rarity ?? 'common'))
    })
    const pool = shuffleDeck(menuArtwork.map((file) => ({ id: file, artwork: file, rarity: rarityByArt.get(file) ?? 'common' })))
    pool.forEach((card) => warmDecode(card.artwork))
    const rows = []
    for (let i = 0; i < pool.length; i += 12) rows.push(pool.slice(i, i + 12))
    return rows
  }, [])

  useEffect(() => {
    firstButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    // Restore-only: an empty device fills its log from the server once.
    let cancelled = false
    pullMatchLog()
      .then((entries) => {
        if (!cancelled && entries) setMatchLog(entries)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="main-menu">
      <section className="menu-art" aria-label="Resident Evil inspired title artwork">
        <div className="menu-collage" aria-hidden="true">
          {collageRows.map((row) => (
            <div className="menu-collage__row" key={row[0].id}>
              {row.map((card) => (
                <img key={card.id} className={`menu-collage__card menu-collage__card--${card.rarity ?? 'common'}`} src={artworkUrl(card.artwork)} alt="" />
              ))}
            </div>
          ))}
        </div>
        <div className="art-grid" aria-hidden="true" />
        <div className="wordmark-lockup">
          <p className="eyebrow">A tactical card survival game</p>
          <h1 className="wordmark">Resi<span className="wordmark__gwent">Gwent</span> <span>Evil</span></h1>
          <p className="menu-tagline">Every hand is a decision. Every round is a risk.</p>
        </div>
        <p className="asset-disclaimer">All artwork and image assets are the property of CAPCOM CO., LTD. ResiGwent Evil is a non-commercial fan project, not affiliated with or endorsed by CAPCOM.</p>
      </section>

      <section className="menu-navigation" aria-labelledby="menu-title">
        <div className="menu-heading">
          <p className="eyebrow">R.P.D. TERMINAL 01</p>
          <h2 id="menu-title">Command Center</h2>
          <p>Select an operation to continue.</p>
        </div>
        <nav className="menu-buttons" aria-label="Main menu">
          {menuItems.map((item, index) => (
            <div className="menu-item" key={item.key}>
              <span className="menu-index" aria-hidden="true">0{index + 1}</span>
              <Button
                label={item.label}
                variant={index === 0 ? 'primary' : 'secondary'}
                buttonRef={index === 0 ? firstButtonRef : undefined}
                onClick={() => onNavigate(item.id)}
              />
              <span className="menu-note">{item.note}</span>
            </div>
          ))}
        </nav>
        {matchLog.length > 0 && (
          <section className="operation-log" aria-labelledby="log-title">
            <p className="eyebrow" id="log-title">Operation log</p>
            <ul>
              {matchLog.map((entry) => (
                <li key={entry.at}>
                  <span className={`log-outcome log-outcome--${entry.outcome}`}>{OUTCOME_LABEL[entry.outcome] ?? entry.outcome}</span>
                  <span>{entry.faction} vs {entry.opponent}</span>
                  <small>{entry.rounds} · {entry.difficulty}</small>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="build-label">Prototype build / local session</p>
      </section>
    </main>
  )
}

export default MainMenu
