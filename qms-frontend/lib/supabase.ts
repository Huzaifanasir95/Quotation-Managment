import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for the database
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'sales' | 'procurement' | 'finance' | 'auditor'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// Auth functions
export const signUp = async (email: string, password: string, firstName: string, lastName: string, role: string = 'sales') => {
  try {
    // First create the auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (authData.user) {
      // Then create the user record in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            password_hash: '', // This will be handled by Supabase Auth
            first_name: firstName,
            last_name: lastName,
            role: role as any,
            is_active: true,
          },
        ])
        .select()

      if (userError) throw userError

      return { user: authData.user, profile: userData[0] }
    }

    throw new Error('User creation failed')
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Update last login
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    return data
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Get user profile from our users table
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error

    return { user, profile }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}
