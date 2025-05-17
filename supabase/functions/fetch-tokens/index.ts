import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { format } from 'npm:date-fns';

const CMC_API_KEY = Deno.env.get('CMC_API_KEY') || '';
const CMC_LISTINGS_NEW_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/new';
const JUPITER_TOKENS_URL = 'https://quote-api.jup.ag/v6/tokens';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Content-Type': 'application/json',
};

async function getNewCmcTokens() {
  try {
    const response = await fetch(CMC_LISTINGS_NEW_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`CMC API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((token: any) => ({
      id: token.id.toString(),
      name: token.name,
      symbol: token.symbol,
      current_price: token.quote.USD.price,
      market_cap: token.quote.USD.market_cap,
      total_volume: token.quote.USD.volume_24h,
      price_change_percentage_24h: token.quote.USD.percent_change_24h,
      created_at: token.date_added,
      age_hours: Math.floor((Date.now() - new Date(token.date_added).getTime()) / (1000 * 60 * 60)),
      meets_threshold: token.quote.USD.volume_24h > 1500000 || token.quote.USD.market_cap > 1500000,
    }));
  } catch (error) {
    console.error('Error fetching CMC tokens:', error);
    return [];
  }
}

async function getJupiterTokens() {
  try {
    const response = await fetch(JUPITER_TOKENS_URL);
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.tokens.map((token: any) => ({
      id: token.address,
      name: token.name,
      symbol: token.symbol,
      current_price: 0, // Price data not available from Jupiter
      market_cap: 0,
      total_volume: 0,
      price_change_percentage_24h: 0,
      created_at: new Date().toISOString(),
      age_hours: 0,
      meets_threshold: false,
      is_jupiter_token: true,
    }));
  } catch (error) {
    console.error('Error fetching Jupiter tokens:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [cmcTokens, jupiterTokens] = await Promise.all([
      getNewCmcTokens(),
      getJupiterTokens(),
    ]);

    const allTokens = [...cmcTokens, ...jupiterTokens];

    return new Response(
      JSON.stringify(allTokens),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in fetch-tokens function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch tokens' }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});