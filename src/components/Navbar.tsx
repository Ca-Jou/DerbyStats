import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" to="/">
          Bench App
        </Link>

        <div className="d-flex align-items-center">
          {user && (
            <div className="navbar-nav me-3">
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link
                to="/teams"
                className={`nav-link ${location.pathname === '/teams' ? 'active' : ''}`}
              >
                Teams
              </Link>
              <Link
                to="/skaters"
                className={`nav-link ${location.pathname === '/skaters' ? 'active' : ''}`}
              >
                Skaters
              </Link>
            </div>
          )}

          {user ? (
            <div className="d-flex align-items-center">
              <span className="navbar-text me-3">{user.email}</span>
              <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar