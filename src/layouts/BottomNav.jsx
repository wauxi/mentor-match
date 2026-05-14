import { NavLink } from 'react-router-dom'
import { Heart, Layers, Settings, User } from 'lucide-react'

const TABS = [
  { to: '/swipe', label: 'Лента', icon: Layers },
  { to: '/matches', label: 'Мэтчи', icon: Heart },
  { to: '/profile/me', label: 'Профиль', icon: User },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav bottom-nav-glass">
      {TABS.map(({ to, label, icon: Icon }) => (
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
                fill={isActive ? 'currentColor' : 'none'} 
              />
              <span className="bottom-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
