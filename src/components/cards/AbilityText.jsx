function AbilityText({ ability }) {
  if (!ability) return null

  const quoted = ability.match(/^"([^"]+)"\s*—\s*(.*)$/)
  const remainder = quoted ? quoted[2] : ability

  // ponytail: split rules into titled segments (Title: ...) so multi-ability cards bold each name; single-title cards render exactly as before
  const segments = remainder.split(/\. (?=[A-Z][^:.]*: )/).map((segment, index, parts) => index < parts.length - 1 ? `${segment}.` : segment)
  if (!segments.some((segment) => segment.indexOf(': ') !== -1)) {
    if (!quoted) return <>{ability}</>
    return (
      <>
        <span className="ability-quote">&quot;{quoted[1]}&quot;</span><span className="ability-sep"> — </span>
        <strong className="ability-title">{remainder}</strong>
      </>
    )
  }

  return (
    <>
      {quoted && <><span className="ability-quote">&quot;{quoted[1]}&quot;</span><span className="ability-sep"> — </span></>}
      {segments.map((segment, index) => {
        const colonIndex = segment.indexOf(': ')
        if (colonIndex === -1) return <span key={index}>{index > 0 ? ` ${segment}` : segment}</span>
        return <span key={index}>{index > 0 ? ' ' : ''}<strong className="ability-title">{segment.slice(0, colonIndex)}:</strong>{` ${segment.slice(colonIndex + 2)}`}</span>
      })}
    </>
  )
}

export default AbilityText
