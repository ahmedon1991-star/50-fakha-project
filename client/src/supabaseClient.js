import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing! Please configure them in client/.env');
}

// Custom storage wrapper to support "Remember Me" dynamically
const customStorage = {
  getItem: (key) => {
    const remember = localStorage.getItem('rememberMe') === 'true';
    return remember ? localStorage.getItem(key) : sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    const remember = localStorage.getItem('rememberMe') === 'true';
    if (remember) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true
  }
});
