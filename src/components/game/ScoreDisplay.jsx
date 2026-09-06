function ScoreDisplay({ label, score, tone = 'neutral' }) {
  return (
    <div className={`score-display score-display--${tone}`}>
      <span>{label}</span>
      <strong>{score}</strong>
    </div>
  )
}

export default ScoreDisplay
