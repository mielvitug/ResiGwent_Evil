export function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}
