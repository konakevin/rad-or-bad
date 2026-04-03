#!/usr/bin/env node
'use strict';

/**
 * sync-deno-engine.js — Rebuild the Deno recipeEngine.ts from source files.
 *
 * This creates a single self-contained file from:
 *   - lib/recipe/types.ts
 *   - lib/recipe/pools.ts
 *   - lib/recipe/utils.ts
 *   - lib/recipe/builder.ts
 *
 * Run after any changes to the recipe engine source files.
 *
 * Usage:
 *   node scripts/sync-deno-engine.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'supabase/functions/_shared/recipeEngine.ts');

function readSrc(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function stripImports(src) {
  // Remove single-line imports
  src = src.replace(/^import\s+.*;\s*$/gm, '');
  // Remove multi-line imports: import { ... } from '...';
  src = src.replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];\s*$/gm, '');
  // Remove multi-line imports that span lines
  src = src.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];\s*/g, '');
  // Remove export ... from lines
  src = src.replace(/^export\s+\{[^}]*\}\s*from\s*['"][^'"]*['"];\s*$/gm, '');
  src = src.replace(/export\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];\s*/g, '');
  // Remove export type lines
  src = src.replace(/^export\s+type\s+\{[^}]*\}\s*from\s*['"][^'"]*['"];\s*$/gm, '');
  return src;
}

function stripExportKeyword(src) {
  // Change "export function" → "function", "export const" → "const", "export interface" → "interface"
  // But keep the actual exports at the end
  return src
    .replace(/^export (function|const|interface|type|class)/gm, '$1');
}

function main() {
  console.log('Building Deno recipeEngine.ts from source files...');

  const types = readSrc('lib/recipe/types.ts');
  const pools = readSrc('lib/recipe/pools.ts');
  const utils = readSrc('lib/recipe/utils.ts');
  const builder = readSrc('lib/recipe/builder.ts');

  // Also need Recipe type from types/recipe.ts
  const recipeTypes = readSrc('types/recipe.ts');

  // Build the output
  let out = `/**
 * AUTO-GENERATED from lib/recipe/ modules — keep in sync.
 * DEPLOY COPY for Supabase Edge Functions (Deno runtime).
 *
 * SOURCE OF TRUTH: lib/recipe/types.ts, lib/recipe/pools.ts,
 *                  lib/recipe/utils.ts, lib/recipe/builder.ts
 *
 * DO NOT EDIT DIRECTLY. Run: node scripts/sync-deno-engine.js
 * Generated: ${new Date().toISOString()}
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Recipe Types (from types/recipe.ts)
// ═══════════════════════════════════════════════════════════════════════════════

`;

  // Add recipe types (strip imports, keep exports for the edge functions to use)
  out += stripImports(recipeTypes) + '\n\n';

  out += `// ═══════════════════════════════════════════════════════════════════════════════
// Engine Types (from lib/recipe/types.ts)
// ═══════════════════════════════════════════════════════════════════════════════

`;
  out += stripImports(types) + '\n\n';

  out += `// ═══════════════════════════════════════════════════════════════════════════════
// Pools (from lib/recipe/pools.ts)
// ═══════════════════════════════════════════════════════════════════════════════

`;
  // Pools: strip imports, keep exports
  let poolsClean = stripImports(pools);
  out += poolsClean + '\n\n';

  out += `// ═══════════════════════════════════════════════════════════════════════════════
// Utilities (from lib/recipe/utils.ts)
// ═══════════════════════════════════════════════════════════════════════════════

`;
  out += stripImports(utils) + '\n\n';

  out += `// ═══════════════════════════════════════════════════════════════════════════════
// Builder (from lib/recipe/builder.ts)
// ═══════════════════════════════════════════════════════════════════════════════

`;
  // Builder: strip imports, strip re-exports
  let builderClean = stripImports(builder);
  // Remove the import for DEFAULT_RECIPE and pools since they're all in this file
  builderClean = builderClean.replace(/import.*DEFAULT_RECIPE.*\n/g, '');
  builderClean = builderClean.replace(/import.*PromptInput.*\n/g, '');
  builderClean = builderClean.replace(/import.*pick.*\n/g, '');
  builderClean = builderClean.replace(/import.*MEDIUM_POOL.*\n/g, '');
  out += builderClean + '\n';

  // Write
  fs.writeFileSync(OUT, out);

  // Stats
  const lines = out.split('\n').length;
  const mediums = (out.match(/text:\s*'/g) || []).length;
  console.log(`\n✅ Generated ${OUT}`);
  console.log(`   ${lines} lines`);
  console.log(`   Banksy: ${out.includes('Banksy') ? '❌ STILL IN (check pools.ts!)' : '✅ gone'}`);
  console.log(`   drone aerial: ${out.includes('drone aerial') ? '✅ present' : '❌ missing'}`);
  console.log(`   ERA_KEYWORDS count: ${(out.match(/ERA_KEYWORDS/g) || []).length}`);
  console.log(`   MEDIUM_POOL count: ${(out.match(/MEDIUM_POOL/g) || []).length}`);
}

main();
