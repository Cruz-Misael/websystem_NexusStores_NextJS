import { supabase } from '@/lib/supabase/client';

export interface AuthorizedUser {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'gerente' | 'colaborador';
  status: 'ativo' | 'inativo' | 'pendente';
  created_at: string;
  full_name?: string;
  phone?: string;
  department?: string;
  permissions?: string[];
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

  static async updateAuthorizedUser(userId: string, updates: Partial<AuthorizedUser>): Promise<void> {
    const { error } = await supabase
      .from('authorized_users')
      .update(updates)
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

  static async updateUserPassword(userId: string, password: string): Promise<void> {
    const response = await fetch('/api/update-user-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password }),
    });

    if (!response.ok) {
      const result = await response.json();
      // Joga um erro com a mensagem vinda da API para ser capturada no toast
      throw new Error(result.error || 'Falha ao atualizar a senha.');
    }
  }
}