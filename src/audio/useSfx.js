import { useCallback, useEffect } from 'react'
import { configureAudio, playSfx } from './audioEngine.js'
import { loadSettings } from '../settings/settingsStore.js'

export function useSfx() {
  useEffect(() => {
    configureAudio(loadSettings())
  }, [])

  return useCallback((cueName) => playSfx(cueName), [])
}
