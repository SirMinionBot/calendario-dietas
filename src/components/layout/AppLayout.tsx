import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-white shadow-sm">
      <TopBar title="Calendario de Dietas" />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
