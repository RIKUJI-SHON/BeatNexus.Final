import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Stripe configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_charges_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ success: true, has_account: false, charges_enabled: false, details_submitted: false, requirements: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${profile.stripe_connect_account_id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const accountData = await accountResponse.json();
    if (!accountResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: 'STRIPE_ACCOUNT_RETRIEVAL_FAILED', details: accountData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (accountData.charges_enabled !== profile.stripe_charges_enabled) {
      await supabase
        .from('profiles')
        .update({ stripe_charges_enabled: accountData.charges_enabled, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      has_account: true,
      account_id: profile.stripe_connect_account_id,
      charges_enabled: accountData.charges_enabled,
      details_submitted: accountData.details_submitted,
      requirements: {
        currently_due: accountData.requirements?.currently_due || [],
        eventually_due: accountData.requirements?.eventually_due || [],
        past_due: accountData.requirements?.past_due || [],
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
