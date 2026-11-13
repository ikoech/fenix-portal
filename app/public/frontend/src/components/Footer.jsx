import '../css/Footer.css'

function Footer() {
  // eslint-disable-next-line react/no-this-in-sfc
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <img
            src="https://natverketfenix.se/wp-content/uploads/2026/04/ny_logga_streck.png"
            alt="Affärsnätverket Fenix"
            className="footer-logo"
          />
          <p className="footer-tagline">
            Ett affärsnätverk i Malmö för företagare som vill växa tillsammans.
            Varmt välkommen att besöka oss, och ansöka om medlemskap.
          </p>
          <div className="footer-social">
            <a
              href="https://www.linkedin.com/company/affarsnatverket-fenix/posts/?feedView=all"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/groups/25547640521598879"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-links-group">
          <div className="footer-column">
            <h3>Medlemsportalen</h3>
            <ul>
              <li>
                <a href="/portal?tab=members">Medlemmar</a>
              </li>
              <li>
                <a href="/om-fenix">Om Fenix</a>
              </li>
              <li>
                <a href="?tab=integrity-policy">Integritetspolicy</a>
              </li>
              <li>
                <a href="?tab=bylaws">Stadgar</a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Information</h3>
            <ul>
              <li>
                <a href="/artiklar">Artiklar</a>
              </li>
              <li>
                <a href="/portal?tab=contact">Kontakta oss</a>
              </li>
              <li>
                <a href="/bli-medlem">Bli medlem</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Copyright © {currentYear} · Nätverket Fenix</p>
        <p>Webbsida skapad av Pink Dog Media</p>
      </div>
    </footer>
  )
}

export default Footer