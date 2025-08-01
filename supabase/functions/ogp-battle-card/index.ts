import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { render } from "./resvg_runtime.js";

// CORS ヘッダー（必要ならオリジン制限）
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 環境変数
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_BASE_URL = "https://beatnexus.app";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars");
}

const DEFAULT_AVATAR = `${SITE_BASE_URL}/images/FI.png`;
const HERO_BG = `${SITE_BASE_URL}/images/hero-background.png`;
const VS_LOGO = `${SITE_BASE_URL}/images/VS.png`;

// 型定義
interface Player {
  avatar_url: string | null;
  username: string | null;
}

// フレンドリーURLからバトルIDを抽出
function extractBattleIdFromUrl(battlePath: string): string | null {
  // UUIDパターン（ハイフン区切りの8-4-4-4-12文字）にマッチ
  const match = battlePath.match(/-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  return match ? match[1] : null;
}

// レガシーUUIDBattleURLかどうかを判定
function isLegacyBattleUrl(battlePath: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(battlePath);
}

// resvg_wasm は実行時に動的 import される（resvg_runtime.js 内）

async function fetchPlayers(battleId: string) {
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // active_battles → archived_battles の順で検索
  let { data } = await admin
    .from("active_battles")
    .select("player1_user_id, player2_user_id")
    .eq("id", battleId)
    .maybeSingle();

  if (!data) {
    // まず archived_battles.id
    let res = await admin
      .from("archived_battles")
      .select("player1_user_id, player2_user_id")
      .eq("id", battleId)
      .maybeSingle();
    data = res.data;
    if (!data) {
      // 次に original_battle_id で試す
      res = await admin
        .from("archived_battles")
        .select("player1_user_id, player2_user_id")
        .eq("original_battle_id", battleId)
        .maybeSingle();
      data = res.data;
    }
  }

  if (!data) return null;

  const [p1, p2] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", data.player1_user_id).single(),
    admin.from("profiles").select("avatar_url").eq("id", data.player2_user_id).single(),
  ]);

  return {
    p1: p1.data?.avatar_url ?? DEFAULT_AVATAR,
    p2: p2.data?.avatar_url ?? DEFAULT_AVATAR,
  };
}

function buildSvg(p1Url: string, p2Url: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <clipPath id="circleClip">
      <circle cx="130" cy="315" r="130" />
    </clipPath>
    <clipPath id="circleClipRight">
      <circle cx="1070" cy="315" r="130" />
    </clipPath>
  </defs>
  <image href="${HERO_BG}" width="1200" height="630" />
  <g clip-path="url(#circleClip)">
    <image href="${p1Url}" x="0" y="185" width="260" height="260" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="130" cy="315" r="130" fill="none" stroke="#06b6d4" stroke-width="10" />
  <g clip-path="url(#circleClipRight)">
    <image href="${p2Url}" x="940" y="185" width="260" height="260" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="1070" cy="315" r="130" fill="none" stroke="#d946ef" stroke-width="10" />
  <image href="${VS_LOGO}" x="520" y="235" width="160" height="160" />
</svg>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response("env missing", { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const battleIdParam = searchParams.get("battle_id");
  const format = (searchParams.get("format") ?? "png").toLowerCase();

  const client = createClient(supabaseUrl, serviceRole);

  if (!battleIdParam) {
    const { data, error } = await client.from("active_battles").select("id").limit(5);
    return new Response(JSON.stringify({ sample: data, error }), { headers: { "Content-Type": "application/json" } });
  }

  // フレンドリーURLまたはレガシーUUIDからバトルIDを抽出
  let battleId: string;
  if (isLegacyBattleUrl(battleIdParam)) {
    battleId = battleIdParam;
  } else {
    const extracted = extractBattleIdFromUrl(battleIdParam);
    if (!extracted) {
      return new Response("invalid battle path", { status: 400 });
    }
    battleId = extracted;
  }

  const players = await fetchPlayers(battleId);
  if (!players) return new Response("not found", { status: 404 });

  const svg = buildSvg(players.p1, players.p2);

  if (format === "svg") {
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", ...corsHeaders },
    });
  }

  // PNG 変換
  try {
    // resvg_wasm は実行時に動的 import される（resvg_runtime.js 内）
    const pngData = await render(svg, { width: 1200 });
    return new Response(pngData, {
      headers: { "Content-Type": "image/png", ...corsHeaders },
    });
  } catch (e) {
    console.error("PNG conversion failed", e);
    // フォールバックとして SVG を返す
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", ...corsHeaders },
    });
  }
}); 