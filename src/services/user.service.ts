import { supabase } from '@/lib/supabase/client';

export interface AuthorizedUser {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'gerente' | 'colaborador';
  status: 'ativo' | 'inativo' | 'pendente';
  created_at: string;
}

export class UserService {
  static async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    const { data, error } = await supabase
      .from('authorized_users')
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  }

  static async addAuthorizedUser(userId: string, email: string, role: AuthorizedUser['role']): Promise<void> {
    const { error } = await supabase
      .from('authorized_users')
      .insert({
        user_id: userId,
        email: email,
        role,
        status: 'ativo'
      });

    if (error) {
      throw error;
    }
  }

  static async updateUserRole(userId: string, role: AuthorizedUser['role']): Promise<void> {
    const { error } = await supabase
      .from('authorized_users')
      .update({ role })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  static async updateUserStatus(userId: string, status: AuthorizedUser['status']): Promise<void> {
    const { error } = await supabase
      .from('authorized_users')
      .update({ status })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  static async removeAuthorizedUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('authorized_users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  static async checkUserAuthorization(userId: string): Promise<AuthorizedUser | null> {
    const { data, error } = await supabase
      .from('authorized_users')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }
}