import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import type { Profile } from '@/types/profile';

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email, display_name, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Profile | null) ?? null;
}

// Looks up a profile by email so the owner can add a collaborator by address.
// Only approved users can read other profiles (enforced by RLS), so an
// unapproved caller will get null even for an existing email.
export async function findProfileByEmail(
  email: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email, display_name, created_at')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Profile | null) ?? null;
}
