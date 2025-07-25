# BeatNexus Googleアナリティクス実装仕様書

## 📋 概要

BeatNexusにおけるGoogleアナリティクス（GA4）の実装仕様とイベント追跡戦略を定義します。ユーザーの行動分析、パフォーマンス計測、エラー追跡を通じて、サービス改善とユーザー体験向上を図ります。

---

## 🔧 技術仕様

### 使用ライブラリ
- **react-ga4**: React用GA4ライブラリ
- **測定ID**: `G-P7Q1HTZNNW`

### 環境設定
```typescript
// 開発環境判定条件
const isDevelopment = 
  import.meta.env.DEV || 
  import.meta.env.MODE === 'development' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '3000';
```

### プライバシー設定
```typescript
ReactGA.initialize(GA_TRACKING_ID, {
  gtagOptions: {
    anonymize_ip: true,              // IP匿名化
    cookie_flags: 'SameSite=Strict;Secure', // セキュアCookie
  },
});
```

---

## 📊 イベント追跡仕様

### 1. ユーザー関連イベント

#### 1.1 新規登録
- **イベント名**: `register`
- **カテゴリ**: `user`
- **発火タイミング**: 新規アカウント作成成功時
- **発火条件**: `SIGNED_UP`認証イベント時のみ
- **実装場所**: `authStore.ts` > `signUp()`

#### 1.2 ログイン
- **イベント名**: `login`
- **カテゴリ**: `user`  
- **発火タイミング**: ユーザー主導のログイン成功時
- **発火条件**: 
  - 実際のログインフォーム経由でのログイン
  - ページリロード/セッション復元時は**発火しない**
- **実装メカニズム**: 
  ```typescript
  // signIn実行時にフラグを設定
  signIn: async (email, password) => {
    set({ isUserInitiatedLogin: true });
    // ... ログイン処理
  }
  
  // AuthProvider経由でのユーザー設定時に判定
  setUserFromAuth: (user) => {
    const isUserLogin = useAuthStore.getState().isUserInitiatedLogin;
    setUserProperties(user.id, isUserLogin); // isUserLoginがtrueの場合のみログインイベント発火
  }
  ```

#### 1.3 ログアウト
- **イベント名**: `logout`
- **カテゴリ**: `user`
- **発火タイミング**: ログアウト実行時
- **実装場所**: `authStore.ts` > `signOut()`

#### 1.4 プロフィール関連
- **プロフィール閲覧**
  - イベント名: `view_profile`
  - カテゴリ: `user`
  - ラベル: `userId`
  - 発火タイミング: プロフィールページアクセス時

- **プロフィール編集**
  - イベント名: `edit_profile`
  - カテゴリ: `user`
  - 発火タイミング: プロフィール編集完了時

### 2. バトル関連イベント

#### 2.1 バトル閲覧
- **アクティブバトル閲覧**
  - イベント名: `view_active_battle`
  - カテゴリ: `battle`
  - ラベル: `battleId`

- **アーカイブバトル閲覧**
  - イベント名: `view_archived_battle`
  - カテゴリ: `battle`
  - ラベル: `battleId`

#### 2.2 バトル投票
- **イベント名**: `vote_battle`
- **カテゴリ**: `battle`
- **ラベル**: `battleId`
- **発火条件**:
  ```typescript
  if (!user || isUserParticipant || hasVoted) return; // 発火しない
  ```
- **重複防止**: 既に投票済みの場合は追跡しない
- **実装場所**: `BattleView.tsx` > `handleSimpleVote()`, `handleVoteWithComment()`

#### 2.3 バトル共有
- **イベント名**: `share_battle`
- **カテゴリ**: `battle`
- **ラベル**: `battleId`

### 3. 投稿関連イベント

#### 3.1 動画投稿
- **イベント名**: `submit_video`
- **カテゴリ**: `submission`
- **ラベル**: `battleFormat` (例: "DANCE", "RAP", "SING")
- **発火タイミング**: 投稿処理完全成功後
- **実装場所**: `PostPage.tsx` > 投稿成功時

#### 3.2 動画アップロード
- **イベント名**: `upload_video`
- **カテゴリ**: `submission`
- **ラベル**: `uploadMethod` (例: "file", "url")

### 4. ランキング関連イベント

#### 4.1 ランキング閲覧
- **イベント名**: `view_ranking`
- **カテゴリ**: `ranking`
- **ラベル**: 
  - `rating` (プレイヤーランキング)
  - `voter` (投票者ランキング)
  - `rating_current_season` (現在シーズンプレイヤー)
  - `rating_all_time` (歴代プレイヤー)
  - `voter_current_season` (現在シーズン投票者)
  - `voter_all_time` (歴代投票者)

- **実装例**:
  ```typescript
  rankingView: (rankingType: 'rating' | 'voter', subType?: string) => {
    const label = subType ? `${rankingType}_${subType}` : rankingType;
    trackEvent('view_ranking', 'ranking', label);
  }
  ```

### 5. ナビゲーション関連イベント

#### 5.1 検索
- **イベント名**: `search`
- **カテゴリ**: `navigation`
- **ラベル**: 検索クエリ

#### 5.2 リンククリック
- **イベント名**: `click_link`
- **カテゴリ**: `navigation`
- **ラベル**: `リンクテキスト|URL`

#### 5.3 言語変更
- **イベント名**: `change_language`
- **カテゴリ**: `settings`
- **ラベル**: 選択された言語コード
- **実装場所**: `SettingsPage.tsx`

### 6. コミュニティ関連イベント（未実装）

#### 6.1 投稿作成
- **イベント名**: `create_post`
- **カテゴリ**: `community`

#### 6.2 投稿いいね
- **イベント名**: `like_post`
- **カテゴリ**: `community`
- **ラベル**: `postId`

#### 6.3 コメント作成
- **イベント名**: `create_comment`
- **カテゴリ**: `community`
- **ラベル**: `postId`

---

## 📈 自動追跡機能

### 1. ページビュー追跡
- **実装**: `useAnalytics` フック
- **追跡内容**: 
  - ページパス + クエリパラメータ
  - ページタイトル
- **自動実行**: React Router のページ遷移時

### 2. パフォーマンス計測
- **実装**: `usePerformanceTracking` フック
- **追跡内容**:
  - ページ読み込み時間
  - タイミングイベント
- **実装例**:
  ```typescript
  trackTiming('page_load', loadTime, 'performance');
  ```

### 3. ユーザープロパティ設定
- **User ID設定**: ハッシュ化されたユーザーID
- **重複防止機能**:
  ```typescript
  // 同じUser IDの重複設定を防ぐ
  if (currentSetUserId === userId) return;
  
  // セッション開始から10秒以内の重複設定を防ぐ
  if (sessionStartTime && (now - sessionStartTime) < 10000) return;
  ```

---

## 🚨 エラー追跡仕様

### 1. アプリケーションエラー
- **ErrorBoundary**: React コンポーネントエラーキャッチ
- **追跡内容**:
  - エラーメッセージ
  - スタックトレース
  - コンポーネントスタック

### 2. グローバルエラー
- **未処理Promise拒否**:
  ```typescript
  window.addEventListener('unhandledrejection', (event) => {
    trackError('Unhandled Promise Rejection', event.reason?.toString());
  });
  ```

- **グローバルエラー**:
  ```typescript
  window.addEventListener('error', (event) => {
    trackError('Global Error', 
      `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
  });
  ```

### 3. カスタムエラー追跡
- **関数**: `trackError(error: string, errorInfo?: string)`
- **カテゴリ**: `application`
- **使用例**: API エラー、バリデーションエラーなど

---

## 🔒 プライバシー・セキュリティ

### 1. 開発環境での追跡停止
```typescript
if (!isDevelopment) {
  // 本番環境のみでGA実行
  ReactGA.event({ ... });
} else {
  // 開発環境ではコンソールログのみ
  console.log('GA [DEV]: Event would be tracked');
}
```

### 2. 個人情報保護
- **IP匿名化**: `anonymize_ip: true`
- **セキュアCookie**: `SameSite=Strict;Secure`
- **User ID**: ハッシュ化されたID使用（個人特定不可）

### 3. GDPR準拠
- Cookieポリシーに基づく追跡
- ユーザー同意に基づく動作（必要に応じて実装）

---

## 📂 ファイル構成

### 主要ファイル
```
src/
├── utils/
│   └── analytics.ts              # GA初期化・イベント追跡関数
├── hooks/
│   └── useAnalytics.ts          # ページビュー・パフォーマンス追跡
├── store/
│   └── authStore.ts             # ユーザー認証イベント
├── components/
│   ├── ErrorBoundary.tsx        # エラーバウンダリ
│   ├── auth/AuthModal.tsx       # ログイン処理
│   └── battle/BattleView.tsx    # バトル投票イベント
└── pages/
    ├── PostPage.tsx             # 投稿イベント
    ├── ProfilePage.tsx          # プロフィール閲覧
    ├── RankingPage.tsx          # ランキング閲覧
    └── SettingsPage.tsx         # 設定変更イベント
```

### 初期化フロー
1. `App.tsx` で `initializeGA()` 実行
2. `useAnalytics()` でページビュー追跡開始
3. `AuthProvider` でユーザー認証状態管理
4. 各コンポーネントで `trackBeatNexusEvents` 使用

---

## 🧪 テスト・検証

### 1. 開発環境での確認
- コンソールログで追跡イベント確認
- `GA [DEV]:` プレフィックスで識別

### 2. 本番環境での検証
- GA4リアルタイムレポートで確認
- カスタムイベントの発火確認
- ユーザープロパティの設定確認

### 3. 重複防止の検証
- 同一ユーザーの重複ログインイベント確認
- 投票重複防止の動作確認
- セッション復元時の非追跡確認

---

## 🔄 今後の拡張予定

### 1. コンバージョン追跡
- サブスクリプション購入
- プレミアム機能利用
- トーナメント参加

### 2. 詳細なユーザー行動分析
- 動画視聴時間
- バトル参加頻度
- ランキング変動追跡

### 3. A/Bテスト対応
- GA4カスタムディメンション
- 実験グループ追跡

---

## 📞 サポート・メンテナンス

### 更新履歴
- **2025-07-25**: 初版作成
  - ログイン追跡の修正
  - エラー追跡の強化
  - ランキング追跡の詳細化

### 関連ドキュメント
- [BeatNexus.mdc](./BeatNexus.mdc) - 全体仕様
- [デザインルールAtlassian.md](./デザインルールAtlassian.md) - デザインガイドライン

---

*この仕様書は BeatNexus の実装状況に基づいて作成されており、定期的な更新が必要です。*
