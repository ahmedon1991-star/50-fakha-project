import { createContext, useState, useContext, useEffect } from 'react';
const CartContext = createContext();
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => JSON.parse(localStorage.getItem('cartItems') || '[]'));
  useEffect(() => { localStorage.setItem('cartItems', JSON.stringify(cartItems)); }, [cartItems]);
  const addToCart = (product) => {
    setCartItems(prev => {
      const exist = prev.find(p => p._id === product._id);
      return exist ? prev.map(p => p._id === product._id ? { ...p, quantity: p.quantity + 1 } : p) : [...prev, { ...product, quantity: 1 }];
    });
  };
  const removeFromCart = (id) => setCartItems(prev => prev.filter(p => p._id !== id));
  const updateQuantity = (id, qty) => setCartItems(prev => prev.map(p => p._id === id ? { ...p, quantity: qty } : p));
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, totalAmount, totalItems }}>{children}</CartContext.Provider>;
};
export const useCart = () => useContext(CartContext);
