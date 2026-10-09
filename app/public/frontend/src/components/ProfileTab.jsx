import '../css/ProfileTab.css'

function ProfileTab({ profile }) {
  if (!profile) return <p>Loading profile...</p>

  return (
    <section className="profile-section">
      <h2>My Profile</h2>
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
    </section>
  )
}

export default ProfileTab