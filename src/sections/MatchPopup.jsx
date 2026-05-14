export default function MatchPopup({ name, onClose, onGoMatches }) {
  return (
    <div className="match-popup-overlay" onClick={onClose}>
      <div className="match-popup sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="match-popup__emoji">🎉</div>
        <div className="match-popup__title">Это мэтч!</div>
        {name && <div className="match-popup__name">{name}</div>}
        <p className="match-popup__text">
          Вы подходите друг другу по целям и опыту. Самое время познакомиться.
        </p>
        <button
          type="button"
          className="match-popup__btn match-popup__btn--primary"
          onClick={onGoMatches}
        >
          Перейти к мэтчам →
        </button>
        <button
          type="button"
          className="match-popup__btn match-popup__btn--ghost tile-glass"
          onClick={onClose}
        >
          Продолжить просмотр
        </button>
      </div>
    </div>
  )
}
