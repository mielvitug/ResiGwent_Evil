import assert from 'node:assert/strict'
import test from 'node:test'
import { configureAudio, playSfx } from './audioEngine.js'

test('audio engine is a safe no-op outside the browser', () => {
  assert.doesNotThrow(() => configureAudio({ sfx: true, sfxVolume: 80 }))
  assert.doesNotThrow(() => playSfx('deploy'))
  assert.doesNotThrow(() => playSfx('unknown-cue'))
  assert.doesNotThrow(() => configureAudio({ sfx: false, sfxVolume: 0 }))
})
