import { useEffect, useRef } from 'react'

export function useModalDialog() {
  const primaryButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    primaryButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  function trapFocus(event) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const focusables = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]
    if (focusables.length === 0) return
    const currentIndex = focusables.indexOf(document.activeElement)
    const offset = event.shiftKey ? -1 : 1
    focusables[(currentIndex + offset + focusables.length) % focusables.length].focus()
  }

  return { primaryButtonRef, trapFocus }
}
