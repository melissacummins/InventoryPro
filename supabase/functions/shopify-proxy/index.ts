// Supabase Edge Function: Shopify API Proxy
// Proxies requests to Shopify Admin API to avoid CORS issues
// Deploy with: supabase functions deploy shopify-proxy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

interface ShopifySettings {
  store_url: string;
  access_token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the user via their Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT and get user ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user's Shopify settings
    const { data: settings, error: settingsError } = await supabase
      .from('shopify_settings')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Shopify not configured. Please add your store credentials.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { store_url, access_token } = settings as ShopifySettings;
    const body = await req.json();
    const { action, params } = body;

    let shopifyUrl: string;
    const baseUrl = `https://${store_url}/admin/api/${SHOPIFY_API_VERSION}`;

    switch (action) {
      case 'get_locations': {
        shopifyUrl = `${baseUrl}/locations.json`;
        break;
      }

      case 'get_orders': {
        const searchParams = new URLSearchParams();
        searchParams.set('status', params?.status || 'any');
        searchParams.set('limit', String(params?.limit || 250));
        searchParams.set('fields', 'id,name,order_number,created_at,customer,fulfillment_status,financial_status,total_price,line_items,fulfillments,location_id');

        if (params?.created_at_min) searchParams.set('created_at_min', params.created_at_min);
        if (params?.created_at_max) searchParams.set('created_at_max', params.created_at_max);
        if (params?.since_id) searchParams.set('since_id', params.since_id);
        if (params?.page_info) {
          shopifyUrl = `${baseUrl}/orders.json?page_info=${params.page_info}&limit=${params?.limit || 250}`;
          break;
        }

        shopifyUrl = `${baseUrl}/orders.json?${searchParams.toString()}`;
        break;
      }

      case 'get_products': {
        const searchParams = new URLSearchParams();
        searchParams.set('limit', '250');
        searchParams.set('fields', 'id,title,variants');
        if (params?.since_id) searchParams.set('since_id', params.since_id);
        shopifyUrl = `${baseUrl}/products.json?${searchParams.toString()}`;
        break;
      }

      case 'test_connection': {
        shopifyUrl = `${baseUrl}/shop.json`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Make the request to Shopify
    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      return new Response(JSON.stringify({
        error: `Shopify API error: ${shopifyResponse.status}`,
        details: errorText,
      }), {
        status: shopifyResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await shopifyResponse.json();

    // Extract pagination link header for cursor-based pagination
    const linkHeader = shopifyResponse.headers.get('Link');
    let nextPageInfo: string | null = null;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        nextPageInfo = nextMatch[1];
      }
    }

    return new Response(JSON.stringify({ ...data, nextPageInfo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
