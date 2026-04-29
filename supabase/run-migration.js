#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://acumddrspbeuepedvnup.supabase.co';
const supabaseKey = 'sb_publishable_niqY6BT1R8mlBr3dIPNANQ_HAGGpIxU';

const sql = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'employee',
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
`;

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { error } = await supabase.rpc('exec', { sql_query: sql });
  
  if (error) {
    console.log('RPC method not available. Please run this SQL manually in Supabase Dashboard:');
    console.log('Go to SQL Editor and paste the contents of supabase/migrations/001_initial_schema.sql');
  } else {
    console.log('Migration completed successfully!');
  }
}

runMigration();