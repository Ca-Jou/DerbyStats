import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Home from './pages/Home'
import Teams from './pages/Teams'
import TeamDetails from './pages/TeamDetails'
import Skaters from './pages/Skaters'
import SkaterDetails from './pages/SkaterDetails'
import Games from './pages/Games'
import GameDetails from './pages/GameDetails'
import GameStats from './pages/GameStats'
import EnterGameStats from './pages/EnterGameStats'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:id/stats"
                element={
                  <ProtectedRoute>
                    <GameStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:id/enter-stats"
                element={
                  <ProtectedRoute>
                    <EnterGameStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:id"
                element={
                  <ProtectedRoute>
                    <GameDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games"
                element={
                  <ProtectedRoute>
                    <Games />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams/:id"
                element={
                  <ProtectedRoute>
                    <TeamDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams"
                element={
                  <ProtectedRoute>
                    <Teams />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skaters/:id"
                element={
                  <ProtectedRoute>
                    <SkaterDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skaters"
                element={
                  <ProtectedRoute>
                    <Skaters />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
