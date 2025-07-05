import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// フロントエンドの公開 URL （適宜変更）
const SITE_BASE_URL = "https://beat-nexus-heatbeat-test.vercel.app";

function buildHtml(battleId: string) {
  const image = `${SUPABASE_URL}/functions/v1/ogp-battle-card?battle_id=${battleId}`;
  const target = `${SITE_BASE_URL}/battle/${battleId}`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>BeatNexus Battle</title>
  <meta property="og:title" content="BeatNexus Battle" />
  <meta property="og:description" content="あなたの一票で勝敗が決まります！BeatNexusで投票しよう。" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${target}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${target}" />
</head>
<body>
Redirecting to <a href="${target}">${target}</a>
</body>
</html>`;
}

serve((req) => {
  const { searchParams } = new URL(req.url);
  const battleId = searchParams.get("battle_id");
  if (!battleId) {
    return new Response("battle_id query param required", { status: 400 });
  }
  const html = buildHtml(battleId);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}); 