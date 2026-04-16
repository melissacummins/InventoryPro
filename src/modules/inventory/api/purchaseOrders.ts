import { supabase } from '../../../lib/supabase';
import type { PurchaseOrder } from '../../../lib/types';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export interface POLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface CreatePOInput {
  po_number: string;
  order_date: string;
  expected_dispatch: string;
  expected_arrival: string;
  items: POLineItem[];
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPurchaseOrder(input: CreatePOInput): Promise<void> {
  const userId = await getUserId();

  const rows = input.items.map(item => ({
    user_id: userId,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    order_date: input.order_date,
    expected_dispatch: input.expected_dispatch,
    expected_arrival: input.expected_arrival,
    po_number: input.po_number,
    status: 'pending',
  }));

  const { error } = await supabase.from('purchase_orders').insert(rows);
  if (error) throw error;
}

export async function confirmArrival(
  id: string,
  actualQuantity: number,
  notes: string
): Promise<void> {
  const { data: po, error: fetchErr } = await supabase
    .from('purchase_orders')
    .select('product_id, quantity')
    .eq('id', id)
    .single();
  if (fetchErr || !po) throw new Error('Purchase order not found');

  // Update the PO status
  const { error: updateErr } = await supabase
    .from('purchase_orders')
    .update({
      status: 'arrived',
      actual_quantity: actualQuantity,
      actual_arrival: new Date().toISOString().split('T')[0],
      notes,
    })
    .eq('id', id);
  if (updateErr) throw updateErr;

  // Add to inventory
  if (actualQuantity > 0 && po.product_id) {
    const userId = await getUserId();

    // Get current product inventory
    const { data: product } = await supabase
      .from('products')
      .select('book_inventory, book_stock, category, bundles_inventory')
      .eq('id', po.product_id)
      .single();

    if (product) {
      const isBundle = product.category === 'Bundle' || product.category === 'Book Box';
      const currentInventory = isBundle ? (product.bundles_inventory || 0) : (product.book_inventory || 0);
      const newInventory = currentInventory + actualQuantity;

      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (isBundle) {
        updateFields.bundles_inventory = newInventory;
      } else {
        updateFields.book_inventory = newInventory;
        updateFields.book_stock = (product.book_stock || 0) + actualQuantity;
      }

      await supabase.from('products').update(updateFields).eq('id', po.product_id);

      // Log inventory adjustment
      await supabase.from('inventory_orders').insert({
        user_id: userId,
        product_id: po.product_id,
        type: 'add',
        inventory_type: isBundle ? 'bundle' : 'book',
        quantity: actualQuantity,
        previous_value: currentInventory,
        new_value: newInventory,
        source: 'Purchase Order',
        notes: notes || `PO arrival: ${actualQuantity} of ${po.quantity} ordered`,
      });
    }
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) throw error;
}

// Get total pending quantities per product (for showing "incoming" in product table)
export async function getPendingByProduct(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('product_id, quantity')
    .eq('status', 'pending');
  if (error) throw error;

  const pending = new Map<string, number>();
  for (const po of data || []) {
    if (po.product_id) {
      pending.set(po.product_id, (pending.get(po.product_id) || 0) + po.quantity);
    }
  }
  return pending;
}
