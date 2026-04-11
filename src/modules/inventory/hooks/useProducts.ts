import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Product } from '../../../lib/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}
