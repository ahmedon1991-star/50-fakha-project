import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, is_admin')
        .eq('id', sessionUser.id)
        .single();
      
      if (error) throw error;
      
      return {
        id: sessionUser.id,
        phone: sessionUser.phone,
        email: sessionUser.email,
        token: (await supabase.auth.getSession()).data.session?.access_token,
        name: data?.name || 'عميلنا',
        isAdmin: data?.is_admin || false
      };
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      return {
        id: sessionUser.id,
        phone: sessionUser.phone,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || 'عميلنا',
        isAdmin: false
      };
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
    // 1. Sign up user with Email and Password
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (signUpError) throw signUpError;

    // 2. Immediately link and verify the phone number to trigger the SMS OTP
    const { error: updateError } = await supabase.auth.updateUser({ phone });
    if (updateError) throw updateError;

    return signUpData;
  };

  const verifyOtp = async (phone, token, name) => {
    // Verify phone OTP via type 'phone_change'
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'phone_change'
    });
    if (error) throw error;

    // Create the profile in profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: name,
          phone: phone,
          is_admin: false
        });
      if (profileError) console.error('Error inserting profile:', profileError.message);
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
