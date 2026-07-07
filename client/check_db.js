const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read keys from parent root .env
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env not found in parent directory');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1]?.trim() || envContent.match(/SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    console.log('App Settings Row 1 Keys:', data ? Object.keys(data) : 'No data');
    console.log('App Settings Row 1 Values:', data);
  } catch (err) {
    console.error('Error fetching app settings:', err.message);
  }
}

check();
