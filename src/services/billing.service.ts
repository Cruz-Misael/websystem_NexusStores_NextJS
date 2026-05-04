import { supabase } from "@/src/lib/supabase/client";

export interface BillingConfig {
  id?: string;
  plan_type: 'monthly' | 'annual';
  billing_start_date: string;
  due_day: number;
  next_due_date: string;
  last_payment_date?: string | null;
  status: 'active' | 'overdue' | 'locked';
  notes?: string | null;
  pix_code?: string | null;
}

export type BillingStatus = 'active' | 'overdue' | 'locked';

export function calcularProximoVencimento(
  planType: 'monthly' | 'annual',
  dueDay: number,
  referenceDate: string
): string {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (planType === 'annual') {
    const start = new Date(referenceDate + 'T12:00:00');
    const nextDue = new Date(start);
    nextDue.setFullYear(nextDue.getFullYear() + 1);
    while (nextDue <= hoje) {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    }
    return nextDue.toISOString().split('T')[0];
  }

  // Mensal: próxima ocorrência do dia de cobrança
  const day = Math.min(dueDay, 28);
  const candidate = new Date(hoje.getFullYear(), hoje.getMonth(), day);
  candidate.setHours(12, 0, 0, 0);
  if (candidate <= hoje) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toISOString().split('T')[0];
}

export function calcularStatus(nextDueDate: string): BillingStatus {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(nextDueDate + 'T12:00:00');
  const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

  if (diasAtraso <= 0) return 'active';
  if (diasAtraso <= 10) return 'overdue';
  return 'locked';
}

export function diasAtraso(nextDueDate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(nextDueDate + 'T12:00:00');
  return Math.max(0, Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));
}

export const BillingService = {
  async getBilling(): Promise<BillingConfig | null> {
    const { data, error } = await supabase
      .from('system_billing')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data || null;
  },

  async saveBilling(config: Omit<BillingConfig, 'id' | 'status'>): Promise<BillingConfig> {
    const status = calcularStatus(config.next_due_date);

    const { data: existing } = await supabase
      .from('system_billing')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('system_billing')
        .update({ ...config, status })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await supabase
      .from('system_billing')
      .insert([{ ...config, status }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async registrarPagamento(): Promise<BillingConfig> {
    const billing = await this.getBilling();
    if (!billing) throw new Error('Nenhuma configuração de cobrança encontrada.');

    const hoje = new Date().toISOString().split('T')[0];
    const nextDue = calcularProximoVencimento(billing.plan_type, billing.due_day, hoje);

    const { data, error } = await supabase
      .from('system_billing')
      .update({ last_payment_date: hoje, next_due_date: nextDue, status: 'active' })
      .eq('id', billing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getStatus(): Promise<{ status: BillingStatus; diasAtrasoNum: number; nextDueDate: string } | null> {
    const billing = await this.getBilling();
    if (!billing) return null;
    return {
      status: calcularStatus(billing.next_due_date),
      diasAtrasoNum: diasAtraso(billing.next_due_date),
      nextDueDate: billing.next_due_date,
    };
  },
};
