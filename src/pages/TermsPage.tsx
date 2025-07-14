import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FileText, Calendar, Mail, Scale, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ja' | 'en'>('ja');
  const navigate = useNavigate();

  // 現在の言語に基づいてデフォルトタブを設定
  React.useEffect(() => {
    setActiveTab(i18n.language === 'en' ? 'en' : 'ja');
  }, [i18n.language]);

  const japaneseTerms = `# BeatNexus利用規約

**最終更新日: 2025年7月18日**

この利用規約（以下「本規約」といいます。）は、BeatNexus（以下「本サービス」といいます。）の利用条件を定めるものです。ユーザーの皆様（以下「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。

## 第1条（適用）
本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。ユーザーは、本サービスの利用を開始する前に、本規約の全ての記載内容に同意いただく必要があります。

## 第2条（アカウント登録）
1. 本サービスの利用を希望する方は、本規約に同意の上、当社所定の方法に従いアカウント登録を行うものとします。
2. アカウント登録には、有効なメールアドレス、および投票システムの公正性を保つための**電話番号による本人認証**が必要です。この認証は、不正な複数アカウントの作成を防ぎ、全てのユーザーに公平なバトル環境を提供することを目的としています。
3. ユーザーは、登録情報が常に正確かつ最新であるよう、自身の責任で管理するものとします。
4. ユーザーは、自己の責任において、本サービスのパスワードを適切に管理するものとします。いかなる場合においても、アカウントを第三者に譲渡または貸与することはできません。

## 第3条（サービスの内容）
本サービスは、ビートボックスのオンラインバトルを中心としたプラットフォームであり、以下の機能を提供します。
1. 動画の投稿およびバトルへの参加機能
2. 他のユーザーのバトルに対する投票およびコメント機能
3. バトル結果に基づくレーティングおよびランキングシステム
4. ユーザー間の交流を目的としたコミュニティの作成・参加機能

## 第4条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
1. 法令または公序良俗に違反する行為
2. 犯罪行為に関連する行為
3. 第三者の著作権、商標権、肖像権その他の知的財産権を侵害する行為
4. 他のユーザーに対する誹謗中傷、嫌がらせ、名誉毀損、その他精神的苦痛を与える行為
5. 過度に暴力的な表現、露骨な性的表現、人種、国籍、信条、性別、社会的身分などによる差別につながる表現、その他反社会的な内容を含み他人に不快感を与える情報を投稿する行為
6. なりすまし行為や、意図的に虚偽の情報を流布させる行為
7. 不正な目的で複数のアカウントを作成または利用する行為
8. 本サービスのサーバーやネットワークの機能を破壊したり、妨害したりする行為
9. その他、当社が不適切と判断する行為

## 第5条（投稿コンテンツの権利）
1. ユーザーが本サービスを利用して投稿した動画、コメント、その他のコンテンツ（以下「投稿コンテンツ」といいます。）の著作権は、当該ユーザー自身に帰属します。
2. ただし、当社は、本サービスの提供、改善、宣伝広告（公式SNSでの紹介等を含む）に必要な範囲内において、投稿コンテンツを無償で利用（複製、上映、公衆送信、展示、頒布、翻訳、改変等を含む）することができるものとします。ユーザーは、この利用に関して著作者人格権を行使しないことに同意するものとします。

## 第6条（アカウントの停止・削除）
1. 当社は、ユーザーが本規約のいずれかの条項に違反したと判断した場合、事前の通知なく、当該ユーザーに対して本サービスの全部または一部の利用を制限し、またはアカウントを削除することができるものとします。
2. ユーザーは、当社所定の手続きにより、いつでも自身のアカウントを削除し、退会することができます。
3. 当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
4. 退会したユーザーのデータは、当社のプライバシーポリシーに基づき処理されます。バトル履歴などの一部データは、個人を特定できない形で匿名化された上で、サービス上に残存する場合があります。

## 第7条（免責事項）
1. 当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
2. 当社は、本サービスの提供の中断、停止、終了、利用不能または変更、ユーザーの投稿情報の削除または消失、その他本サービスに関してユーザーが被った損害につき、賠償する責任を一切負わないものとします。
3. ユーザー間で生じた一切のトラブルについては、ユーザー自身の責任において解決するものとし、当社はこれに関与しません。

## 第8条（個人情報の取扱い）
当社は、本サービスの利用によって取得するユーザーの個人情報については、別途定める「プライバシーポリシー」に従い、適切に取り扱うものとします。

## 第9条（利用規約の変更）
当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス上の適宜の場所に掲示された時点からその効力を生じるものとし、ユーザーは変更後も本サービスを利用し続けることにより、変更後の規約に同意したものとみなします。

## 第10条（準拠法・裁判管轄）
1. 本規約の解釈にあたっては、日本法を準拠法とします。
2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。（例：東京地方裁判所）

以上`;

  const englishTerms = `# BeatNexus Terms of Service

**Last Updated: July 18, 2025**

These Terms of Service ("Terms") govern your use of BeatNexus (the "Service"). By using the Service, you agree to be bound by these Terms.

## Article 1 (Application)
These Terms shall apply to all aspects of the relationship between you ("User") and us regarding the use of the Service. You must agree to all provisions of these Terms before using the Service.

## Article 2 (Account Registration)
1. To use the Service, you must agree to these Terms and register for an account according to the methods specified by us.
2. Account registration requires a valid email address and **identity verification via a phone number**. This verification is for the purpose of maintaining the fairness of the voting system, preventing the creation of fraudulent multiple accounts, and providing a fair battle environment for all users.
3. You are responsible for ensuring that your registration information is always accurate and up-to-date.
4. You are solely responsible for maintaining the confidentiality of your password. You may not transfer or lend your account to any third party under any circumstances.

## Article 3 (Description of the Service)
The Service is an online beatbox battle platform that provides the following features:
1. Ability to upload videos and participate in battles.
2. Ability to vote and comment on other Users' battles.
3. A rating and ranking system based on battle results.
4. Ability to create and join communities for user interaction.

## Article 4 (Prohibited Conduct)
When using the Service, you must not engage in any of the following acts:
1. Acts that violate laws or public order and morals.
2. Acts related to criminal activity.
3. Acts that infringe upon the copyrights, trademarks, portrait rights, or other intellectual property rights of third parties.
4. Acts of slander, harassment, defamation, or causing emotional distress to other Users.
5. Posting excessively violent or sexually explicit content, expressions that lead to discrimination based on race, nationality, creed, sex, or social status, or other antisocial content that causes discomfort to others.
6. Impersonation or intentionally spreading false information.
7. Creating or using multiple accounts for fraudulent purposes.
8. Acts that destroy or interfere with the functionality of our servers or network.
9. Any other acts that we deem inappropriate.

## Article 5 (Rights to Posted Content)
1. The copyright for any videos, comments, or other content you post using the Service ("Posted Content") belongs to you.
2. However, you grant us a non-exclusive, royalty-free, worldwide license to use (including to reproduce, screen, publicly transmit, display, distribute, translate, and modify) your Posted Content to the extent necessary for the provision, improvement, and promotion of the Service (including promotion on official social media). You agree not to exercise your moral rights as an author in connection with this use.

## Article 6 (Account Suspension and Deletion)
1. If we determine that you have violated any provision of these Terms, we may, without prior notice, restrict your use of all or part of the Service or delete your account.
2. You may delete your account and withdraw from the Service at any time by following the prescribed procedures.
3. We shall not be liable for any damages incurred by you as a result of actions taken by us under this Article.
4. Upon withdrawal, your data will be handled in accordance with our Privacy Policy. Some data, such as battle history, may remain on the Service in an anonymized form that does not identify you personally.

## Article 7 (Disclaimers)
1. We do not warrant, either expressly or impliedly, that the Service is free from de facto or legal defects (including defects related to safety, reliability, accuracy, completeness, validity, fitness for a particular purpose, security, errors or bugs, or infringement of rights).
2. We shall not be liable for any damages incurred by you arising from the interruption, suspension, or termination of the Service, inability to use or changes to the Service, deletion or loss of your posted information, or any other damages related to the Service.
3. You are responsible for resolving any disputes that arise between you and other Users, and we will not be involved in such disputes.

## Article 8 (Handling of Personal Information)
We will handle your personal information obtained through the use of the Service appropriately and in accordance with our separate "Privacy Policy."

## Article 9 (Changes to the Terms)
We may amend these Terms at any time without notice to you if we deem it necessary. The amended Terms shall become effective from the time they are posted in an appropriate location within the Service. By continuing to use the Service after the changes, you are deemed to have agreed to the amended Terms.

## Article 10 (Governing Law and Jurisdiction)
1. These Terms shall be governed by and construed in accordance with the laws of Japan.
2. Any disputes arising in connection with the Service shall be subject to the exclusive jurisdiction of the court having jurisdiction over our head office location (e.g., the Tokyo District Court).

End`;

  // Markdownコンテンツをレンダリングするヘルパー関数
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={currentKey++} className="text-3xl md:text-4xl font-bold text-white mb-6 mt-8 first:mt-0">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={currentKey++} className="text-xl md:text-2xl font-semibold text-cyan-400 mb-4 mt-8 border-b border-gray-700 pb-2">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={currentKey++} className="text-gray-300 mb-4 font-semibold">
            {line.substring(2, line.length - 2)}
          </p>
        );
      } else if (line.match(/^\d+\./)) {
        elements.push(
          <p key={currentKey++} className="text-gray-300 mb-3 ml-4">
            {line}
          </p>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={currentKey++} className="mb-2" />);
      } else if (line === '以上' || line === 'End') {
        elements.push(
          <p key={currentKey++} className="text-center text-gray-400 mt-8 font-medium">
            {line}
          </p>
        );
      } else {
        elements.push(
          <p key={currentKey++} className="text-gray-300 mb-4 leading-relaxed">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <>
      <Helmet>
        <title>{t('common.termsOfService')} | BeatNexus</title>
      </Helmet>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            戻る
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full p-6">
                <FileText className="w-12 h-12 text-cyan-400" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('common.termsOfService')}
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              BeatNexusサービスの利用に関する規約をご確認ください
            </p>
          </div>

          {/* Language Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 border border-gray-700/50">
              <button
                onClick={() => setActiveTab('ja')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'ja'
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                日本語
              </button>
              <button
                onClick={() => setActiveTab('en')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'en'
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Terms Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 md:p-12">
              <div className="prose prose-invert max-w-none">
                {activeTab === 'ja' ? renderMarkdown(japaneseTerms) : renderMarkdown(englishTerms)}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 rounded-2xl p-8 border border-cyan-500/30">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center gap-2">
                  <Mail className="h-5 w-5 text-cyan-400" />
                  お問い合わせ
                </h3>
                <p className="text-gray-300 mb-4">
                  利用規約に関するご質問やお問い合わせは、下記までご連絡ください。
                </p>
                <a 
                  href="mailto:beatnexus.app@gmail.com"
                  className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  <Mail className="h-4 w-4" />
                  beatnexus.app@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          <div className="text-center mt-8 text-gray-400 text-sm flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            最終更新日: 2025年7月18日
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage; 