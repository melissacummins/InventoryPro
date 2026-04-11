import { supabase } from '../../lib/supabase';
import type { Product, InventoryOrder } from '../../lib/types';

type ProductInsert = Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type ProductUpdate = Partial<ProductInsert>;

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function addProduct(product: ProductInsert): Promise<Product> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function adjustStock(
  productId: string,
  type: 'add' | 'subtract',
  inventoryType: 'book' | 'bundle',
  quantity: number,
  source: string,
  notes: string,
  currentValue: number,
): Promise<void> {
  const userId = await getUserId();
  const newValue = type === 'add' ? currentValue + quantity : currentValue - quantity;
  const field = inventoryType === 'book' ? 'book_inventory' : 'bundles_inventory';
  const stockField = inventoryType === 'book' ? 'book_stock' : undefined;

  const productUpdate: Record<string, unknown> = {
    [field]: Math.max(0, newValue),
    updated_at: new Date().toISOString(),
  };
  if (type === 'add' && stockField) {
    productUpdate.book_stock = (currentValue + quantity);
  }

  const { error: productError } = await supabase
    .from('products')
    .update(productUpdate)
    .eq('id', productId);
  if (productError) throw productError;

  const { error: orderError } = await supabase
    .from('inventory_orders')
    .insert({
      user_id: userId,
      product_id: productId,
      type,
      inventory_type: inventoryType,
      quantity,
      previous_value: currentValue,
      new_value: Math.max(0, newValue),
      source,
      notes,
    });
  if (orderError) throw orderError;
}
