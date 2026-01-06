import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Home from './pages/Home'
import Teams from './pages/Teams'
import Skaters from './pages/Skaters'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <main>
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
                path="/teams"
                element={
                  <ProtectedRoute>
                    <Teams />
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