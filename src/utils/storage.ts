import type { Submission, StaffApplicationForm, ContactForm, AIReview } from '../types';
import { supabase } from './supabase';

const ADMIN_KEY = 'admin_authenticated';
const TABLE = 'submissions';

function toSubmission(row: any): Submission {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    timestamp: row.timestamp,
    read: row.read,
    aiReview: row.ai_review || undefined,
  };
}

export async function saveSubmission(
  type: 'support' | 'staff-application',
  data: StaffApplicationForm | ContactForm
): Promise<Submission | null> {
  try {
    const { data: result, error } = await supabase
      .from(TABLE)
      .insert({ type, data, read: false })
      .select()
      .single();

    if (error) {
      console.error('Error saving:', error);
      return null;
    }

    return toSubmission(result);
  } catch (error) {
    console.error('Error saving:', error);
    return null;
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching:', error);
      return [];
    }

    return (data || []).map(toSubmission);
  } catch (error) {
    console.error('Error fetching:', error);
    return [];
  }
}

export async function markAsRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ read: true })
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function markAsUnread(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ read: false })
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function deleteSubmission(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function clearAllSubmissions(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return !error;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    return error ? 0 : (count || 0);
  } catch (error) {
    console.error('Error:', error);
    return 0;
  }
}

export async function updateSubmissionAIReview(
  id: string,
  aiReview: AIReview
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ ai_review: aiReview })
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export function setAdminAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem(ADMIN_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_KEY);
  }
}

export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(ADMIN_KEY) === 'true';
}



