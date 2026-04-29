import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and Anon Key
const supabaseUrl = 'https://acumddrspbeuepedvnup.supabase.co';
const supabaseKey = 'sb_publishable_niqY6BT1R8mlBr3dIPNANQ_HAGGpIxU';


export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Keep session alive in localStorage so refresh works across tabs
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ═══════════════════════════════════════════════════════════════════════════
// Database Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

export const dbHelpers = {

  /**
   * CREATE USER PROFILE AFTER SIGNUP
   * Saves user to user_profiles table.
   * Uses upsert so it never fails if the row already exists.
   */
  async createUserProfile(profile: {
    user_id: string
    name: string
    email: string
    role?: string
    account_type?: string
    org_name?: string
    subdomain?: string
  }) {
    try {
      if (!profile.user_id || !profile.email) {
        return { data: null, error: new Error('user_id and email are required') }
      }

      const userData = {
        user_id:      profile.user_id,
        name:         profile.name || 'User',
        email:        profile.email,
        role:         profile.role || 'viewer',   // ← always viewer by default
        account_type: profile.account_type || 'individual',
        org_name:     profile.org_name    || null,
        subdomain:    profile.subdomain   || null,
        is_online:    false,
        last_seen:    new Date().toISOString(),
        last_login:   new Date().toISOString(),
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }

      // upsert: insert or update if user_id already exists
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert([userData], { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        console.error('DB error creating profile:', error)
        return { data: null, error }
      }

      console.log('✅ User profile saved:', data)
      return { data, error: null }

    } catch (err) {
      console.error('Exception creating profile:', err)
      return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
  },

  /**
   * GET CURRENT USER'S PROFILE
   */
  async getMyProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  /**
   * GET ALL USER PROFILES (ADMIN)
   */
  async getAllProfiles() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all profiles:', error)
        return { data: [], error }
      }
      return { data: data || [], error: null }
    } catch (err) {
      return { data: [], error: err }
    }
  },

  /**
   * UPDATE USER ROLE
   */
  async updateUserRole(userId: string, role: 'viewer' | 'editor' | 'admin' | 'super_admin') {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating role:', error)
        return { data: null, error }
      }
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  /**
   * UPDATE USER ONLINE/OFFLINE PRESENCE
   */
  async updatePresence(userId: string, isOnline: boolean) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) console.error('Error updating presence:', error)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  /**
   * UPDATE LAST LOGIN TIMESTAMP
   */
  async updateLastLogin(userId: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) console.error('Error updating last login:', error)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  /**
   * CHECK IF ANY ADMIN EXISTS
   * Used to make the very first signup an admin automatically.
   */
  async checkIfAdminExists() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'super_admin'])
        .limit(1)

      if (error) {
        console.error('Error checking admin:', error)
        return false
      }
      return (data?.length ?? 0) > 0
    } catch {
      return false
    }
  },

  /**
   * SOFT-DELETE USER (ADMIN ONLY)
   */
  async deleteUser(userId: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)

      return { error }
    } catch (err) {
      return { error: err }
    }
  },
}