const fs = require('fs');

// 既存のダンプファイルを読み込み
const devFunctions = JSON.parse(fs.readFileSync('dev_functions_dump.json', 'utf8'));
const prodFunctions = JSON.parse(fs.readFileSync('prod_functions_dump.json', 'utf8'));

// 公開関数ファイルを読み込み
const devPublicFunctions = JSON.parse(fs.readFileSync('dev_public_functions_dump.json', 'utf8'));
const prodPublicFunctions = JSON.parse(fs.readFileSync('prod_public_functions_dump.json', 'utf8'));

// 全関数を統合
const allDevFunctions = [...devFunctions, ...devPublicFunctions];
const allProdFunctions = [...prodFunctions, ...prodPublicFunctions];

console.log('\n=== BEATNEXUS DATABASE FUNCTION COMPARISON ===');
console.log(`開発環境 (wdttluticnlqzmqmfvgt): ${allDevFunctions.length} 関数`);
console.log(`本番環境 (qgqcjtjxaoplhxurbpis): ${allProdFunctions.length} 関数`);

// 関数のマッピングを作成
const devFunctionMap = new Map();
const prodFunctionMap = new Map();

allDevFunctions.forEach(func => {
  const key = `${func.schema_name}.${func.function_name}`;
  devFunctionMap.set(key, func);
});

allProdFunctions.forEach(func => {
  const key = `${func.schema_name}.${func.function_name}`;
  prodFunctionMap.set(key, func);
});

// 開発環境にのみ存在する関数
const devOnlyFunctions = [];
devFunctionMap.forEach((func, key) => {
  if (!prodFunctionMap.has(key)) {
    devOnlyFunctions.push(key);
  }
});

// 本番環境にのみ存在する関数
const prodOnlyFunctions = [];
prodFunctionMap.forEach((func, key) => {
  if (!devFunctionMap.has(key)) {
    prodOnlyFunctions.push(key);
  }
});

// 定義が異なる関数
const differentFunctions = [];
devFunctionMap.forEach((devFunc, key) => {
  if (prodFunctionMap.has(key)) {
    const prodFunc = prodFunctionMap.get(key);
    
    // シンプルな比較（改行を統一してから比較）
    const devDef = devFunc.function_definition.replace(/\\r\\n/g, '\\n').trim();
    const prodDef = prodFunc.function_definition.replace(/\\r\\n/g, '\\n').trim();
    
    // 引数の違いもチェック
    const devArgs = devFunc.arguments || '';
    const prodArgs = prodFunc.arguments || '';
    
    // 戻り値の違いもチェック
    const devReturn = devFunc.return_type || '';
    const prodReturn = prodFunc.return_type || '';
    
    if (devDef !== prodDef || devArgs !== prodArgs || devReturn !== prodReturn) {
      differentFunctions.push({
        key,
        dev: {
          args: devArgs,
          return_type: devReturn,
          definition: devDef
        },
        prod: {
          args: prodArgs,
          return_type: prodReturn,
          definition: prodDef
        }
      });
    }
  }
});

// 結果を出力
console.log('\n=== 差分サマリー ===');
console.log(`開発環境にのみ存在する関数: ${devOnlyFunctions.length} 個`);
console.log(`本番環境にのみ存在する関数: ${prodOnlyFunctions.length} 個`);
console.log(`定義が異なる関数: ${differentFunctions.length} 個`);

if (devOnlyFunctions.length > 0) {
  console.log('\n=== 開発環境にのみ存在する関数 ===');
  devOnlyFunctions.forEach(func => console.log(`  - ${func}`));
}

if (prodOnlyFunctions.length > 0) {
  console.log('\n=== 本番環境にのみ存在する関数 ===');
  prodOnlyFunctions.forEach(func => console.log(`  - ${func}`));
}

if (differentFunctions.length > 0) {
  console.log('\n=== 定義が異なる関数（最初の5個のみ表示）===');
  differentFunctions.slice(0, 5).forEach(diff => {
    console.log(`\\n--- ${diff.key} ---`);
    
    if (diff.dev.args !== diff.prod.args) {
      console.log(`引数の差異:`);
      console.log(`  開発: ${diff.dev.args}`);
      console.log(`  本番: ${diff.prod.args}`);
    }
    
    if (diff.dev.return_type !== diff.prod.return_type) {
      console.log(`戻り値の差異:`);
      console.log(`  開発: ${diff.dev.return_type}`);
      console.log(`  本番: ${diff.prod.return_type}`);
    }
    
    // 関数定義は長いので最初の200文字のみ
    if (diff.dev.definition !== diff.prod.definition) {
      console.log(`定義の差異（最初の200文字）:`);
      console.log(`  開発: ${diff.dev.definition.substring(0, 200)}...`);
      console.log(`  本番: ${diff.prod.definition.substring(0, 200)}...`);
    }
  });
  
  if (differentFunctions.length > 5) {
    console.log(`\\n... および ${differentFunctions.length - 5} 個の追加の差異`);
  }
}

// スキーマ別の分析
console.log('\n=== スキーマ別関数数 ===');
const devSchemas = {};
const prodSchemas = {};

allDevFunctions.forEach(func => {
  devSchemas[func.schema_name] = (devSchemas[func.schema_name] || 0) + 1;
});

allProdFunctions.forEach(func => {
  prodSchemas[func.schema_name] = (prodSchemas[func.schema_name] || 0) + 1;
});

const allSchemas = new Set([...Object.keys(devSchemas), ...Object.keys(prodSchemas)]);
allSchemas.forEach(schema => {
  const devCount = devSchemas[schema] || 0;
  const prodCount = prodSchemas[schema] || 0;
  const diff = devCount - prodCount;
  const diffStr = diff === 0 ? '一致' : diff > 0 ? `開発+${diff}` : `本番+${Math.abs(diff)}`;
  console.log(`  ${schema}: 開発=${devCount}, 本番=${prodCount} (${diffStr})`);
});

// 特に重要な公開関数の詳細確認
const criticalPublicFunctions = [
  'complete_battle_with_video_archiving',
  'update_battle_ratings_safe', 
  'find_match_and_create_battle',
  'vote_battle',
  'vote_battle_with_comment',
  'process_expired_battles',
  'calculate_elo_rating_with_format',
  'update_season_points_after_battle'
];

console.log('\n=== 重要な公開関数の状態確認 ===');
criticalPublicFunctions.forEach(funcName => {
  const devKey = `public.${funcName}`;
  const devExists = devFunctionMap.has(devKey);
  const prodExists = prodFunctionMap.has(devKey);
  
  if (devExists && prodExists) {
    const isDifferent = differentFunctions.some(diff => diff.key === devKey);
    console.log(`  ✅ ${funcName}: 両環境に存在 ${isDifferent ? '⚠️ 定義に差異あり' : '✅ 定義一致'}`);
  } else if (devExists && !prodExists) {
    console.log(`  ❌ ${funcName}: 開発のみ存在`);
  } else if (!devExists && prodExists) {
    console.log(`  ❌ ${funcName}: 本番のみ存在`);  
  } else {
    console.log(`  ❌ ${funcName}: 両環境とも存在しない`);
  }
});

console.log('\n=== 比較完了 ===');
