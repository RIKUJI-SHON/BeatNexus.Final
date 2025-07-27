const fs = require('fs');
const path = require('path');

// ファイルの読み込み
const devFunctionsPath = path.join(__dirname, 'dev_functions_dump.json');
const prodFunctionsPath = path.join(__dirname, 'prod_functions_dump.json');

console.log('📊 スキーマ別関数分布分析\n');

let devFunctions, prodFunctions;

try {
  devFunctions = JSON.parse(fs.readFileSync(devFunctionsPath, 'utf8'));
  prodFunctions = JSON.parse(fs.readFileSync(prodFunctionsPath, 'utf8'));
} catch (error) {
  console.error('❌ ファイル読み込みエラー:', error.message);
  process.exit(1);
}

// スキーマ別関数集計
function analyzeSchemas(functions, environmentName) {
  const schemas = {};
  
  functions.forEach(func => {
    if (!schemas[func.schema_name]) {
      schemas[func.schema_name] = [];
    }
    schemas[func.schema_name].push(func);
  });
  
  console.log(`🔍 **${environmentName}環境のスキーマ別関数分布**`);
  
  // スキーマをアルファベット順にソート
  const sortedSchemas = Object.keys(schemas).sort();
  
  sortedSchemas.forEach(schemaName => {
    const functions = schemas[schemaName];
    console.log(`   ${schemaName}スキーマ: ${functions.length}個`);
    
    // 各スキーマの代表的な関数を3個まで表示
    const sampleFunctions = functions.slice(0, 3);
    sampleFunctions.forEach(func => {
      const args = func.arguments ? `(${func.arguments.substring(0, 50)}${func.arguments.length > 50 ? '...' : ''})` : '()';
      console.log(`      - ${func.function_name}${args}`);
    });
    
    if (functions.length > 3) {
      console.log(`      + その他 ${functions.length - 3}個...`);
    }
    console.log('');
  });
  
  return schemas;
}

console.log('【開発環境】');
const devSchemas = analyzeSchemas(devFunctions, '開発');

console.log('【本番環境】');
const prodSchemas = analyzeSchemas(prodFunctions, '本番');

// publicスキーマの存在確認
const hasDevPublic = devSchemas.hasOwnProperty('public');
const hasProdPublic = prodSchemas.hasOwnProperty('public');

console.log('🎯 **publicスキーマ状況**');
console.log(`   開発環境: ${hasDevPublic ? '✅ 存在' : '❌ 存在せず'}`);
console.log(`   本番環境: ${hasProdPublic ? '✅ 存在' : '❌ 存在せず'}`);

if (!hasDevPublic && !hasProdPublic) {
  console.log('\n⚠️  **重要な発見！**');
  console.log('両環境ともpublicスキーマの関数が取得されていません。');
  console.log('これは以下の可能性があります：');
  console.log('1. 実際にpublicスキーマに関数が存在しない');
  console.log('2. クエリの条件でpublicスキーマが除外されている');
  console.log('3. 権限の問題でpublicスキーマの関数が見えない');
}

// 最も多くの関数を持つスキーマ
const allSchemas = new Set([...Object.keys(devSchemas), ...Object.keys(prodSchemas)]);

console.log('\n📈 **スキーマ別関数数比較**');
console.log('スキーマ名 | 開発環境 | 本番環境 | 差異');
console.log('---------|----------|----------|----');

[...allSchemas].sort().forEach(schema => {
  const devCount = devSchemas[schema] ? devSchemas[schema].length : 0;
  const prodCount = prodSchemas[schema] ? prodSchemas[schema].length : 0;
  const diff = devCount - prodCount;
  const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
  
  console.log(`${schema.padEnd(9)} | ${devCount.toString().padStart(8)} | ${prodCount.toString().padStart(8)} | ${diffStr.padStart(4)}`);
});

console.log('\n✨ スキーマ分析完了');
