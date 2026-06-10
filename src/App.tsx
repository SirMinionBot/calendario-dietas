import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/use-auth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Pages
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import DashboardPage from './pages/Dashboard'
import PlanningPage from './pages/Planning'
import CalendarPage from './pages/Calendar'
import RecipeListPage from './pages/RecipeList'
import RecipeDetailPage from './pages/RecipeDetail'
import RecipeFormPage from './pages/RecipeForm'
import IngredientListPage from './pages/IngredientList'
import ProfilePage from './pages/Profile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename="/calendario-dietas">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/plan" element={<PlanningPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/recipes" element={<RecipeListPage />} />
                <Route path="/recipes/new" element={<RecipeFormPage />} />
                <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                <Route
                  path="/recipes/:id/edit"
                  element={<RecipeFormPage />}
                />
                <Route
                  path="/ingredients"
                  element={<IngredientListPage />}
                />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
