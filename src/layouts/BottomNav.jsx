import { NavLink } from 'react-router-dom'
import { Heart, Layers, Settings, User } from 'lucide-react'

const TABS = [
  { to: '/swipe', label: 'Лента', icon: Layers, fillOnActive: false },
  { to: '/matches', label: 'Мэтчи', icon: Heart, fillOnActive: true },
  { to: '/profile/me', label: 'Профиль', icon: User, fillOnActive: true },
  { to: '/settings', label: 'Настройки', icon: Settings, fillOnActive: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav bottom-nav-glass">
      {TABS.map(({ to, label, icon: Icon, fillOnActive }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            'bottom-nav__item' + (isActive ? ' bottom-nav__item--active' : '')
          }
          end={to === '/profile/me'}
        >
          {({ isActive }) => (
            <>
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.8}
                fill={isActive && fillOnActive ? 'currentColor' : 'none'}
              />
              <span className="bottom-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
