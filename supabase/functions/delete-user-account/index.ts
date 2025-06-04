import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORSヘッダーを設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 本番環境では特定のオリジンに制限してください
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // OPTIONSメソッドを許可
}

async function deleteUserProfile(supabaseClient: SupabaseClient, userId: string) {
  console.log(`Attempting to delete profile for user ${userId}`);
  const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
  if (error) {
    console.error(`Error in deleteUserProfile for user ${userId}:`, JSON.stringify(error, null, 2));
    throw new Error(`Failed to delete user profile: ${error.message} (Code: ${error.code})`);
  }
  console.log(`Profile deleted successfully for user ${userId}`);
}

async function deleteAuthUser(supabaseAdminClient: SupabaseClient, userId: string) {
  console.log(`Attempting to delete auth user ${userId}`);
  const { error } = await supabaseAdminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`Error in deleteAuthUser for user ${userId}:`, JSON.stringify(error, null, 2));
    throw new Error(`Failed to delete auth user: ${error.message}`);
  }
  console.log(`Auth user deleted successfully: ${userId}`);
}

serve(async (req) => {
  // OPTIONSリクエストの場合はCORSヘッダーを返して終了
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabaseClient: SupabaseClient;
  let user: any;

  try {
    console.log('Function delete-user-account invoked.');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Server configuration error: Missing Supabase environment variables');
    }
    console.log('Supabase environment variables loaded.');

    // リクエストヘッダーからAuthorizationを取得してSupabaseクライアントを作成
    supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey, // ここではサービスロールキーを使いますが、ユーザーのトークンでも可
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const authResult = await supabaseClient.auth.getUser();
    if (authResult.error) {
      console.error('Error getting user from token:', authResult.error);
      throw new Error(`Authentication error: ${authResult.error.message}`);
    }
    user = authResult.data.user;

    if (!user) {
      console.warn('User not authenticated for delete operation.');
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`User ${user.id} authenticated for deletion.`);

    // Adminクライアントはサービスロールキーで初期化 (Authユーザー削除のため)
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('Supabase admin client initialized.');

    try {
      await deleteUserProfile(supabaseAdminClient, user.id);
    } catch (profileError: any) {
      console.error('Caught error during deleteUserProfile:', profileError.message);
      // Don't re-throw immediately, try to delete auth user anyway if profile deletion fails in some cases?
      // For now, let's return a specific error for profile deletion failure.
      return new Response(JSON.stringify({ error: `Profile deletion failed: ${profileError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      await deleteAuthUser(supabaseAdminClient, user.id);
    } catch (authError: any) {
      console.error('Caught error during deleteAuthUser:', authError.message);
      // If auth user deletion fails, this is a more critical issue.
      return new Response(JSON.stringify({ error: `Auth user deletion failed: ${authError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User account ${user.id} deleted successfully.`);
    return new Response(JSON.stringify({ message: 'User account deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Unhandled error in delete-user-account function:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during account deletion.', details: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 