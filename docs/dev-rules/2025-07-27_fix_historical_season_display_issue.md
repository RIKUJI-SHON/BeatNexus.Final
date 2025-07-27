# 履歴シーズンランキング表示問題修正 - 2025-07-27

## 問題の概要
本番環境で終了したHeartBeatシーズンの投票者ランキングがドロップダウンで選択してもNo Rankingと表示される問題が発生していた。

## 根本原因の特定
1. **アクティブなシーズンが存在しない**: 本番環境ではHeartBeat（ended）とβSeason 0（upcoming）のみが存在し、現在アクティブなシーズンがない
2. **初期化ロジックの問題**: アクティブなシーズンがない場合、rankingStoreでは`activeVoterRankingType: 'all_time'`に設定されるため、過去のシーズンデータが表示されない
3. **TopThreePodiumでの型不整合**: `entry.position`や`entry.user_id`への直接アクセスが、SeasonVoterRankingEntryの構造（`rank`、`id`プロパティ）と一致していない

## 修正内容

### 1. RankingPage初期化処理の改善
**ファイル**: `src/pages/RankingPage.tsx`

- アクティブなシーズンがない場合、最新の終了したシーズン（HeartBeat）をデフォルトで選択
- 初期化処理を2つのuseEffectに分離して依存関係を整理

```typescript
// アクティブなシーズンがない場合の処理を別のuseEffectで管理
useEffect(() => {
  if (seasons.length > 0 && !currentSeason && !selectedSeasonId) {
    const latestEndedSeason = seasons
      .filter(s => s.status === 'ended')
      .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())[0];
    
    if (latestEndedSeason) {
      console.log('[DEBUG] No active season, selecting latest ended season:', latestEndedSeason.name);
      setSelectedSeasonId(latestEndedSeason.id);
      setActiveRankingType('current_season');
      setActiveVoterRankingType('current_season');
      fetchHistoricalSeasonRankings(latestEndedSeason.id);
      fetchHistoricalSeasonVoterRankings(latestEndedSeason.id);
    }
  }
}, [seasons, currentSeason, selectedSeasonId, ...]);
```

### 2. TopThreePodiumコンポーネントの修正
**ファイル**: `src/components/ui/TopThreePodium.tsx`

- `getPosition`と`getUserId`関数をpropsとして受け取り、直接プロパティアクセスを避ける
- SeasonVoterRankingEntryの構造（`rank`、`id`）に対応

```typescript
interface TopThreePodiumProps {
  // ... 既存のprops
  getPosition: (entry: unknown) => number;
  getUserId: (entry: unknown) => string;
}

// 使用箇所の修正
const position = getPosition(entry);
const userId = getUserId(entry);
```

### 3. デバッグログの追加
- 履歴シーズンデータの取得・マッピング過程を詳細にトラッキング
- シーズン選択時の処理フローを可視化

## データベース確認結果
```sql
-- HeartBeatシーズンの投票者ランキングデータが正常に存在することを確認
SELECT * FROM season_voter_rankings 
WHERE season_id = 'b15b79bd-5566-488d-a37c-c4e823141142' 
ORDER BY rank ASC;

-- 関数も正常に動作することを確認
SELECT * FROM get_season_voter_rankings_by_id('b15b79bd-5566-488d-a37c-c4e823141142');
```

## 解決後の動作
1. **本番環境でアクティブなシーズンがない場合**: 自動的にHeartBeatシーズンが選択され、投票者ランキングが表示される
2. **過去のシーズン選択**: ドロップダウンでHeartBeatを選択すると、5名の投票者ランキングが正しく表示される
3. **Top3表示**: 1位のRIKUJI（3票）が正しくTop3 Podiumに表示される

## 今後の改善点
- 型安全性の向上（TopThreePodiumのpropsの型定義改善）
- アクティブなシーズンがない期間の UX改善
- 履歴データのキャッシュ機能検討

## 関連ファイル
- `src/pages/RankingPage.tsx`
- `src/components/ui/TopThreePodium.tsx`
- `src/store/rankingStore.ts`
- `src/types/index.ts`
