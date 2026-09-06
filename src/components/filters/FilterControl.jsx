function FilterControl({ label, value, options, optionLabels = {}, disabledOptions = [], onChange }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option} disabled={disabledOptions.includes(option)}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default FilterControl
