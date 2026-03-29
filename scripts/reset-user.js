#!/usr/bin/env node
'use strict';

/**
 * Reset a user account by email — deletes from auth.users (cascades to public.users).
 * The user can then sign up / sign in again fresh.
 *
 * Usage:
 *   node scripts/reset-user.js konakevin@gmail.com
 *   node scripts/reset-user.js                      # defaults to konakevin@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const email = process.argv[2] || 'konakevin@gmail.com';

(async () => {
  // Find user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('Error:', listErr.message); process.exit(1); }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`No user found with email: ${email}`);
    process.exit(0);
  }

  console.log(`Found user: ${email} (${user.id})`);
  console.log(`  Provider: ${user.app_metadata?.provider ?? 'email'}`);
  console.log(`  Created: ${user.created_at}`);

  // Delete
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Delete failed:', error.message);
    process.exit(1);
  }

  console.log('✓ User deleted. They can sign up / sign in again fresh.');
})();
