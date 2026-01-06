import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../assets/css/Navbar.css'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const navLinks = (
    <>
      <Link
        to="/"
        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
      >
        <i className="bi bi-house-fill"></i>
        <span className="nav-label d-none d-lg-inline ms-2">Home</span>
      </Link>
      <Link
        to="/games"
        className={`nav-link ${location.pathname === '/games' ? 'active' : ''}`}
      >
        <i className="bi bi-trophy-fill"></i>
        <span className="nav-label d-none d-lg-inline ms-2">Games</span>
      </Link>
      <Link
        to="/teams"
        className={`nav-link ${location.pathname === '/teams' ? 'active' : ''}`}
      >
        <i className="bi bi-people-fill"></i>
        <span className="nav-label d-none d-lg-inline ms-2">Teams</span>
      </Link>
      <Link
        to="/skaters"
        className={`nav-link ${location.pathname === '/skaters' ? 'active' : ''}`}
      >
        <i className="bi bi-person-fill"></i>
        <span className="nav-label d-none d-lg-inline ms-2">Skaters</span>
      </Link>
    </>
  )

  return (
    <>
      {/* Desktop sidebar - visible on large screens */}
      <nav className="sidebar d-none d-lg-flex flex-column bg-light">
        <Link className="navbar-brand p-3 text-center border-bottom" to="/">
          DerbyStats
        </Link>

        {user && (
          <div className="nav flex-column flex-grow-1 p-3">
            {navLinks}
          </div>
        )}

        {user ? (
          <div className="sidebar-footer p-3 border-top">
            <div className="mb-2 small text-truncate">{user.email}</div>
            <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm w-100">
              Logout
            </button>
          </div>
        ) : (
          <div className="p-3 border-top">
            <Link to="/login" className="btn btn-primary btn-sm w-100">
              Login
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile top navbar - visible on small screens */}
      <nav className="navbar navbar-light bg-light d-lg-none">
        <div className="container-fluid">
          {user && (
            <div className="navbar-nav flex-row mx-auto">
              {navLinks}
            </div>
          )}

          {user ? (
            <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm">
              Logout
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}

export default Navbar
