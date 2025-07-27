const fs = require('fs');
const path = require('path');

// ファイルの読み込み
const devFunctionsPath = path.join(__dirname, 'dev_functions_dump.json');
const prodFunctionsPath = path.join(__dirname, 'prod_functions_dump.json');

console.log('📊 データベース関数定義比較ツール（開発 vs 本番）\n');

let devFunctions, prodFunctions;

try {
  devFunctions = JSON.parse(fs.readFileSync(devFunctionsPath, 'utf8'));
  prodFunctions = JSON.parse(fs.readFileSync(prodFunctionsPath, 'utf8'));
} catch (error) {
  console.error('❌ ファイル読み込みエラー:', error.message);
  process.exit(1);
}

// 関数をキーでマップ化
function createFunctionMap(functions) {
  const map = new Map();
  functions.forEach(func => {
    const key = `${func.schema_name}.${func.function_name}(${func.arguments})`;
    map.set(key, func);
  });
  return map;
}

const devMap = createFunctionMap(devFunctions);
const prodMap = createFunctionMap(prodFunctions);

console.log(`🔢 データベース関数数:`);
console.log(`   開発環境: ${devFunctions.length} 個`);
console.log(`   本番環境: ${prodFunctions.length} 個\n`);

// 関数の存在確認と定義比較
const devOnlyFunctions = [];
const prodOnlyFunctions = [];
const differentFunctions = [];
const identicalFunctions = [];

// 開発環境の関数をチェック
for (const [key, devFunc] of devMap) {
  if (!prodMap.has(key)) {
    devOnlyFunctions.push(devFunc);
  } else {
    const prodFunc = prodMap.get(key);
    
    // 関数定義の詳細比較
    const isDifferent = 
      devFunc.function_definition !== prodFunc.function_definition ||
      devFunc.return_type !== prodFunc.return_type;
    
    if (isDifferent) {
      differentFunctions.push({
        key,
        dev: devFunc,
        prod: prodFunc
      });
    } else {
      identicalFunctions.push(devFunc);
    }
  }
}

// 本番環境にのみ存在する関数
for (const [key, prodFunc] of prodMap) {
  if (!devMap.has(key)) {
    prodOnlyFunctions.push(prodFunc);
  }
}

// レポート出力
console.log('🎯 **比較結果サマリー**');
console.log(`✅ 同一関数: ${identicalFunctions.length} 個`);
console.log(`⚠️  差異のある関数: ${differentFunctions.length} 個`);
console.log(`🆕 開発環境のみ: ${devOnlyFunctions.length} 個`);
console.log(`🏭 本番環境のみ: ${prodOnlyFunctions.length} 個\n`);

// 差異のある関数の詳細レポート
if (differentFunctions.length > 0) {
  console.log('🔍 **関数定義に差異があるもの（重要！）**\n');
  
  differentFunctions.forEach((diff, index) => {
    const func = diff.dev;
    console.log(`${index + 1}. ${func.schema_name}.${func.function_name}`);
    console.log(`   引数: ${func.arguments || '(なし)'}`);
    console.log(`   戻り値型: ${func.return_type}`);
    
    // 戻り値型の差異チェック
    if (diff.dev.return_type !== diff.prod.return_type) {
      console.log(`   ⚠️  戻り値型が異なります:`);
      console.log(`      開発: ${diff.dev.return_type}`);
      console.log(`      本番: ${diff.prod.return_type}`);
    }
    
    // 関数定義の長さ比較
    const devDefLength = diff.dev.function_definition.length;
    const prodDefLength = diff.prod.function_definition.length;
    
    console.log(`   📏 定義の長さ:`);
    console.log(`      開発: ${devDefLength} 文字`);
    console.log(`      本番: ${prodDefLength} 文字`);
    
    if (devDefLength !== prodDefLength) {
      console.log(`   ⚠️  定義の長さが ${Math.abs(devDefLength - prodDefLength)} 文字異なります`);
    }
    
    // スキーマ別分類
    const isPublicSchema = func.schema_name === 'public';
    if (isPublicSchema) {
      console.log(`   🎯 **重要: publicスキーマの関数です**`);
    }
    
    console.log(''); // 空行
  });
}

// 開発環境にのみ存在する関数（おそらく新機能）
if (devOnlyFunctions.length > 0) {
  console.log('🆕 **開発環境にのみ存在する関数（本番環境への同期が必要）**\n');
  
  const publicDevOnly = devOnlyFunctions.filter(f => f.schema_name === 'public');
  const otherDevOnly = devOnlyFunctions.filter(f => f.schema_name !== 'public');
  
  if (publicDevOnly.length > 0) {
    console.log(`🎯 publicスキーマ (${publicDevOnly.length}個):`);
    publicDevOnly.forEach(func => {
      console.log(`   - ${func.function_name}(${func.arguments || ''})`);
    });
    console.log('');
  }
  
  if (otherDevOnly.length > 0) {
    const schemaGroups = {};
    otherDevOnly.forEach(func => {
      if (!schemaGroups[func.schema_name]) {
        schemaGroups[func.schema_name] = [];
      }
      schemaGroups[func.schema_name].push(func);
    });
    
    Object.keys(schemaGroups).forEach(schema => {
      console.log(`${schema}スキーマ (${schemaGroups[schema].length}個):`);
      schemaGroups[schema].forEach(func => {
        console.log(`   - ${func.function_name}(${func.arguments || ''})`);
      });
      console.log('');
    });
  }
}

// 本番環境にのみ存在する関数
if (prodOnlyFunctions.length > 0) {
  console.log('🏭 **本番環境にのみ存在する関数（削除されたか、開発環境で未実装）**\n');
  
  const publicProdOnly = prodOnlyFunctions.filter(f => f.schema_name === 'public');
  const otherProdOnly = prodOnlyFunctions.filter(f => f.schema_name !== 'public');
  
  if (publicProdOnly.length > 0) {
    console.log(`🎯 publicスキーマ (${publicProdOnly.length}個):`);
    publicProdOnly.forEach(func => {
      console.log(`   - ${func.function_name}(${func.arguments || ''})`);
    });
    console.log('');
  }
  
  if (otherProdOnly.length > 0) {
    const schemaGroups = {};
    otherProdOnly.forEach(func => {
      if (!schemaGroups[func.schema_name]) {
        schemaGroups[func.schema_name] = [];
      }
      schemaGroups[func.schema_name].push(func);
    });
    
    Object.keys(schemaGroups).forEach(schema => {
      console.log(`${schema}スキーマ (${schemaGroups[schema].length}個):`);
      schemaGroups[schema].forEach(func => {
        console.log(`   - ${func.function_name}(${func.arguments || ''})`);
      });
      console.log('');
    });
  }
}

// 最終結論
console.log('🎯 **結論**');

if (differentFunctions.length === 0 && devOnlyFunctions.length === 0 && prodOnlyFunctions.length === 0) {
  console.log('✅ 両環境の関数定義は完全に同一です！');
} else {
  console.log('⚠️  両環境間に差異が検出されました。');
  
  if (differentFunctions.length > 0) {
    console.log(`   - ${differentFunctions.length}個の関数で定義が異なります`);
  }
  
  if (devOnlyFunctions.length > 0) {
    console.log(`   - ${devOnlyFunctions.length}個の関数が開発環境にのみ存在します（本番環境への反映が必要）`);
  }
  
  if (prodOnlyFunctions.length > 0) {
    console.log(`   - ${prodOnlyFunctions.length}個の関数が本番環境にのみ存在します（要確認）`);
  }
}

console.log('\n📋 **推奨アクション**');

if (devOnlyFunctions.length > 0) {
  const criticalFunctions = devOnlyFunctions.filter(f => f.schema_name === 'public');
  if (criticalFunctions.length > 0) {
    console.log(`🚨 ${criticalFunctions.length}個のpublicスキーマ関数を本番環境に同期してください`);
  }
}

if (differentFunctions.length > 0) {
  const criticalDiffs = differentFunctions.filter(d => d.dev.schema_name === 'public');
  if (criticalDiffs.length > 0) {
    console.log(`🔧 ${criticalDiffs.length}個のpublicスキーマ関数の定義を修正してください`);
  }
}

if (differentFunctions.length === 0 && devOnlyFunctions.length === 0 && prodOnlyFunctions.length === 0) {
  console.log('🎉 両環境は完全に同期されています！追加作業は不要です。');
}

console.log('\n比較完了 ✨');
