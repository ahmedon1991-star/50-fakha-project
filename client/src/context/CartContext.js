import { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cartItems') || '[]');
      // Migrate old items that don't have cartKey
      return stored.map(item => ({
        ...item,
        cartKey: item.cartKey || (item.id || item._id)?.toString() || Math.random().toString(36)
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // addToCart supports optional selectedSize (string) and selectedPrice (number)
  const addToCart = (product, selectedSize = null, selectedPrice = null) => {
    const pid = (product.id || product._id)?.toString();
    const cartKey = selectedSize ? `${pid}_${selectedSize}` : pid;
    
    let itemPrice = selectedPrice !== null ? Number(selectedPrice) : Number(product.price);
    if (selectedPrice === null && product.discount_price !== undefined && product.discount_price !== null && Number(product.discount_price) > 0) {
      itemPrice = Number(product.discount_price);
    }

    setCartItems(prev => {
      const exist = prev.find(p => p.cartKey === cartKey);
      if (exist) {
        return prev.map(p => p.cartKey === cartKey ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        ...product,
        cartKey,
        productId: pid,
        price: itemPrice,
        selectedSize,
        quantity: 1
      }];
    });
  };

  const removeFromCart = (cartKey) => setCartItems(prev => prev.filter(p => p.cartKey !== cartKey));

  const updateQuantity = (cartKey, qty) => {
    if (qty < 1) {
      removeFromCart(cartKey);
      return;
    }
    setCartItems(prev => prev.map(p => p.cartKey === cartKey ? { ...p, quantity: qty } : p));
  };

  const clearCart = () => setCartItems([]);

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, totalAmount, totalItems, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
