import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
export default function HomePage() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();
  useEffect(() => { axios.get('http://localhost:5000/api/products').then(res => setProducts(res.data)).catch(() => {}); }, []);
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-center my-6">🍉 منيو 50 فاكهة</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p._id} className="bg-white shadow rounded overflow-hidden">
            <img src={p.image} alt={p.name} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="text-green-700 font-bold mt-2">{p.price} ج.م</p>
              <button onClick={() => addToCart(p)} className="mt-3 bg-green-600 text-white px-4 py-2 rounded">أضف 🛒</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
