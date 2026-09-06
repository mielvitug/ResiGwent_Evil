function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className="toggle-control">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  )
}

export default Toggle
