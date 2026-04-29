import { supabase } from '@/lib/supabase/client';

export interface CompanyData {
  id?: string;
  name: string;
  fantasy_name: string;
  description: string;
  cnpj: string;
  phone: string;
  email: string;
  website: string;
  logo_url?: string;
}

export class CompanyService {
  static async getCompany(): Promise<CompanyData | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return data;
  }

  static async saveCompany(companyData: CompanyData): Promise<CompanyData> {
    const { data, error } = await supabase
      .from('companies')
      .upsert({
        ...companyData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async uploadLogo(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}