import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing! Please configure them in client/.env or Render environment variables.');
}

// Custom storage wrapper to support "Remember Me" dynamically
const customStorage = {
  getItem: (key) => {
    try {
      const remember = localStorage.getItem('rememberMe') === 'true';
      return remember ? localStorage.getItem(key) : sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      const remember = localStorage.getItem('rememberMe') === 'true';
      if (remember) {
        localStorage.setItem(key, value);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {}
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {}
  }
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true
      }
    })
  : null;

