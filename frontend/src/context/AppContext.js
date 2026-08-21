"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { catalogAPI, cartAPI } from '@/lib/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'undefined' && storedUser !== '[object Object]') {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('user');
          storedUser = null;
        }
      } else {
        storedUser = null;
      }
      
      try {
        const prods = await catalogAPI.getProducts();
        setProducts(prods);
        
        if (storedUser) {
          const userCart = await cartAPI.getCart();
          setCart(userCart);
        }
      } catch (err) {
        console.error("Error init app", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    cartAPI.getCart().then(setCart).catch(console.error);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setCart({ items: [], total: 0 });
  };

  const refreshProducts = async () => {
    try {
      const prods = await catalogAPI.getProducts();
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCart = async () => {
    if (!user) return;
    try {
      const updatedCart = await cartAPI.getCart();
      setCart(updatedCart);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppContext.Provider value={{ user, login, logout, cart, setCart, refreshCart, refreshProducts, products, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
