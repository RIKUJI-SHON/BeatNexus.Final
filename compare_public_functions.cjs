const fs = require('fs');
const path = require('path');

// ファイルの読み込み
const devFunctionsPath = path.join(__dirname, 'dev_functions_dump.json');
const prodFunctionsPath = path.join(__dirname, 'prod_functions_dump.json');

console.log('🎯 publicスキーマ関数定義比較（開発 vs 本番）\n');

let devFunctions, prodFunctions;

try {
  devFunctions = JSON.parse(fs.readFileSync(devFunctionsPath, 'utf8'));
  prodFunctions = JSON.parse(fs.readFileSync(prodFunctionsPath, 'utf8'));
} catch (error) {
  console.error('❌ ファイル読み込みエラー:', error.message);
  process.exit(1);
}

// publicスキーマの関数のみ抽出
const devPublicFunctions = devFunctions.filter(f => f.schema_name === 'public');
const prodPublicFunctions = prodFunctions.filter(f => f.schema_name === 'public');

console.log(`📊 publicスキーマ関数数:`);
console.log(`   開発環境: ${devPublicFunctions.length} 個`);
console.log(`   本番環境: ${prodPublicFunctions.length} 個\n`);

// 関数をキーでマップ化
function createFunctionMap(functions) {
  const map = new Map();
  functions.forEach(func => {
    const key = `${func.function_name}(${func.arguments})`;
    map.set(key, func);
  });
  return map;
}

const devMap = createFunctionMap(devPublicFunctions);
const prodMap = createFunctionMap(prodPublicFunctions);

// 差異の詳細分析
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

console.log('🎯 **publicスキーマ比較結果**');
console.log(`✅ 同一関数: ${identicalFunctions.length} 個`);
console.log(`⚠️  差異のある関数: ${differentFunctions.length} 個`);
console.log(`🆕 開発環境のみ: ${devOnlyFunctions.length} 個`);
console.log(`🏭 本番環境のみ: ${prodOnlyFunctions.length} 個\n`);

// 関数一覧の表示
if (identicalFunctions.length > 0) {
  console.log('✅ **同一関数一覧（正常同期済み）**');
  identicalFunctions
    .sort((a, b) => a.function_name.localeCompare(b.function_name))
    .forEach((func, index) => {
      console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
    });
  console.log('');
}

if (differentFunctions.length > 0) {
  console.log('⚠️  **定義が異なる関数（要確認・同期）**');
  differentFunctions.forEach((diff, index) => {
    const func = diff.dev;
    console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
    
    // 戻り値型の差異チェック
    if (diff.dev.return_type !== diff.prod.return_type) {
      console.log(`   ⚠️  戻り値型: 開発「${diff.dev.return_type}」→ 本番「${diff.prod.return_type}」`);
    }
    
    // 関数定義の長さ比較
    const devDefLength = diff.dev.function_definition.length;
    const prodDefLength = diff.prod.function_definition.length;
    const lengthDiff = Math.abs(devDefLength - prodDefLength);
    
    if (lengthDiff > 0) {
      console.log(`   📏 定義の長さ差: ${lengthDiff} 文字 (開発:${devDefLength} vs 本番:${prodDefLength})`);
    }
    
    console.log('');
  });
}

if (devOnlyFunctions.length > 0) {
  console.log('🆕 **開発環境にのみ存在する関数（本番環境への追加が必要）**');
  devOnlyFunctions
    .sort((a, b) => a.function_name.localeCompare(b.function_name))
    .forEach((func, index) => {
      console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
      console.log(`   戻り値: ${func.return_type}`);
      console.log(`   定義サイズ: ${func.function_definition.length} 文字`);
      console.log('');
    });
}

if (prodOnlyFunctions.length > 0) {
  console.log('🏭 **本番環境にのみ存在する関数（開発環境から削除済み?）**');
  prodOnlyFunctions
    .sort((a, b) => a.function_name.localeCompare(b.function_name))
    .forEach((func, index) => {
      console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
      console.log(`   戻り値: ${func.return_type}`);
      console.log(`   定義サイズ: ${func.function_definition.length} 文字`);
      console.log('');
    });
}

// 最終判定
console.log('🎯 **最終判定**');

const hasPublicDifferences = differentFunctions.length > 0 || devOnlyFunctions.length > 0 || prodOnlyFunctions.length > 0;

if (!hasPublicDifferences) {
  console.log('🎉 publicスキーマの関数は完全に同期されています！');
  console.log('✅ マッチング・バトル機能に影響する関数に問題はありません。');
} else {
  console.log('⚠️  publicスキーマに同期の問題があります。');
  
  if (differentFunctions.length > 0) {
    console.log(`🔧 ${differentFunctions.length}個の関数定義を本番環境で修正が必要です。`);
  }
  
  if (devOnlyFunctions.length > 0) {
    console.log(`📤 ${devOnlyFunctions.length}個の関数を本番環境に追加が必要です。`);
  }
  
  if (prodOnlyFunctions.length > 0) {
    console.log(`🗑️  ${prodOnlyFunctions.length}個の関数が本番環境にのみ存在します（要確認）。`);
  }
}

console.log('\npublicスキーマ分析完了 ✨');
