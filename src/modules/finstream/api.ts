import { supabase } from '../../lib/supabase';
import type { Transaction, CategoryRule, ManualSubscription, CashFlowNote } from '../../lib/types';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ---- Transactions ----

export async function getTransactions(filters?: {
  month?: string;
  type?: 'income' | 'expense';
  category?: string;
  search?: string;
}): Promise<Transaction[]> {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });

  if (filters?.month) {
    query = query.like('date', `${filters.month}%`);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = data || [];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(t =>
      t.description.toLowerCase().includes(s) ||
      t.original_description.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s)
    );
  }
  return result;
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>): Promise<Transaction> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...tx, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, updates: Partial<Pick<Transaction, 'description' | 'category' | 'type' | 'amount'>>): Promise<void> {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function importTransactions(
  transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at'>[],
  rules: CategoryRule[]
): Promise<number> {
  const userId = await getUserId();

  const categorized = transactions.map(tx => {
    let category = tx.category;
    let type = tx.type;

    if (!category) {
      for (const rule of rules) {
        if (tx.description.toLowerCase().includes(rule.match_string.toLowerCase()) ||
            tx.original_description.toLowerCase().includes(rule.match_string.toLowerCase())) {
          category = rule.target_category;
          if (rule.type) type = rule.type;
          break;
        }
      }
    }

    return {
      ...tx,
      user_id: userId,
      category: category || 'Uncategorized',
      type: type || (tx.amount < 0 ? 'expense' : 'income') as 'income' | 'expense',
      amount: Math.abs(tx.amount),
    };
  });

  const { error } = await supabase.from('transactions').insert(categorized);
  if (error) throw error;
  return categorized.length;
}

// ---- Category Rules ----

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const { data, error } = await supabase
    .from('category_rules')
    .select('*')
    .order('match_string');
  if (error) throw error;
  return data;
}

export async function addCategoryRule(rule: Omit<CategoryRule, 'id' | 'user_id' | 'created_at'>): Promise<CategoryRule> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('category_rules')
    .insert({ ...rule, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoryRule(id: string, updates: Partial<Pick<CategoryRule, 'match_string' | 'target_category' | 'type'>>): Promise<void> {
  const { error } = await supabase.from('category_rules').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCategoryRule(id: string): Promise<void> {
  const { error } = await supabase.from('category_rules').delete().eq('id', id);
  if (error) throw error;
}

export async function recategorizeAll(): Promise<number> {
  const rules = await getCategoryRules();
  const { data: uncategorized } = await supabase
    .from('transactions')
    .select('id, description, original_description')
    .eq('category', 'Uncategorized');

  let updated = 0;
  for (const tx of uncategorized || []) {
    for (const rule of rules) {
      if (tx.description.toLowerCase().includes(rule.match_string.toLowerCase()) ||
          tx.original_description.toLowerCase().includes(rule.match_string.toLowerCase())) {
        const updateFields: Record<string, unknown> = { category: rule.target_category };
        if (rule.type) updateFields.type = rule.type;
        await supabase.from('transactions').update(updateFields).eq('id', tx.id);
        updated++;
        break;
      }
    }
  }
  return updated;
}

// ---- Subscriptions ----

export async function getSubscriptions(): Promise<ManualSubscription[]> {
  const { data, error } = await supabase
    .from('manual_subscriptions')
    .select('*')
    .order('vendor_name');
  if (error) throw error;
  return data;
}

export async function addSubscription(sub: Omit<ManualSubscription, 'id' | 'user_id' | 'created_at'>): Promise<ManualSubscription> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('manual_subscriptions')
    .insert({ ...sub, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('manual_subscriptions').delete().eq('id', id);
  if (error) throw error;
}

// ---- Cash Flow Notes ----

export async function getCashFlowNotes(): Promise<CashFlowNote[]> {
  const { data, error } = await supabase.from('cash_flow_notes').select('*').order('month', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveCashFlowNote(month: string, note: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('cash_flow_notes')
    .upsert({ user_id: userId, month, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,month' });
  if (error) throw error;
}

// ---- Monthly Summary Helpers ----

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  categoryBreakdown: { category: string; amount: number; type: 'income' | 'expense' }[];
}

export async function getMonthlySummaries(months?: number): Promise<MonthlySummary[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount, type, category')
    .order('date', { ascending: false });
  if (error) throw error;

  const monthMap = new Map<string, { income: number; expenses: number; categories: Map<string, { amount: number; type: 'income' | 'expense' }> }>();

  for (const tx of data || []) {
    const month = tx.date.substring(0, 7);
    if (!monthMap.has(month)) {
      monthMap.set(month, { income: 0, expenses: 0, categories: new Map() });
    }
    const entry = monthMap.get(month)!;
    const absAmount = Math.abs(Number(tx.amount));

    if (tx.type === 'income') {
      entry.income += absAmount;
    } else {
      entry.expenses += absAmount;
    }

    const catKey = `${tx.category}|${tx.type}`;
    const existing = entry.categories.get(catKey);
    if (existing) {
      existing.amount += absAmount;
    } else {
      entry.categories.set(catKey, { amount: absAmount, type: tx.type as 'income' | 'expense' });
    }
  }

  const summaries = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
      categoryBreakdown: Array.from(data.categories.entries()).map(([key, val]) => ({
        category: key.split('|')[0],
        ...val,
      })).sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return months ? summaries.slice(0, months) : summaries;
}

export function getUniqueCategories(transactions: Transaction[]): string[] {
  const cats = new Set(transactions.map(t => t.category).filter(Boolean));
  return Array.from(cats).sort();
}

export function getUniqueMonths(transactions: Transaction[]): string[] {
  const months = new Set(transactions.map(t => t.date.substring(0, 7)));
  return Array.from(months).sort().reverse();
}
