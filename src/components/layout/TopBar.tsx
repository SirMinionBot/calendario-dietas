import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  showBack?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export default function TopBar({ title, showBack, action }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-12 items-center justify-between border-b border-stone-200 bg-white px-4">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-stone-500 hover:text-stone-700"
            aria-label="Go back"
          >
            {/* Chevron left */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="text-base font-semibold text-stone-900">{title}</h1>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          {action.label}
        </button>
      )}
    </header>
  )
}
