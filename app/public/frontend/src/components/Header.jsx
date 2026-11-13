import { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = event => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const selectTab = tab => {
    setActiveTab(tab)
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

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
            <button className={`tab ${activeTab === 'start' ? 'active' : ''}`} onClick={() => setActiveTab('start')}>Start</button>
            <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
            <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
            {user ? (
              <>
                {isAdmin && (
                  <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
                )}
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
              </>
            ) : null}
            <div className="header-menu" ref={menuRef}>
              <button
                ref={menuButtonRef}
                className={`tab header-menu-toggle${['directory', 'contact', 'integrity-policy', 'tfa', 'Documents'].includes(activeTab) ? ' active' : ''}`}
                type="button"
                aria-label={menuOpen ? 'Close additional navigation options' : 'Open additional navigation options'}
                aria-expanded={menuOpen}
                aria-controls="header-more-menu"
                onClick={() => setMenuOpen(open => !open)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div
                className="header-menu-panel"
                id="header-more-menu"
                hidden={!menuOpen}
              >
                {user && (
                  <button
                    className={`tab ${activeTab === 'directory' ? 'active' : ''}`}
                    type="button"
                    onClick={() => selectTab('directory')}
                  >
                    Medlemskatalog
                  </button>
                )}
                <button
                  className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
                  type="button"
                  onClick={() => selectTab('contact')}
                >
                  Kontakta oss
                </button>
                <button
                  className={`tab ${activeTab === 'integrity-policy' ? 'active' : ''}`}
                  type="button"
                  onClick={() => selectTab('integrity-policy')}
                >
                  Integritetspolicy
                </button>
                {user && (
                  <>
                    <button
                      className={`tab ${activeTab === 'tfa' ? 'active' : ''}`}
                      type="button"
                      onClick={() => selectTab('tfa')}
                    >
                      TFA Deals
                    </button>
                    <button
                      className={`tab ${activeTab === 'Documents' ? 'active' : ''}`}
                      type="button"
                      onClick={() => selectTab('Documents')}
                    >
                      Document Library
                    </button>
                  </>
                )}
              </div>
            </div>
            {!user && <button className="tab" onClick={onRequestLogin}>Log in</button>}
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header