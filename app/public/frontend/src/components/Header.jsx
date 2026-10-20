import '../css/Header.css'
import logo from '../assets/logo.png'


function Header({ user, onLogout }) {
  return (
    <header className="site-header">
      <div className="header-inner">

<a href="/" className="header-logo-link">
  <img
    src="https://natverketfenix.se/wp-content/uploads/2026/04/ny_logga_streck.png"
    alt="Affärsnätverket Fenix"
    className="header-logo"
  />
</a>
        {user && (
          <div className="user-bar">
            <span>Welcome, <strong>{user.name}</strong></span>
            <button onClick={onLogout} className="btn-logout">Log out</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header