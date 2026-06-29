import { createContext, useState, useContext } from 'react';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('adminInfo')));
  const login = (data) => { setUser(data); localStorage.setItem('adminInfo', JSON.stringify(data)); };
  const logout = () => { setUser(null); localStorage.removeItem('adminInfo'); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
