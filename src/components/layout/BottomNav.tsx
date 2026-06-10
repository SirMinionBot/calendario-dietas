import { NavLink } from 'react-router-dom'

interface Tab {
  path: string
  label: string
  icon: 'today' | 'calendar' | 'add' | 'recipes' | 'profile'
}

const tabs: Tab[] = [
  { path: '/', label: 'Today', icon: 'today' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '#add', label: 'Add', icon: 'add' },
  { path: '/recipes', label: 'Recipes', icon: 'recipes' },
  { path: '/profile', label: 'Profile', icon: 'profile' },
]

function TabIcon({ icon }: { icon: Tab['icon'] }) {
  const className = "h-5 w-5"

  switch (icon) {
    case 'today':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'calendar':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'add':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    case 'recipes':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    case 'profile':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

export default function BottomNav() {
  return (
    <nav className="flex h-16 items-center justify-around border-t border-stone-200 bg-white px-2">
      {tabs.map((tab) => {
        if (tab.path === '#add') {
          return (
            <button
              key={tab.path}
              onClick={() => {
                // TODO: Open quick-add modal (placeholder)
              }}
              className="flex flex-col items-center gap-0.5 text-stone-400 transition-colors hover:text-stone-600"
              aria-label={tab.label}
            >
              <TabIcon icon={tab.icon} />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          )
        }

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-stone-400 hover:text-stone-600'
              }`
            }
          >
            <TabIcon icon={tab.icon} />
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
