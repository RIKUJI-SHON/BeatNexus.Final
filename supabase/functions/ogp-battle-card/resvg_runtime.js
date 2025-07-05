// Minimal runtime wrapper to load resvg_wasm lazily at runtime.
// This avoids bundler issues when deploying via MCP.

let mod;

export async function render(svg, options = {}) {
  if (!mod) {
    // Dynamic import ensures the WASM is fetched at runtime, not bundle time
    mod = await import("https://deno.land/x/resvg_wasm@0.10.0/mod.ts");
  }
  // mod.render returns Uint8Array synchronously, but we keep async for consistency
  return mod.render(svg, options);
} 