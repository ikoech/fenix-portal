import '../css/Header.css'
import logo from '../assets/logo.png'


function Header({ user, onLogout, showTabs = false, activeTab, setActiveTab, setView, isAdmin }) {
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
        {user && showTabs && (
          <nav className="tabs">
            <button className="tab" onClick={() => setView('start')}>Start</button>
            {isAdmin && (
              <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
            )}
            <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
            <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
            <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
            <button className={`tab ${activeTab === 'tfa' ? 'active' : ''}`} onClick={() => setActiveTab('tfa')}>TFA Deals</button>
            <button className={`tab ${activeTab === 'seeking' ? 'active' : ''}`} onClick={() => setActiveTab('seeking')}>Seeking</button>
            <button className={`tab ${activeTab === 'Documents' ? 'active' : ''}`} onClick={() => setActiveTab('Documents')}>Document Library</button>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header