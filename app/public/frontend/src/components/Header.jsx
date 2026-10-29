import '../css/Header.css'

function Header({
  user,
  onLogout,
  showTabs = false,
  activeTab,
  setActiveTab,
  isAdmin,
  showPublicTabs = false,
  onRequestLogin,
}) {
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
        {((user && showTabs) || (!user && showPublicTabs)) && (
          <nav className="tabs">
            <a className="tab" href="https://natverketfenix.se/">Start</a>
            <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
            <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
            {user ? (
              <>
                {isAdmin && (
                  <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
                )}
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
                <button className={`tab ${activeTab === 'tfa' ? 'active' : ''}`} onClick={() => setActiveTab('tfa')}>TFA Deals</button>
                <button className={`tab ${activeTab === 'seeking' ? 'active' : ''}`} onClick={() => setActiveTab('seeking')}>Seeking</button>
                <button className={`tab ${activeTab === 'Documents' ? 'active' : ''}`} onClick={() => setActiveTab('Documents')}>Document Library</button>
              </>
            ) : (
              <button className="tab" onClick={onRequestLogin}>Log in</button>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header