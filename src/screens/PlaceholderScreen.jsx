import Button from '../components/ui/Button'
import ScreenShell from '../components/layout/ScreenShell'

const screenCopy = {
  'deck-builder': {
    title: 'Deck Builder',
    body: 'Choose a leader and assemble your field team before deployment.',
  },
  collection: {
    title: 'Collection',
    body: 'Review recovered character files and tactical card data.',
  },
  options: {
    title: 'Options',
    body: 'Adjust audio, display, and gameplay settings for the field.',
  },
  'game-board': {
    title: 'Battle Board Preview',
    body: 'The battlefield module is queued for the rule-engine milestone.',
  },
}

function PlaceholderScreen({ screen, loadout, onBack }) {
  const copy = screenCopy[screen]

  return (
    <ScreenShell title={copy.title} onBack={onBack}>
      <section className="placeholder-panel">
        <span className="placeholder-mark" aria-hidden="true">+</span>
        <p className="eyebrow">Module queued</p>
        <h2>{copy.body}</h2>
        <p>This preview confirms the selected loadout handoff. Card placement, scoring, and AI turns will be added in the next implementation pass.</p>
        {screen === 'game-board' && loadout && (
          <p className="loadout-status" role="status">
            Loadout queued: {loadout.faction.name} / {loadout.leader.name} with {loadout.cards.length} cards.
          </p>
        )}
        <Button label="Return to Command Center" variant="secondary" onClick={onBack} />
      </section>
    </ScreenShell>
  )
}

export default PlaceholderScreen
