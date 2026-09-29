import { useState, useEffect } from 'react'
import { login, fetchEvents, fetchUserProfile, formatACFDate, getAuthHeader, createEventSignup, fetchEventSignups, fetchMembers, fetchTFADeals, createTFADeal, fetchSeekingPosts, createSeekingPost } from './api'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [tfaDeals, setTfaDeals] = useState([])
  const [seekingPosts, setSeekingPosts] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('events')
  const [signups, setSignups] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [dealForm, setDealForm] = useState({ toMember: '', amount: '' })
  const [seekingForm, setSeekingForm] = useState({ description: '', category: 'Supplier' })

  // Restore session on load
  useEffect(() => {
    const savedUser = sessionStorage.getItem('fenix_user')
    const savedAuth = sessionStorage.getItem('fenix_auth')
    if (savedUser && savedAuth) {
      setUser(JSON.parse(savedUser))
      fetchUserProfile(savedAuth).then(setProfile).catch(() => {})
      loadUserSignups(savedAuth, JSON.parse(savedUser).id)
    }
  }, [])

  // Fetch events
  useEffect(() => {
    fetchEvents()
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Fetch members when tab is opened
  useEffect(() => {
    if (activeTab === 'members' && user) {
      fetchMembers()
        .then(data => setMembers(data))
        .catch(err => setError(err.message))
    }
  }, [activeTab, user])

  // Fetch TFA deals when tab is opened
  useEffect(() => {
    if (activeTab === 'tfa' && user) {
      fetchTFADeals()
        .then(data => setTfaDeals(data))
        .catch(err => setError(err.message))
    }
  }, [activeTab, user])

  // Fetch seeking posts when tab is opened
  useEffect(() => {
    if (activeTab === 'seeking' && user) {
      fetchSeekingPosts()
        .then(data => setSeekingPosts(data))
        .catch(err => setError(err.message))
    }
  }, [activeTab, user])

  const loadUserSignups = async (authHeader, memberId) => {
    try {
      const allSignups = await fetchEventSignups()
      const userSignups = allSignups.filter(s => s.acf?.member_id === memberId)
      const signupMap = {}
      userSignups.forEach(s => {
        signupMap[s.acf.event_id] = true
      })
      setSignups(signupMap)
    } catch (err) {
      console.error('Failed to load signups:', err)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const userData = await login(username, password)
      const authHeader = getAuthHeader(username, password)
      setUser(userData)
      sessionStorage.setItem('fenix_user', JSON.stringify(userData))
      sessionStorage.setItem('fenix_auth', authHeader)
      const prof = await fetchUserProfile(authHeader)
      setProfile(prof)
      loadUserSignups(authHeader, userData.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setProfile(null)
    setSignups({})
    setSelectedMember(null)
    setTfaDeals([])
    setSeekingPosts([])
    sessionStorage.removeItem('fenix_user')
    sessionStorage.removeItem('fenix_auth')
  }

  const handleSignup = async (eventId) => {
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      await createEventSignup(authHeader, user.id, eventId)
      setSignups(prev => ({ ...prev, [eventId]: true }))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateDeal = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const result = await createTFADeal(authHeader, user.id, parseInt(dealForm.toMember), dealForm.amount)
      setTfaDeals(prev => [result, ...prev])
      setDealForm({ toMember: '', amount: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateSeeking = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const authHeader = sessionStorage.getItem('fenix_auth')
      const result = await createSeekingPost(authHeader, seekingForm.description, seekingForm.category)
      setSeekingPosts(prev => [result, ...prev])
      setSeekingForm({ description: '', category: 'Supplier' })
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase()
    const name = m.name?.toLowerCase() || ''
    const company = m.acf?.company?.toLowerCase() || ''
    const interests = m.acf?.interests?.toLowerCase() || ''
    return name.includes(q) || company.includes(q) || interests.includes(q)
  })

  if (loading) return <div className="status">Loading...</div>

  return (
    <div className="app">
      <header>
        <h1>Affärsnätverket Fenix</h1>
        <p>Member Portal</p>
        {user ? (
          <div className="user-bar">
            <span>Welcome, <strong>{user.name}</strong></span>
            <button onClick={handleLogout} className="btn btn-logout">Log out</button>
          </div>
        ) : null}
      </header>

      <main>
        {!user ? (
          <section className="login-section">
            <h2>Member Login</h2>
            {error && <p className="error-msg">{error}</p>}
            <form onSubmit={handleLogin}>
              <label>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label>
                Application Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-login">Log in</button>
            </form>
          </section>
        ) : (
          <>
            <nav className="tabs">
              <button
                className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                onClick={() => { setActiveTab('events'); setSelectedMember(null) }}
              >Events</button>
              <button
                className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => { setActiveTab('profile'); setSelectedMember(null) }}
              >My Profile</button>
              <button
                className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => { setActiveTab('members'); setSelectedMember(null) }}
              >Members</button>
              <button
                className={`tab ${activeTab === 'tfa' ? 'active' : ''}`}
                onClick={() => { setActiveTab('tfa'); setSelectedMember(null) }}
              >TFA Deals</button>
              <button
                className={`tab ${activeTab === 'seeking' ? 'active' : ''}`}
                onClick={() => { setActiveTab('seeking'); setSelectedMember(null) }}
              >Seeking</button>
            </nav>

            {activeTab === 'events' && (
              <section>
                <h2>Upcoming Events</h2>
                {error && <p className="error-msg">{error}</p>}
                {events.length === 0 ? (
                  <p>No events found.</p>
                ) : (
                  <ul className="event-list">
                    {events.map(event => (
                      <li key={event.id} className="event-card">
                        <h3>{event.title.rendered}</h3>
                        <p><strong>Date:</strong> {formatACFDate(event.acf?.event_date)}</p>
                        <p><strong>Location:</strong> {event.acf?.location || 'TBD'}</p>
                        <p><strong>Max Attendees:</strong> {event.acf?.max_attendees || 'N/A'}</p>
                        {signups[event.id] ? (
                          <span className="signed-up-badge">✓ Signed Up</span>
                        ) : (
                          <button
                            onClick={() => handleSignup(event.id)}
                            className="btn btn-signup"
                          >Sign Up</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {activeTab === 'profile' && (
              <section className="profile-section">
                <h2>My Profile</h2>
                {!profile ? (
                  <p>Loading profile...</p>
                ) : (
                  <div className="profile-card">
                    <h3>{profile.name}</h3>
                    <table className="profile-table">
                      <tbody>
                        <tr><td>Username</td><td>{profile.username}</td></tr>
                        <tr><td>Email</td><td>{profile.email || 'Not set'}</td></tr>
                        <tr><td>Company</td><td>{profile.acf?.company || 'Not set'}</td></tr>
                        <tr><td>Phone</td><td>{profile.acf?.phone || 'Not set'}</td></tr>
                        <tr><td>Bio</td><td>{profile.acf?.bio || 'No bio yet.'}</td></tr>
                        <tr><td>Interests</td><td>{profile.acf?.interests || 'Not set'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'members' && !selectedMember && (
              <section className="members-section">
                <h2>All Members</h2>
                <input
                  type="text"
                  placeholder="Search by name, company or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {filteredMembers.length === 0 ? (
                  <p>No members found.</p>
                ) : (
                  <ul className="member-list">
                    {filteredMembers.map(member => (
                      <li
                        key={member.id}
                        className="member-card"
                        onClick={() => setSelectedMember(member)}
                      >
                        <div className="member-avatar">
                          {member.acf?.avatar_url ? (
                            <img src={member.acf.avatar_url} alt={member.name} />
                          ) : (
                            <span className="avatar-placeholder">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="member-info">
                          <h3>{member.name}</h3>
                          <p>{member.acf?.company || 'No company set'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {activeTab === 'members' && selectedMember && (
              <section className="profile-section">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="btn btn-back"
                >← Back to Members</button>
                <div className="profile-card">
                  <h3>{selectedMember.name}</h3>
                  <table className="profile-table">
                    <tbody>
                      <tr><td>Company</td><td>{selectedMember.acf?.company || 'Not set'}</td></tr>
                      <tr><td>Phone</td><td>{selectedMember.acf?.phone || 'Not set'}</td></tr>
                      <tr><td>Bio</td><td>{selectedMember.acf?.bio || 'No bio yet.'}</td></tr>
                      <tr><td>Interests</td><td>{selectedMember.acf?.interests || 'Not set'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'tfa' && (
              <section className="tfa-section">
                <h2>Tack för affären — Business Exchange</h2>
                <form onSubmit={handleCreateDeal} className="deal-form">
                  <label>
                    To Member ID
                    <input
                      type="number"
                      value={dealForm.toMember}
                      onChange={(e) => setDealForm({...dealForm, toMember: e.target.value})}
                      required
                    />
                  </label>
                  <label>
                    Deal Amount
                    <input
                      type="text"
                      placeholder="e.g. 50 000 SEK"
                      value={dealForm.amount}
                      onChange={(e) => setDealForm({...dealForm, amount: e.target.value})}
                      required
                    />
                  </label>
                  <button type="submit" className="btn btn-deal">Record Deal</button>
                </form>

                <h3>All Deals</h3>
                {error && <p className="error-msg">{error}</p>}
                {tfaDeals.length === 0 ? (
                  <p>No deals recorded yet.</p>
                ) : (
                  <ul className="deal-list">
                    {tfaDeals.map(deal => (
                      <li key={deal.id} className="deal-card">
                        <p><strong>{deal.acf?.from_member}</strong> → <strong>{deal.acf?.to_member}</strong></p>
                        <p>Amount: {deal.acf?.deal_amount || 'N/A'}</p>
                        <p className="deal-date">{formatACFDate(deal.date.substring(0,10).replace(/-/g,''))}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {activeTab === 'seeking' && (
              <section className="seeking-section">
                <h2>Seeking & Offering</h2>
                <form onSubmit={handleCreateSeeking} className="seeking-form">
                  <label>
                    What are you looking for?
                    <textarea
                      value={seekingForm.description}
                      onChange={(e) => setSeekingForm({...seekingForm, description: e.target.value})}
                      rows="3"
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={seekingForm.category}
                      onChange={(e) => setSeekingForm({...seekingForm, category: e.target.value})}
                    >
                      <option value="Supplier">Supplier</option>
                      <option value="Customer">Customer</option>
                      <option value="Partner">Partner</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <button type="submit" className="btn btn-seeking">Post Seeking</button>
                </form>

                <h3>All Seeking Posts</h3>
                {error && <p className="error-msg">{error}</p>}
                {seekingPosts.length === 0 ? (
                  <p>No seeking posts yet.</p>
                ) : (
                  <ul className="seeking-list">
                    {seekingPosts.map(post => (
                      <li key={post.id} className={`seeking-card category-${post.acf?.category?.toLowerCase()}`}>
                        <span className="category-badge">{post.acf?.category}</span>
                        <p>{post.acf?.description}</p>
                        <p className="deal-date">{formatACFDate(post.date.substring(0,10).replace(/-/g,''))}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App