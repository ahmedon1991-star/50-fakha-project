import { createContext, useState, useContext } from 'react';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userInfo')));
  const login = (data) => { setUser(data); localStorage.setItem('userInfo', JSON.stringify(data)); };
  const logout = () => { setUser(null); localStorage.removeItem('userInfo'); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
