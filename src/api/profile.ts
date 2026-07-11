import { supabase } from '@/lib/supabase/client';

export async function getDisplayName(userId: string): Promise<string> {
  const { data, error } = await supabase.from('profile').select('display_name').eq('id', userId).single();
  if (error || !data) return 'there';
  return data.display_name;
}
