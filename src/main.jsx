import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { applyAnimationPreference, loadSettings, pullSettings } from './settings/settingsStore.js'

applyAnimationPreference(loadSettings())
// Best-effort restore from the server on boot; the game runs on local values regardless.
pullSettings().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
