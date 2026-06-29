import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
export default function Navbar() {
  const { totalItems } = useCart();
  return (
    <nav className="bg-green-700 text-white p-4 flex justify-between">
      <Link to="/" className="text-2xl font-bold">🍓 50 فاكهة</Link>
      <Link to="/cart" className="text-xl">🛒 {totalItems > 0 && <span className="bg-red-500 text-xs rounded-full px-1.5">{totalItems}</span>}</Link>
    </nav>
  );
}
