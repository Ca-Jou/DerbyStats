import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const desktopNavLinks = (
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

  const mobileNavLinks = (
    <>
      <Link
        to="/"
        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <i className="bi bi-house-fill me-2"></i>
        Home
      </Link>
      <Link
        to="/games"
        className={`nav-link ${location.pathname === '/games' ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <i className="bi bi-trophy-fill me-2"></i>
        Games
      </Link>
      <Link
        to="/teams"
        className={`nav-link ${location.pathname === '/teams' ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <i className="bi bi-people-fill me-2"></i>
        Teams
      </Link>
      <Link
        to="/skaters"
        className={`nav-link ${location.pathname === '/skaters' ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <i className="bi bi-person-fill me-2"></i>
        Skaters
      </Link>
    </>
  )

  return (
    <>
      {/* Desktop sidebar - visible on large screens */}
      <nav className="sidebar d-none d-lg-flex flex-column bg-light">
        <Link className="navbar-brand p-3 text-center border-bottom text-dark" to="/">
          DerbyStats
        </Link>

        {user && (
          <div className="nav flex-column flex-grow-1 p-3">
            {desktopNavLinks}
          </div>
        )}

        {user ? (
          <div className="sidebar-footer p-3 border-top">
            <div className="mb-2 small text-truncate text-center">{user.email}</div>
            <button onClick={handleLogout} className="btn btn-outline-primary btn-sm w-100">
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

      {/* Mobile top navbar with burger menu - visible on small screens */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light d-lg-none">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            DerbyStats
          </Link>

          {user && (
            <>
              <button
                className="navbar-toggler"
                type="button"
                onClick={toggleMenu}
                aria-controls="mobileNavbar"
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="mobileNavbar">
                <div className="navbar-nav ms-auto">
                  {mobileNavLinks}
                  <hr className="my-2" />
                  <div className="nav-item px-3 py-2">
                    <div className="small text-muted mb-2">{user.email}</div>
                    <button onClick={handleLogout} className="btn btn-outline-primary btn-sm w-100">
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!user && (
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
