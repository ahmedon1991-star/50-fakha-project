const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1]?.trim() || envContent.match(/SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .eq('admin_cleared', false)
      .eq('status', 'قيد الانتظار');
    if (error) throw error;
    console.log('Pending orders:', data);
  } catch (err) {
    console.error('Error fetching pending orders:', err.message);
  }
}

check();
