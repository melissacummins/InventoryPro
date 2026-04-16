-- ============================================
-- ENHANCED PURCHASE ORDERS
-- Adds grouping, actual quantities, and notes.
-- Run this in Supabase SQL Editor (new query).
-- ============================================

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS actual_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Index for grouping POs
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
