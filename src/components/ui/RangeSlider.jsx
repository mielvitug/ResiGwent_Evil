function RangeSlider({ label, value, onChange, disabled = false }) {
  return (
    <label className="range-control">
      <span>{label}</span>
      <input type="range" min="0" max="100" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{value}%</output>
    </label>
  )
}

export default RangeSlider
