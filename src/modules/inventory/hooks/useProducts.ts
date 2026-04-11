import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Product } from '../../../lib/types';
import { calculateBundleInventory } from '../utils';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error && data) {
      // Auto-calculate bundle inventory based on component books
      const withBundles = data.map(product => {
        if (product.category === 'Bundle' || product.category === 'Book Box') {
          const bundleInv = calculateBundleInventory(product, data);
          return { ...product, bundles_inventory: bundleInv };
        }
        return product;
      });
      setProducts(withBundles);
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
