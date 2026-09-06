import Icon from '../ui/Icon'

function ScreenShell({ eyebrow = 'ResiGwent Evil', title, onBack, children }) {
  return (
    <main className="screen-shell">
      <header className="screen-header">
        <button className="back-button" type="button" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Back
        </button>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </main>
  )
}

export default ScreenShell
