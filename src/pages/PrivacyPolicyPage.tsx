import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Shield, Calendar, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ja' | 'en'>('ja');
  const navigate = useNavigate();

  // 現在の言語に基づいてデフォルトタブを設定
  React.useEffect(() => {
    setActiveTab(i18n.language === 'en' ? 'en' : 'ja');
  }, [i18n.language]);

  const japanesePolicy = `# BeatNexusプライバシーポリシー

**最終更新日: 2025年8月20日**

BeatNexus（以下「本サービス」といいます。）は、ユーザーの皆様の個人情報の保護を最も重要な責務の一つと認識し、このプライバシーポリシー（以下「本ポリシー」といいます。）に基づき、適切に取り扱います。GDPR、ePrivacy指令、個人情報保護法等の関連法令・ガイドラインを尊重します。

## 第1条（取得する個人情報）
当社は、本サービスの提供にあたり、以下の情報を取得します。
1.  **ユーザーから直接提供いただく情報**:
    *   メールアドレス（アカウント登録時）
    *   電話番号（アカウント登録時の本人認証のため）
    *   プロフィール情報（ユーザー名、アバター画像、自己紹介文など）
2.  **サービスの利用に伴い自動的に取得する情報**:
  *   Cookie（クッキー）およびそれに類する技術情報
  *   サービスの利用履歴（閲覧ページ、操作ログ、コンテンツ表示回数（インプレッション）、クリック/投票/投稿等のイベント）
  *   デバイス情報（OS、ブラウザ種別、IPアドレス（IP匿名化設定を行う場合あり）等）

## 第2条（個人情報の利用目的）
当社は、取得した個人情報を以下の目的で利用します。
1.  本サービスの提供、運営、維持、改善（ログイン認証、バトル/ランキング表示、機能改善）
2.  本人確認、不正利用防止、スパム・多重アカウント・不正投票の検知
3.  お問い合わせ・サポート対応、重大なお知らせ（規約変更、セキュリティ通知等）の送付
4.  利用状況の分析（匿名化または集計化した統計データ作成）
5.  広告の表示および最適化（後述「第5条 Cookie・広告等」参照。現時点でパーソナライズ広告は未導入）
6.  法令遵守、権利保護、紛争対応

## 第3条（個人情報の第三者提供）
当社は、以下の場合を除き、ユーザー本人の同意なく個人情報を第三者に提供しません。
1.  法令に基づく場合
2.  人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき
3.  公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき
4.  国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき

## 第4条（個人情報の安全管理）
当社は、取り扱う個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために、必要かつ適切な措置を講じます。本サービスでは、Supabaseの提供する堅牢なセキュリティ基盤を活用し、データの暗号化、アクセス制御などを実施しています。

## 第5条（Cookie・広告・同意管理について）
1.  当社は、サービス品質向上、セキュリティ確保、利用分析のため Cookie や同様の技術（LocalStorage 等）を使用します。現時点でパーソナライズ広告 Cookie は使用していません（導入時は再同意を取得します）。
2.  本サービスは Google が提供する Google Analytics（利用分析）を利用します（広告/AdSenseは未導入）。Analytics は Cookie を用いてページビュー、イベント（例: ページ閲覧、バトル閲覧、投票、クリック、投稿、検索、ランキング閲覧）等の利用状況を計測し、IP匿名化(anonymize_ip) を適用します。
3.  取得される情報には、IPアドレスの一部、ブラウザ・デバイス情報、閲覧ページ、広告表示/クリック情報等が含まれる場合があります。これらの情報は個人を直接特定するものではありません。
4.  欧州経済領域(EEA)、英国、スイスのユーザーに対しては、表示される同意管理メッセージ（CMP）で「同意」「同意しない」「設定」等を選択できます。選択肢はいつでも再表示（画面下部の「Cookie設定」リンクまたはブラウザキャッシュ削除）により変更できます。
5.  同意しない（拒否）を選択した場合、解析用Cookieは設定されません。
6.  ブラウザ設定で Cookie を無効化することも可能ですが、機能の一部が制限されることがあります。
7.  Google によるデータの利用について詳しくは「Google のサービスを使用するサイトやアプリから収集した情報の Google による使用」を参照してください。
8.  広告設定・オプトアウト: ユーザーは https://adssettings.google.com/ または https://myadcenter.google.com/ でパーソナライズ広告設定を変更できます。
9.  将来広告/パーソナライズ Cookie を導入する場合は、IAB TCF v2.2 に準拠したシグナル送信と再同意取得を行います。

## 第6条（ユーザーの権利）
ユーザーは、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止、データポータビリティ、処理の制限、及び同意の撤回を要求できます。法令上許容される範囲で速やかに対応します。ご希望の場合は第9条の窓口までご連絡ください。

## 第7条（同意の撤回）
同意に基づく処理（例：パーソナライズ広告、分析）について、ユーザーはいつでも撤回できます。撤回後、それ以前の処理の適法性に影響はありません。再度同意を与えるまで対象処理は停止または制限されます。

## 第8条（プライバシーポリシーの変更）
当社は、法令変更・サービス改善・運用方針変更等に応じて本ポリシーを改訂することがあります。重要な変更は本サービス上での掲示やメール通知等、合理的な方法で周知します。

## 第9条（お問い合わせ窓口）
本ポリシーおよび個人情報の取扱い、同意ステータスに関するお問い合わせは下記へご連絡ください。
- メールアドレス: beatnexus.app@gmail.com

以上`;

  const englishPolicy = `# BeatNexus Privacy Policy

**Last Updated: Aug 20, 2025**

BeatNexus (the "Service") recognizes the protection of your personal information as one of its most important responsibilities. We handle your information appropriately based on this Privacy Policy (the "Policy").

## Article 1 (Information We Collect)
We collect the following information in providing the Service:
1.  **Information You Provide Directly**:
    *   Email Address (for account registration)
    *   Phone Number (for identity verification during account registration)
    *   Profile Information (username, avatar image, bio, etc.)
2.  **Information Collected Automatically**:
  *   Cookies and similar technologies
  *   Service usage history (pages viewed, impressions, interaction events such as clicks, votes, submissions, searches, ranking views)
  *   Device information (OS, browser type, partially anonymized IP address (with anonymize_ip), etc.)

## Article 2 (Purpose of Use)
We use the collected personal information for the following purposes:
1.  To provide, operate, maintain, and improve the Service (e.g., login authentication, displaying battles and rankings).
2.  For identity verification, prevention of fraudulent use, and ensuring security.
3.  To respond to inquiries from users.
4.  To send important notices and maintenance information regarding the Service.
5.  To create anonymized statistical data for service improvement analysis.

## Article 3 (Provision to Third Parties)
We will not provide personal information to third parties without your consent, except in the following cases:
1.  When required by law.
2.  When it is necessary for the protection of a person's life, body, or property, and it is difficult to obtain your consent.
3.  When it is particularly necessary for improving public health or promoting the sound growth of children, and it is difficult to obtain your consent.
4.  When it is necessary to cooperate with a state or local government entity or a party entrusted by them in executing their legally prescribed duties, and obtaining your consent may impede the execution of such duties.

## Article 4 (Security Measures)
We take necessary and appropriate measures to prevent the leakage, loss, or damage of personal information and to otherwise manage its security. The Service utilizes the robust security infrastructure provided by Supabase, including data encryption and access control.

## Article 5 (Cookies, Advertising & Consent Management)
1. We use cookies and similar technologies (including local storage) for usability, security and analytics. No personalized advertising cookies are currently deployed (we will re-seek consent if introduced).
2. We use Google Analytics for usage analytics only (no AdSense yet). Analytics collects page views and defined events (e.g. battle views, votes, clicks, submissions, searches, ranking views) with IP anonymization.
3. A consent banner allows Accept / Reject / Customize. You can revisit settings (footer “Cookie Settings” link or clearing cookies/local storage).
4. If you reject, analytics cookies are not set.
5. You can disable cookies in your browser; some features may be limited.
6. See "How Google uses information from sites or apps that use our services" for details on Google's data usage.
7. We will implement IAB TCF v2.2 signals if/when advertising features are introduced (fresh consent will be requested).

## Article 6 (Your Rights)
You may request access, rectification, addition, deletion, restriction, data portability, objection, and withdrawal of consent. We will respond within a reasonable period as permitted by applicable law. Contact: Article 9.

## Article 7 (Withdrawal of Consent)
You may withdraw consent (e.g. for personalized ads, analytics) at any time. Prior processing remains lawful. Processing pauses or is limited until renewed consent is given.

## Article 8 (Changes to this Policy)
We may update this Policy to reflect legal, service, or operational changes. Material changes will be announced via on-site notice or other reasonable means.

## Article 9 (Contact Information)
For inquiries regarding this Policy, personal data, or consent status:
- Email: beatnexus.app@gmail.com

End`;

  const renderMarkdown = (content: string) => {
    // This is a simplified markdown renderer. For a real app, a library like 'react-markdown' would be better.
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl md:text-4xl font-bold text-white mb-6 mt-8 first:mt-0">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl md:text-2xl font-semibold text-cyan-400 mb-4 mt-8 border-b border-gray-700 pb-2">{line.substring(3)}</h2>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="text-gray-300 mb-4 font-semibold">{line.substring(2, line.length - 2)}</p>;
      }
      if (line.match(/^\d+\. /) || line.match(/^- /)) {
        return <p key={index} className="text-gray-300 mb-3 ml-4">{line}</p>;
      }
      if (line.trim() === '') {
        return <div key={index} className="mb-2" />;
      }
      if (line === '以上' || line === 'End') {
        return <p key={index} className="text-center text-gray-400 mt-8 font-medium">{line}</p>;
      }
      return <p key={index} className="text-gray-300 mb-4 leading-relaxed">{line}</p>;
    });
  };


  return (
    <>
      <Helmet>
        <title>{t('common.privacyPolicy')} | BeatNexus</title>
        <meta name="description" content={t('privacyPolicyPage.subtitle', '個人情報の取り扱いに関する方針をご確認ください')} />
      </Helmet>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {t('common.back')}
          </Button>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full p-6">
                <Shield className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('common.privacyPolicy')}
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              {t('privacyPolicyPage.subtitle', '個人情報の取り扱いに関する方針をご確認ください')}
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 border border-gray-700/50">
              <button
                onClick={() => setActiveTab('ja')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'ja'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {t('privacyPolicyPage.languageTabs.japanese')}
              </button>
              <button
                onClick={() => setActiveTab('en')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'en'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {t('privacyPolicyPage.languageTabs.english')}
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 md:p-12">
              <div className="prose prose-invert max-w-none">
                {activeTab === 'ja' ? renderMarkdown(japanesePolicy) : renderMarkdown(englishPolicy)}
              </div>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-purple-500/30">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center gap-2">
                  <Mail className="h-5 w-5 text-purple-400" />
                  {t('common.contactUs')}
                </h3>
                <p className="text-gray-300 mb-4">
                  {t('privacyPolicyPage.contactMessage', 'プライバシーポリシーに関するご質問は、下記までご連絡ください。')}
                </p>
                <a 
                  href="mailto:beatnexus.app@gmail.com"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  <Mail className="h-4 w-4" />
                  beatnexus.app@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-400 text-sm flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('common.lastUpdated')}: 2025年7月18日
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage; 