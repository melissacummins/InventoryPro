import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ShopifySettings, ShopifyOrder, ShopifySyncLog } from '../../../lib/types';

export function useShopifySettings() {
  const [settings, setSettings] = useState<ShopifySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('shopify_settings')
      .select('*')
      .maybeSingle();
    if (!error) setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

export function useShopifyOrders(locationId?: string) {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('shopify_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (!error && data) setOrders(data);
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('shopify-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

export function useSyncLogs() {
  const [logs, setLogs] = useState<ShopifySyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('shopify_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
