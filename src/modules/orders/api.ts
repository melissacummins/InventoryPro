import { supabase } from '../../lib/supabase';
import type { ShopifySettings, ShopifyOrder, ShopifySyncLog } from '../../lib/types';

type ShopifySettingsInsert = {
  store_url: string;
  client_id: string;
  client_secret: string;
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ---- Shopify Settings ----

export async function getShopifySettings(): Promise<ShopifySettings | null> {
  const { data, error } = await supabase
    .from('shopify_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveShopifySettings(settings: ShopifySettingsInsert): Promise<ShopifySettings> {
  const userId = await getUserId();
  const existing = await getShopifySettings();

  if (existing) {
    const { data, error } = await supabase
      .from('shopify_settings')
      .update({
        store_url: settings.store_url,
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('shopify_settings')
    .insert({ ...settings, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- OAuth Token Exchange ----

export async function exchangeOAuthCode(code: string): Promise<{ success: boolean; scope?: string }> {
  const { data, error } = await supabase.rpc('shopify_exchange_token', {
    p_code: code,
  });

  if (error) throw new Error(error.message || 'Token exchange failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export function getShopifyOAuthUrl(storeUrl: string, clientId: string, redirectUri: string): string {
  const scopes = 'read_orders,read_products,read_locations';
  return `https://${storeUrl}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function updateDefaultLocation(locationId: string, locationName: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('shopify_settings')
    .update({
      default_location_id: locationId,
      default_location_name: locationName,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteShopifySettings(): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('shopify_settings')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ---- Shopify API Proxy (via Database Function) ----

async function callShopifyProxy(action: string, params?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('shopify_proxy', {
    action,
    params: params || {},
  });

  if (error) throw new Error(error.message || 'Shopify proxy call failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function testShopifyConnection(): Promise<{ shop: { name: string; domain: string } }> {
  return callShopifyProxy('test_connection');
}

export async function fetchShopifyLocations() {
  const data = await callShopifyProxy('get_locations');
  return data.locations || [];
}

export interface FetchOrdersParams {
  created_at_min?: string;
  created_at_max?: string;
  status?: string;
  limit?: number;
  page_info?: string;
}

export async function fetchShopifyOrders(params?: FetchOrdersParams) {
  const data = await callShopifyProxy('get_orders', params);
  return {
    orders: data.orders || [],
    nextPageInfo: data.nextPageInfo || null,
  };
}

// ---- Synced Orders (local DB) ----

export async function getSyncedOrders(locationId?: string): Promise<ShopifyOrder[]> {
  let query = supabase
    .from('shopify_orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertOrders(orders: Omit<ShopifyOrder, 'id' | 'synced_at'>[]): Promise<number> {
  if (orders.length === 0) return 0;

  const { error } = await supabase
    .from('shopify_orders')
    .upsert(orders, { onConflict: 'user_id,shopify_order_id' });

  if (error) throw error;
  return orders.length;
}

export async function clearSyncedOrders(): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('shopify_orders')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ---- Sync Log ----

export async function getSyncLogs(limit = 10): Promise<ShopifySyncLog[]> {
  const { data, error } = await supabase
    .from('shopify_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function logSync(entry: Omit<ShopifySyncLog, 'id' | 'user_id' | 'created_at'>): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('shopify_sync_log')
    .insert({ ...entry, user_id: userId });
  if (error) throw error;
}

// ---- Update last sync timestamp ----

export async function updateLastSync(): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('shopify_settings')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// ---- Update product purchase counts from order data ----

export async function updateProductPurchaseCounts(
  updates: { productId: string; booksPurchased: number; purchasedViaBundles: number }[]
): Promise<void> {
  for (const u of updates) {
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (u.booksPurchased > 0) updateFields.books_purchased = u.booksPurchased;
    if (u.purchasedViaBundles > 0) updateFields.purchased_via_bundles = u.purchasedViaBundles;

    const { error } = await supabase
      .from('products')
      .update(updateFields)
      .eq('id', u.productId);
    if (error) throw error;
  }
}
