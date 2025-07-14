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

**最終更新日: 2025年7月18日**

BeatNexus（以下「本サービス」といいます。）は、ユーザーの皆様の個人情報の保護を最も重要な責務の一つと認識し、このプライバシーポリシー（以下「本ポリシー」といいます。）に基づき、適切に取り扱います。

## 第1条（取得する個人情報）
当社は、本サービスの提供にあたり、以下の情報を取得します。
1.  **ユーザーから直接提供いただく情報**:
    *   メールアドレス（アカウント登録時）
    *   電話番号（アカウント登録時の本人認証のため）
    *   プロフィール情報（ユーザー名、アバター画像、自己紹介文など）
2.  **サービスの利用に伴い自動的に取得する情報**:
    *   Cookie（クッキー）およびそれに類する技術情報
    *   サービスの利用履歴（閲覧ページ、操作ログなど）
    *   デバイス情報（OS、ブラウザ種別、IPアドレスなど）

## 第2条（個人情報の利用目的）
当社は、取得した個人情報を以下の目的で利用します。
1.  本サービスの提供、運営、維持、改善のため（ログイン認証、バトルやランキングの表示など）
2.  本人確認、不正利用防止、その他安全性の確保のため
3.  ユーザーからのお問い合わせに対応するため
4.  本サービスに関する重要なお知らせやメンテナンス情報などを通知するため
5.  個人を特定できない形で統計データを作成し、サービス改善の分析に利用するため

## 第3条（個人情報の第三者提供）
当社は、以下の場合を除き、ユーザー本人の同意なく個人情報を第三者に提供しません。
1.  法令に基づく場合
2.  人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき
3.  公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき
4.  国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき

## 第4条（個人情報の安全管理）
当社は、取り扱う個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために、必要かつ適切な措置を講じます。本サービスでは、Supabaseの提供する堅牢なセキュリティ基盤を活用し、データの暗号化、アクセス制御などを実施しています。

## 第5条（Cookieの使用について）
1.  当社は、サービスの利便性向上や利用状況の分析のため、Cookieを使用しています。
2.  本サービスでは、Google LLCが提供するアクセス解析ツール「Google Analytics」を利用しています。Google Analyticsは、Cookieを利用してユーザーのトラフィックデータを収集します。このデータは匿名で収集されており、個人を特定するものではありません。詳細については、「Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用」のページをご覧ください。
3.  ユーザーは、お使いのブラウザの設定により、Cookieを無効にすることができます。

## 第6条（ユーザーの権利）
ユーザーは、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止を請求することができます。ご希望の場合は、第8条のお問い合わせ窓口までご連絡ください。

## 第7条（プライバシーポリシーの変更）
当社は、法令の変更やサービスの改善に伴い、本ポリシーを改定することがあります。重要な変更を行う場合には、本サービス上での通知など、分かりやすい方法でお知らせします。

## 第8条（お問い合わせ窓口）
本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
- メールアドレス: beatnexus.app@gmail.com

以上`;

  const englishPolicy = `# BeatNexus Privacy Policy

**Last Updated: July 18, 2025**

BeatNexus (the "Service") recognizes the protection of your personal information as one of its most important responsibilities. We handle your information appropriately based on this Privacy Policy (the "Policy").

## Article 1 (Information We Collect)
We collect the following information in providing the Service:
1.  **Information You Provide Directly**:
    *   Email Address (for account registration)
    *   Phone Number (for identity verification during account registration)
    *   Profile Information (username, avatar image, bio, etc.)
2.  **Information Collected Automatically**:
    *   Cookies and similar technologies
    *   Service usage history (pages viewed, actions taken, etc.)
    *   Device information (OS, browser type, IP address, etc.)

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

## Article 5 (Use of Cookies)
1.  We use cookies to improve the usability of the Service and to analyze usage patterns.
2.  The Service uses Google Analytics, an access analysis tool provided by Google LLC. Google Analytics uses cookies to collect user traffic data. This data is collected anonymously and does not personally identify you. For more details, please see the "How Google uses information from sites or apps that use our services" page.
3.  You can disable cookies through your browser settings.

## Article 6 (Your Rights)
You have the right to request the disclosure, correction, addition, deletion, or suspension of use of your personal information held by us. To make a request, please contact us at the email address provided in Article 8.

## Article 7 (Changes to this Policy)
We may revise this Policy in response to changes in laws or improvements to the Service. If we make significant changes, we will notify you in an easy-to-understand manner, such as through a notice on the Service.

## Article 8 (Contact Information)
For inquiries regarding this Policy, please contact us at the following:
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
                日本語
              </button>
              <button
                onClick={() => setActiveTab('en')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'en'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                English
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