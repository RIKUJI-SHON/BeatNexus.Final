// injectAdSlots.ts
// 目的: 任意の配列に広告プレースホルダを挿入する純関数。元の index 順序を壊さない。
// 戻り値: 元要素 or { __adPlacement: string } のオブジェクトを含む新配列。

export type AdSlotPlaceholder = { __adPlacement: string };
export interface InjectRule { index: number; placementKey: string }

export function injectAdSlots<T>(items: T[], rules: InjectRule[]): (T | AdSlotPlaceholder)[] {
  const result: (T | AdSlotPlaceholder)[] = [];
  const sorted = [...rules].sort((a,b) => a.index - b.index);
  let ruleIdx = 0;
  for (let i=0; i<items.length; i++) {
    // i番目の要素を push
    result.push(items[i]);
    // その後に index==i+1 ("i件表示した後") ルールを挿入
    while (ruleIdx < sorted.length && sorted[ruleIdx].index === i+1) {
      result.push({ __adPlacement: sorted[ruleIdx].placementKey });
      ruleIdx++;
    }
  }
  // 末尾にも挿入ルールがあれば対応 (index === items.length+1 など)
  while (ruleIdx < sorted.length) {
    if (sorted[ruleIdx].index >= items.length) {
      result.push({ __adPlacement: sorted[ruleIdx].placementKey });
    }
    ruleIdx++;
  }
  return result;
}

export function isAdSlotPlaceholder(x: unknown): x is AdSlotPlaceholder {
  if (!x || typeof x !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(x, '__adPlacement');
}

/**
 * N件ごとに広告を挿入するルールを生成
 * @param interval 間隔（例：3件ごと）
 * @param maxItems アイテムの最大数
 * @param basePlacementKey ベースとなる配置キー（例：'battles.list.after-{position}.infeed'）
 * @returns InjectRule配列
 */
export function generatePeriodicAdRules(
  interval: number, 
  maxItems: number, 
  basePlacementKey: string
): InjectRule[] {
  const rules: InjectRule[] = [];
  
  for (let position = interval; position < maxItems; position += interval) {
    const placementKey = basePlacementKey.replace('{position}', position.toString());
    rules.push({ index: position, placementKey });
  }
  
  return rules;
}

/**
 * バトル一覧用の3件ごと広告挿入ルールを生成
 * @param maxItems バトルアイテムの最大数
 * @returns InjectRule配列
 */
export function generateBattleAdRules(maxItems: number): InjectRule[] {
  return generatePeriodicAdRules(3, maxItems, 'battles.list.after-{position}.infeed');
}
