import './Header.css'

function Header({ user, onLogout }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="logo-area">
          <img
            src="/logo.png"
            alt="Affärsnätverket Fenix logo"
            className="site-logo"
          />
          <div className="site-info">
            <h1>Affärsnätverket Fenix</h1>
            <p>Member Portal</p>
          </div>
        </div>

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