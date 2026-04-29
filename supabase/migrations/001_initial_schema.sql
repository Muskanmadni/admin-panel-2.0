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

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations RLS policies (allow anonymous inserts for signup)
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
DROP POLICY IF EXISTS "Anyone can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Anyone can update organizations" ON organizations;

CREATE POLICY "Enable insert for everyone" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for everyone" ON organizations FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON organizations FOR UPDATE USING (true);

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

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Enable read for all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON user_profiles FOR UPDATE USING (true);

-- Create index on organizations.subdomain
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);

-- Create index on user_profiles.organization_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, name, role)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'role', 'employee'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
