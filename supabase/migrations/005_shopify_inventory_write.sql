-- ============================================
-- SHOPIFY INVENTORY WRITE SUPPORT
-- Adds inventory_item_id to products and extends
-- the proxy function with inventory read/write actions.
-- Run this in Supabase SQL Editor (new query).
-- ============================================

-- Add Shopify mapping columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shopify_inventory_item_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT;

-- Replace the proxy function with an expanded version
CREATE OR REPLACE FUNCTION public.shopify_proxy(action TEXT, params JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_url TEXT;
  v_access_token TEXT;
  v_api_url TEXT;
  v_response extensions.http_response;
  v_api_version TEXT := '2024-01';
  v_body TEXT;
BEGIN
  -- Get the calling user's Shopify settings
  SELECT store_url, access_token
  INTO v_store_url, v_access_token
  FROM public.shopify_settings
  WHERE user_id = auth.uid();

  IF v_store_url IS NULL THEN
    RETURN jsonb_build_object('error', 'Shopify not configured. Please add your store credentials.');
  END IF;

  -- ---- GET requests ----

  IF action = 'test_connection' THEN
    v_api_url := format('https://%s/admin/api/%s/shop.json', v_store_url, v_api_version);

  ELSIF action = 'get_locations' THEN
    v_api_url := format('https://%s/admin/api/%s/locations.json', v_store_url, v_api_version);

  ELSIF action = 'get_orders' THEN
    IF params->>'page_info' IS NOT NULL THEN
      v_api_url := format('https://%s/admin/api/%s/orders.json?page_info=%s&limit=%s',
        v_store_url, v_api_version, params->>'page_info', COALESCE(params->>'limit', '250'));
    ELSE
      v_api_url := format('https://%s/admin/api/%s/orders.json?status=%s&limit=%s&fields=id,name,order_number,created_at,customer,fulfillment_status,financial_status,total_price,line_items,fulfillments,location_id',
        v_store_url, v_api_version, COALESCE(params->>'status', 'any'), COALESCE(params->>'limit', '250'));
      IF params->>'created_at_min' IS NOT NULL THEN
        v_api_url := v_api_url || '&created_at_min=' || (params->>'created_at_min');
      END IF;
      IF params->>'created_at_max' IS NOT NULL THEN
        v_api_url := v_api_url || '&created_at_max=' || (params->>'created_at_max');
      END IF;
    END IF;

  ELSIF action = 'get_products' THEN
    v_api_url := format('https://%s/admin/api/%s/products.json?limit=250&fields=id,title,variants',
      v_store_url, v_api_version);
    IF params->>'since_id' IS NOT NULL THEN
      v_api_url := v_api_url || '&since_id=' || (params->>'since_id');
    END IF;
    IF params->>'page_info' IS NOT NULL THEN
      v_api_url := format('https://%s/admin/api/%s/products.json?page_info=%s&limit=250',
        v_store_url, v_api_version, params->>'page_info');
    END IF;

  ELSIF action = 'get_inventory_levels' THEN
    v_api_url := format('https://%s/admin/api/%s/inventory_levels.json?location_id=%s&inventory_item_ids=%s',
      v_store_url, v_api_version,
      params->>'location_id',
      params->>'inventory_item_ids');

  -- ---- POST requests (inventory write) ----

  ELSIF action = 'set_inventory' THEN
    v_api_url := format('https://%s/admin/api/%s/inventory_levels/set.json', v_store_url, v_api_version);
    v_body := json_build_object(
      'location_id', (params->>'location_id')::BIGINT,
      'inventory_item_id', (params->>'inventory_item_id')::BIGINT,
      'available', (params->>'available')::INT
    )::TEXT;

    SELECT * INTO v_response FROM extensions.http(
      ('POST', v_api_url,
       ARRAY[
         ROW('X-Shopify-Access-Token', v_access_token)::extensions.http_header,
         ROW('Content-Type', 'application/json')::extensions.http_header
       ],
       'application/json', v_body
      )::extensions.http_request
    );

    IF v_response.status != 200 THEN
      RETURN jsonb_build_object('error', format('Shopify API error: %s', v_response.status), 'details', left(v_response.content, 500));
    END IF;
    RETURN v_response.content::JSONB;

  ELSE
    RETURN jsonb_build_object('error', format('Unknown action: %s', action));
  END IF;

  -- Execute GET request
  SELECT * INTO v_response FROM extensions.http(
    ('GET', v_api_url,
     ARRAY[ROW('X-Shopify-Access-Token', v_access_token)::extensions.http_header],
     NULL, NULL
    )::extensions.http_request
  );

  IF v_response.status != 200 THEN
    RETURN jsonb_build_object('error', format('Shopify API error: %s', v_response.status), 'details', left(v_response.content, 500));
  END IF;

  RETURN v_response.content::JSONB;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shopify_proxy(TEXT, JSONB) TO authenticated;
