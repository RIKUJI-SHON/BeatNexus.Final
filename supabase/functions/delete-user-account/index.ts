/**
 * 🗑️ BeatNexus ユーザーアカウント削除 Edge Function
 * 
 * 【v4完全メール解放システム対応】
 * この関数は safe_delete_user_account を呼び出しますが、
 * 内部では safe_delete_user_account_v4 が実行され、以下の最新機能が動作します：
 * 
 * ✅ 動画ファイル物理削除（Storageから完全削除）
 * ✅ auth.identities完全削除（メール即座解放）
 * ✅ バトル履歴に応じた適切な削除方式選択
 * ✅ 完全匿名化とプライバシー保護
 * ✅ 削除後の同メールアドレス即座再登録対応
 * 
 * 要件定義書（BeatNexus.mdc）記載のv4仕様と機能的に同一です。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORSヘッダーを設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 本番環境では特定のオリジンに制限してください
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // OPTIONSメソッドを許可
}

async function safeDeleteUserProfile(supabaseClient: SupabaseClient, userId: string) {
  console.log(`Attempting to safely delete profile for user ${userId}`);
  
  // 🔄 注意: safe_delete_user_account は内部で safe_delete_user_account_v4 を呼び出す
  // ラッパー関数です。以下のv4の全機能が動作します：
  // - 動画ファイル物理削除（delete_user_videos_from_storage）
  // - auth.identities完全削除によるメール即座解放
  // - バトル履歴に応じたソフト削除/物理削除の自動判定
  // - タイムスタンプ付き一意匿名化メール生成
  // 機能的には要件定義書記載のv4仕様と完全に同一です。
  const { data, error } = await supabaseClient.rpc('safe_delete_user_account', {
    p_user_id: userId
  });
  
  if (error) {
    console.error(`Error in safe_delete_user_account for user ${userId}:`, JSON.stringify(error, null, 2));
    throw new Error(`Failed to delete user profile: ${error.message} (Code: ${error.code})`);
  }
  
  if (!data?.success) {
    console.error(`safe_delete_user_account returned failure for user ${userId}:`, data);
    throw new Error(`Profile deletion failed: ${data?.error || 'Unknown error'}`);
  }
  
  console.log(`Profile deletion result for user ${userId}:`, data);
  return data;
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
      supabaseServiceRoleKey,
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

    // Adminクライアントはサービスロールキーで初期化
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('Supabase admin client initialized.');

    let profileDeletionResult: any;
    
    try {
      profileDeletionResult = await safeDeleteUserProfile(supabaseAdminClient, user.id);
    } catch (profileError: any) {
      console.error('Caught error during safeDeleteUserProfile:', profileError.message);
      return new Response(JSON.stringify({ 
        error: `Profile deletion failed: ${profileError.message}`,
        type: 'profile_deletion_error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 物理削除の場合のみ認証ユーザーも削除
    if (profileDeletionResult.method === 'physical_delete') {
      try {
        await deleteAuthUser(supabaseAdminClient, user.id);
        console.log(`Complete account deletion (physical) for user ${user.id}`);
        
        return new Response(JSON.stringify({ 
          message: 'User account completely deleted',
          method: 'physical_delete',
          details: profileDeletionResult
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (authError: any) {
        console.error('Caught error during deleteAuthUser:', authError.message);
        return new Response(JSON.stringify({ 
          error: `Auth user deletion failed: ${authError.message}`,
          type: 'auth_deletion_error',
          profile_deletion: profileDeletionResult
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // ソフト削除の場合は認証ユーザーはそのまま残す（ログイン不可にするため）
      console.log(`Soft deletion completed for user ${user.id}`);
      
      return new Response(JSON.stringify({ 
        message: 'User account soft deleted due to battle history',
        method: profileDeletionResult.method,
        reason: profileDeletionResult.reason,
        details: profileDeletionResult
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Unhandled error in delete-user-account function:', error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred during account deletion.',
      type: 'unexpected_error',
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 