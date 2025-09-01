import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-version, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}
	try {
		const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
		const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
		const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
			const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
			// Derive base URL from request Origin/Referer to avoid non-HTTPS defaults in production
			let baseUrl = FRONTEND_URL;
			try {
				const originHeader = req.headers.get('origin') ?? req.headers.get('referer');
				if (originHeader) {
					const parsed = new URL(originHeader);
					// Enforce https scheme when host looks public and scheme is http
					if (parsed.protocol === 'http:' && !parsed.hostname.includes('localhost')) {
						parsed.protocol = 'https:';
					}
					baseUrl = parsed.origin;
				}
			} catch {
				// keep FRONTEND_URL fallback
			}

		if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return new Response(JSON.stringify({ success: false, error: 'SERVER_MISCONFIGURED' }), {
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

		if (profile?.stripe_connect_account_id && profile?.stripe_charges_enabled) {
			return new Response(JSON.stringify({ success: false, error: 'ALREADY_SETUP' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Create Stripe Connect Express Account
		const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				'type': 'express',
				'capabilities[transfers][requested]': 'true',
				'capabilities[card_payments][requested]': 'true',
				'business_type': 'individual',
				'country': 'JP',
				'metadata[platform]': 'BeatNexus',
				'metadata[user_id]': user.id,
				'metadata[purpose]': 'super_tips',
			}),
		});
		const accountData = await accountResponse.json();
		if (!accountResponse.ok) {
			return new Response(JSON.stringify({ success: false, error: 'STRIPE_ACCOUNT_CREATION_FAILED', details: accountData }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Create Account Link for onboarding
		const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
					body: new URLSearchParams({
						'account': accountData.id,
						'refresh_url': `${baseUrl}/profile/stripe-connect?refresh=true`,
						'return_url': `${baseUrl}/profile/stripe-connect?success=true`,
						'type': 'account_onboarding',
					}),
		});
		const accountLinkData = await accountLinkResponse.json();
		if (!accountLinkResponse.ok) {
			return new Response(JSON.stringify({ success: false, error: 'ACCOUNT_LINK_CREATION_FAILED', details: accountLinkData }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ stripe_connect_account_id: accountData.id, updated_at: new Date().toISOString() })
			.eq('id', user.id);
		if (updateError) {
			return new Response(JSON.stringify({ success: false, error: 'PROFILE_UPDATE_FAILED', details: updateError }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		return new Response(
			JSON.stringify({ success: true, account_id: accountData.id, onboarding_url: accountLinkData.url }),
			{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		);
		} catch (error: unknown) {
			const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'Unknown error';
		return new Response(JSON.stringify({ success: false, error: 'INTERNAL_SERVER_ERROR', message }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});

