-- ============================================
-- VENDOR AND SCRATCH & DENT SUPPORT
-- Adds vendor tracking and scratch-and-dent product linking.
-- Run this in Supabase SQL Editor (new query).
-- ============================================

-- Add vendor to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS scratch_dent_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scratch_dent_product_id UUID;

-- Rename po_number to invoice_number semantically (keep column name for compat)
-- The UI will label it "Invoice #" instead of "PO Number"

-- Add default scratch & dent product link to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_scratch_dent_product_id UUID;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor);
