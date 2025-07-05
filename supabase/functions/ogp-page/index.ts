import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// 🌟 PNG 生成は既存の ogp-battle-card 関数に委譲し、ここではリバースプロキシのみ行う
// PNG 変換は必要なときだけ動的に import して実行

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// フロントエンドの公開 URL （適宜変更）
const SITE_BASE_URL = "https://beat-nexus-heatbeat-test.vercel.app";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchPlayers(battleId: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let { data } = await admin
    .from("active_battles")
    .select("player1_user_id, player2_user_id")
    .eq("id", battleId)
    .maybeSingle();
  
  let isArchived = false;
  if (!data) {
    // Check archived_battles.original_battle_id first
    let res = await admin
      .from("archived_battles")
      .select("player1_user_id, player2_user_id")
      .eq("original_battle_id", battleId)
      .maybeSingle();
    data = res.data;
    if (data) isArchived = true;
    
    if (!data) {
      // Check archived_battles.id as fallback
      res = await admin
        .from("archived_battles")
        .select("player1_user_id, player2_user_id")
        .eq("id", battleId)
        .maybeSingle();
      data = res.data;
      if (data) isArchived = true;
    }
  }
  if (!data) return null;
  const [p1, p2] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", data.player1_user_id).single(),
    admin.from("profiles").select("avatar_url").eq("id", data.player2_user_id).single(),
  ]);
  return {
    p1: p1.data?.avatar_url ?? `${SITE_BASE_URL}/images/Profile.png`,
    p2: p2.data?.avatar_url ?? `${SITE_BASE_URL}/images/Profile.png`,
    isArchived
  };
}

function buildSvg(p1Url: string, p2Url: string) {
  const HERO_BG = `${SITE_BASE_URL}/images/hero-background.png`;
  const VS_LOGO = `${SITE_BASE_URL}/images/VS.png`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <clipPath id="circleClipL"><circle cx="130" cy="315" r="130" /></clipPath>
    <clipPath id="circleClipR"><circle cx="1070" cy="315" r="130" /></clipPath>
  </defs>
  <image href="${HERO_BG}" width="1200" height="630" />
  <g clip-path="url(#circleClipL)"><image href="${p1Url}" x="0" y="185" width="260" height="260" preserveAspectRatio="xMidYMid slice" /></g>
  <circle cx="130" cy="315" r="130" fill="none" stroke="#06b6d4" stroke-width="10" />
  <g clip-path="url(#circleClipR)"><image href="${p2Url}" x="940" y="185" width="260" height="260" preserveAspectRatio="xMidYMid slice" /></g>
  <circle cx="1070" cy="315" r="130" fill="none" stroke="#d946ef" stroke-width="10" />
  <image href="${VS_LOGO}" x="520" y="235" width="160" height="160" />
</svg>`;
}

function buildHtml(battleId: string, isArchived: boolean) {
  const image = `${SUPABASE_URL}/functions/v1/ogp-battle-card?battle_id=${battleId}`;
  // アーカイブバトルは /battle-replay/ に、アクティブバトルは /battle/ にリダイレクト
  const target = isArchived ? 
    `${SITE_BASE_URL}/battle-replay/${battleId}` : 
    `${SITE_BASE_URL}/battle/${battleId}`;
  
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>BeatNexus Battle</title>
  <meta property="og:title" content="BeatNexus Battle" />
  <meta property="og:description" content="Vote for your favorite beatboxer! Join the battle on BeatNexus." />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${target}" />
  <meta name="twitter:card" content="summary_large_image" />
  <script>
    // JavaScript enabled: immediate redirect
    window.location.replace("${target}");
  </script>
  <noscript>
    <meta http-equiv="refresh" content="1; url=${target}" />
  </noscript>
</head>
<body>
<p>Redirecting to BeatNexus...</p>
<p>If you are not redirected automatically, <a href="${target}">click here to view the battle</a>.</p>
</body>
</html>`;
}

serve(async (req) => {
  const { searchParams } = new URL(req.url);
  const battleId = searchParams.get("battle_id");
  const imageOnly = searchParams.get("image") === "1";
  if (!battleId) return new Response("battle_id query param required", { status: 400 });

  if (imageOnly) {
    // 既存の PNG 生成 Edge Function を呼び出して結果をそのまま返却
    const pngUrl = `${SUPABASE_URL}/functions/v1/ogp-battle-card?battle_id=${battleId}&format=png`;
    console.log(`Proxying to: ${pngUrl}`);
    const upstream = await fetch(pngUrl);
    console.log(`Upstream response: ${upstream.status} ${upstream.statusText}`);
    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`PNG generation failed: ${upstream.status} - ${errorText}`);
      return new Response("png generation failed", { status: 500 });
    }
    const body = new Uint8Array(await upstream.arrayBuffer());
    console.log(`PNG size: ${body.length} bytes`);
    return new Response(body, {
      headers: { "Content-Type": "image/png" },
    });
  }

  // プレイヤー情報とアーカイブ状態を取得
  const players = await fetchPlayers(battleId);
  if (!players) return new Response("Battle not found", { status: 404 });

  // User-Agent を確認してSNSクローラーかどうか判定
  const userAgent = req.headers.get("user-agent") || "";
  const isSNSCrawler = /twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot|slackbot/i.test(userAgent);
  
  // アーカイブバトルは /battle-replay/ に、アクティブバトルは /battle/ にリダイレクト
  const target = players.isArchived ? 
    `${SITE_BASE_URL}/battle-replay/${battleId}` : 
    `${SITE_BASE_URL}/battle/${battleId}`;

  // SNSクローラーの場合はOGP用HTMLを返す
  if (isSNSCrawler) {
    const html = buildHtml(battleId, players.isArchived);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // 通常のブラウザアクセスの場合は直接リダイレクト
  return new Response("Redirecting...", {
    status: 302,
    headers: {
      "Location": target,
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
});