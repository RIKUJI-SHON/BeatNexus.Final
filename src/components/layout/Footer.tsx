import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Instagram, Twitter, Youtube, Facebook, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/onboardingStore';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { setOnboardingModalOpen } = useOnboardingStore();
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Mic className="h-8 w-8 text-blue-400" />
              <span className="font-bold text-xl tracking-tight">BeatNexus</span>
            </div>
            <p className="text-gray-400 mb-4">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="col-span-1">
            <h3 className="font-semibold text-lg mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                  {t('common.home')}
                </Link>
              </li>
              <li>
                <Link to="/battles" className="text-gray-400 hover:text-white transition-colors">
                  {t('common.battles')}
                </Link>
              </li>
              <li>
                <Link to="/ranking" className="text-gray-400 hover:text-white transition-colors">
                  {t('common.ranking')}
                </Link>
              </li>
              <li>
                <Link to="/tournament" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.tournaments')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="col-span-1">
            <h3 className="font-semibold text-lg mb-4">{t('footer.resources')}</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setOnboardingModalOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('footer.tutorials')}
                </button>
              </li>
              <li>
                <Link to="/forum" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.communityForum')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h3 className="font-semibold text-lg mb-4">{t('footer.contactUs')}</h3>
            <div className="space-y-3">
              <a 
                href="mailto:info@beatnexus.com"
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="h-5 w-5 mr-2" />
                info@beatnexus.com
              </a>
              <p className="text-gray-400">
                {t('footer.contactMessage')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BeatNexus. {t('footer.allRightsReserved')}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/terms" className="text-gray-500 hover:text-white text-sm">
              {t('footer.termsOfService')}
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-white text-sm">
              {t('footer.privacyPolicy')}
            </Link>
            <Link to="/cookies" className="text-gray-500 hover:text-white text-sm">
              {t('footer.cookiePolicy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};