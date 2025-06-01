import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="navbar">
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/jupiterswap">Jupiter Swap</Link></li>
        <li><Link to="/paper-trading">Paper Trading</Link></li>
        <li><Link to="/prediction">Prediction</Link></li>
        <li><Link to="/jupiter-referral">Referral</Link></li>
      </ul>
    </nav>
  );
}
