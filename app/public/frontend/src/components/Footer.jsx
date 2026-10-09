import '../css/Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} Affärsnätverket Fenix. All rights reserved.</p>
        <p>Headless WordPress + React Member Portal</p>
      </div>
    </footer>
  )
}

export default Footer