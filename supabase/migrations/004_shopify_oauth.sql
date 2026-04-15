-- ============================================
-- SHOPIFY OAuth SUPPORT
-- Adds client_id/client_secret to settings and
-- creates a function to exchange OAuth code for access token.
-- Run this in Supabase SQL Editor (new query).
-- ============================================

-- Add OAuth columns to shopify_settings
ALTER TABLE shopify_settings
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS client_secret TEXT;

-- Allow access_token to be null initially (set after OAuth)
ALTER TABLE shopify_settings
  ALTER COLUMN access_token DROP NOT NULL;

-- Function to exchange OAuth authorization code for access token
CREATE OR REPLACE FUNCTION public.shopify_exchange_token(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_url TEXT;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_response extensions.http_response;
  v_body TEXT;
  v_result JSONB;
  v_access_token TEXT;
BEGIN
  -- Get the calling user's Shopify settings (client_id, client_secret, store_url)
  SELECT store_url, client_id, client_secret
  INTO v_store_url, v_client_id, v_client_secret
  FROM public.shopify_settings
  WHERE user_id = auth.uid();

  IF v_store_url IS NULL OR v_client_id IS NULL OR v_client_secret IS NULL THEN
    RETURN jsonb_build_object('error', 'Shopify credentials not configured. Please save your Client ID, Secret, and Store URL first.');
  END IF;

  -- Build the POST body
  v_body := json_build_object(
    'client_id', v_client_id,
    'client_secret', v_client_secret,
    'code', p_code
  )::TEXT;

  -- Exchange the code for an access token
  SELECT *
  INTO v_response
  FROM extensions.http(
    (
      'POST',
      format('https://%s/admin/oauth/access_token', v_store_url),
      ARRAY[ROW('Content-Type', 'application/json')::extensions.http_header],
      'application/json',
      v_body
    )::extensions.http_request
  );

  IF v_response.status != 200 THEN
    RETURN jsonb_build_object(
      'error', format('Token exchange failed: %s', v_response.status),
      'details', left(v_response.content, 500)
    );
  END IF;

  v_result := v_response.content::JSONB;
  v_access_token := v_result->>'access_token';

  IF v_access_token IS NULL THEN
    RETURN jsonb_build_object('error', 'No access token in Shopify response', 'details', v_result);
  END IF;

  -- Save the access token
  UPDATE public.shopify_settings
  SET access_token = v_access_token,
      updated_at = NOW()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'scope', v_result->>'scope');
END;
$$;

GRANT EXECUTE ON FUNCTION public.shopify_exchange_token(TEXT) TO authenticated;
