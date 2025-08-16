import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
  <title>{t('contactPage.title')} | BeatNexus</title>
  <meta name="description" content={t('contactPage.metaDescription')} />
      </Helmet>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >{t('contactPage.back')}</Button>
          <div className="text-center mb-10">
            <div className="inline-flex p-6 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-6">
              <Mail className="h-12 w-12 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('contactPage.title')}</h1>
            <p className="text-gray-300 leading-relaxed">{t('contactPage.intro')}</p>
          </div>

          <div className="space-y-8">
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-cyan-400"/>{t('contactPage.emailSection.title')}</h2>
              <p className="text-gray-300 mb-3">{t('contactPage.emailSection.desc')}</p>
              <a href="mailto:beatnexus.app@gmail.com" className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 transition-colors text-white font-semibold px-6 py-3 rounded-lg">
                <Mail className="h-4 w-4"/>beatnexus.app@gmail.com
              </a>
            </section>
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-purple-400"/>{t('contactPage.rightsSection.title')}</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{t('contactPage.rightsSection.desc')}</p>
            </section>
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">{t('contactPage.privacySection.title')}</h2>
              <p className="text-gray-300 text-sm">{t('contactPage.privacySection.desc')}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
