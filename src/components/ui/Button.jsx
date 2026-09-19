import Icon from './Icon'

function Button({
  label,
  children,
  variant = 'primary',
  size = 'large',
  disabled = false,
  onClick,
  type = 'button',
  buttonRef,
  icon,
  iconOnly = false,
  ariaPressed,
  align = 'left',
  className = '',
}) {
  const classNames = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    align !== 'left' ? `button--align-${align}` : '',
    iconOnly ? 'button--icon-only' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classNames}
      type={type}
      ref={buttonRef}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={ariaPressed}
      {...(iconOnly ? { 'aria-label': label } : {})}
    >
      {icon && !iconOnly && <Icon name={icon} size={16} />}
      {iconOnly
        ? <Icon name={icon} size={18} />
        : <span>{label ?? children}</span>}
    </button>
  )
}

export default Button
