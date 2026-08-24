import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="site-logo">CFR AV</Link>
      <nav className="nav-links" />
    </header>
  );
}

export default Navbar;
