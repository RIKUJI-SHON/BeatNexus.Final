// Minimal runtime wrapper to load resvg_wasm lazily at runtime.
let mod;
export async function render(svg, options = {}) {
  if (!mod) {
    mod = await import("https://deno.land/x/resvg_wasm@0.10.0/mod.ts");
  }
  return mod.render(svg, options);
} 