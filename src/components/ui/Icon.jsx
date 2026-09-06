const PATHS = {
  search: <path d="M11 4a7 7 0 1 0 4.95 11.95l3.5 3.5M11 4a7 7 0 0 1 6.32 4.02" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-left': <path d="M19 12H5m6-7-7 7 7 7" />,
  play: <path d="M7 4.5v15l12-7.5Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  'skip-next': <path d="m6 5 8.5 7L6 19ZM16 5v14" />,
  volume: <path d="M11 5 6.5 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.5L11 19ZM14.5 8.5a5 5 0 0 1 0 7M17 6a8.5 8.5 0 0 1 0 12" />,
  'volume-low': <path d="M11 5 6.5 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.5L11 19ZM14.5 8.5a5 5 0 0 1 0 7" />,
  'volume-mute': <path d="M11 5 6.5 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.5L11 19Zm4 2 6 6m0-6-6 6" />,
  music: <path d="M9 18V5.5l10-2V16M9 18a2 2 0 1 1-2-2 2 2 0 0 1 2 2Zm10-2a2 2 0 1 1-2-2 2 2 0 0 1 2 2Z" />,
  leader: <path d="M4 8 8 6l4 3 4-3 4 2v3l-4 2-4-3-4 3-4-2ZM6 15v3m12-3v3M3 18h18" />,
  pass: <path d="M4 21V4m0 0 16 6-6 2 6 2Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 3v5h-5" />,
  warning: <path d="M12 3 2.5 19.5h19L12 3Zm0 6v4m0 3v.5" />,
}

function Icon({ name, size = 18, label, className = '' }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {paths}
    </svg>
  )
}

export default Icon
