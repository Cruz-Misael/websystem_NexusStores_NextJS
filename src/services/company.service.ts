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
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export class CompanyService {
  static async getCompany(): Promise<CompanyData | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    return data?.[0] ?? null;
  }

  static async saveCompany(companyData: Partial<CompanyData>): Promise<CompanyData> {
    const payload = { ...companyData, updated_at: new Date().toISOString() };

    if (companyData.id) {
      const { data, error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', companyData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('companies')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
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