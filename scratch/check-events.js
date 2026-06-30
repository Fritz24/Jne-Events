import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const getEnvVal = (key) => {
  const match = envContent.match(new RegExp(`${key}\\s*=\\s*(.*)`));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
};

const supabase = createClient(
  getEnvVal('VITE_SUPABASE_URL'),
  getEnvVal('VITE_SUPABASE_ANON_KEY')
);

async function checkEvents() {
  const { data: events, error } = await supabase.from('jne_events').select('id, title, date');
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }
  console.log('Events in DB:', events);
}

checkEvents();
