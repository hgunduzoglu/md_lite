import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Membership } from '@/types/membership';

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Returns the membership row if the current user is approved, or null if not.
// Unapproved users simply have no row, so a missing result is the expected case
// rather than an error.
export async function getCurrentUserMembership(): Promise<Membership | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_members')
    .select('user_id, role, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Membership | null) ?? null;
}
