import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, is_admin')
        .eq('id', sessionUser.id)
        .single();
      
      if (error) throw error;
      
      const fullUser = {
        id: sessionUser.id,
        phone: sessionUser.phone,
        email: sessionUser.email,
        token: (await supabase.auth.getSession()).data.session?.access_token,
        name: data?.name || 'عميلنا',
        isAdmin: data?.is_admin || false,
        birthdate: sessionUser.user_metadata?.birthdate || '',
        gender: sessionUser.user_metadata?.gender || ''
      };
      
      localStorage.setItem('cached_user', JSON.stringify(fullUser));
      return fullUser;
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      const fallbackUser = {
        id: sessionUser.id,
        phone: sessionUser.phone,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || 'عميلنا',
        isAdmin: false,
        birthdate: sessionUser.user_metadata?.birthdate || '',
        gender: sessionUser.user_metadata?.gender || ''
      };
      localStorage.setItem('cached_user', JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  };

  useEffect(() => {
    // 1. Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        setUser(fullUser);
      } else {
        setUser(null);
        localStorage.removeItem('cached_user');
      }
      setLoading(false);
    };
    
    getInitialSession();

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        setUser(fullUser);
      } else {
        setUser(null);
        localStorage.removeItem('cached_user');
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const register = async (name, email, phone, password) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });
    if (signUpError) throw signUpError;

    return signUpData;
  };

  const verifyOtp = async (phone, token, name) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'phone_change'
    });
    if (error) throw error;

    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    setUser(null);
    localStorage.removeItem('cached_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
