const COLORS = {
  green:  'badge-green',
  red:    'badge-red',
  yellow: 'badge-yellow',
  purple: 'badge-purple',
  blue:   'badge-blue',
}

export default function Badge({ color = 'green', children, style }) {
  return (
    <span className={`badge ${COLORS[color] || ''}`} style={style}>
      {children}
    </span>
  )
}
