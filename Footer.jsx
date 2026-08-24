function Footer() {
  return (
    <footer className="footer">
      <div className="footer-separator">
        <div className="footer-inner">
          <p className="footer-title">COMMANDES &amp; INFOS</p>
          <p className="footer-line">
            <span className="mail-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <polyline points="4,7 12,13 20,7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            Simon Poirson – cfrav@proton.me – 06 11 47 08 23
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
