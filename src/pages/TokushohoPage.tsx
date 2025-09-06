import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const TokushohoPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>特定商取引法に基づく表記 | BeatNexus</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="BeatNexus の特定商取引法に基づく表記" />
      </Helmet>

      <h1 className="text-3xl font-bold mb-6">特定商取引法に基づく表記</h1>

      <div className="space-y-6 text-sm leading-7">
        <section>
          <h2 className="font-semibold">販売事業者</h2>
          <p>個人事業（法人ではありません）</p>
        </section>

        <section>
          <h2 className="font-semibold">代表者名</h2>
          <p>荻野陸児</p>
        </section>

        <section>
          <h2 className="font-semibold">所在地</h2>
          <p>所在地は、請求があれば遅滞なく開示します。お問い合わせは上記メールアドレスへご連絡ください。</p>
        </section>

        <section>
          <h2 className="font-semibold">連絡先</h2>
          <p>
            <a className="text-blue-600 hover:underline" href="mailto:beatnexus.app@gmail.com">beatnexus.app@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="font-semibold">販売価格</h2>
          <p>
            各画面に表示された金額（消費税込）。決済手数料等が別途発生する場合は、画面上に明示します。
          </p>
        </section>

        <section>
          <h2 className="font-semibold">代金の支払時期・方法</h2>
          <p>
            クレジットカードその他、Stripeダッシュボードで有効化された決済手段により決済されます。<br />
            支払時期は各カード会社等の規定に基づきます。
          </p>
        </section>

        <section>
          <h2 className="font-semibold">引き渡し時期・提供時期</h2>
          <p>
            Super Tips（デジタル支援）は決済確定後、即時に提供完了となります。物理的な商品の引き渡しはありません。
          </p>
        </section>

        <section>
          <h2 className="font-semibold">返品・キャンセル</h2>
          <p>
            デジタル性質上、決済後の返品・キャンセルはお受けできません。
          </p>
        </section>

        <section>
          <h2 className="font-semibold">動作環境・提供形態</h2>
          <p>
            提供形態はデジタルコンテンツ/オンライン役務です。最新のウェブブラウザでのご利用を推奨します。
          </p>
        </section>

        <section>
          <h2 className="font-semibold">営業時間/問い合わせ対応時間</h2>
          <p>平日10:00–18:00（JST）、原則3営業日以内に返信</p>
        </section>

        <section>
          <h2 className="font-semibold">決済・受益者に関する特記事項</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>決済形態: Stripe Connect（Express）＋ Destination charges</li>
            <li>受益者: クリエイター（接続アカウント・バトル参加ビートボクサー）</li>
            <li>プレイヤーへの配分率: 支援額の85%（プラットフォーム運営費15%を除く）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">関連ポリシー</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Link className="text-blue-600 hover:underline" to="/terms">利用規約</Link>
            </li>
            <li>
              <Link className="text-blue-600 hover:underline" to="/privacy">プライバシーポリシー</Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default TokushohoPage;
