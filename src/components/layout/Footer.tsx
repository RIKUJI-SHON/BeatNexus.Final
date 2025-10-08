import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Facebook, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useConsentStore } from '../../store/consentStore';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { openManager } = useConsentStore();
  const { setOnboardingModalOpen } = useOnboardingStore();
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="container-ultra-wide">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/images/ICON.png" alt="BeatNexus" className="h-8 w-8" />
              <span className="font-bold text-xl tracking-tight">BeatNexus</span>
            </div>
            <p className="text-gray-400 mb-4">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com/beatnexus_beatbox_global/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="https://x.com/Beatboxnexus" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="https://www.youtube.com/@BeatNexus_global" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" aria-hidden="true" />
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
                href="mailto:beatnexus.app@gmail.com"
                className="flex items-center text-gray-400 hover:text-white transition-colors"
                aria-label={t('footer.emailContact')}
              >
                <Mail className="h-5 w-5 mr-2" aria-hidden="true" />
                beatnexus.app@gmail.com
              </a>
              <p className="text-gray-400">
                {t('footer.contactMessage')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} BeatNexus. {t('footer.allRightsReserved')}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 items-center">
            <Link to="/terms" className="text-gray-400 hover:text-white text-sm">
              {t('footer.termsOfService')}
            </Link>
            <Link to="/privacy" className="text-gray-400 hover:text-white text-sm">
              {t('footer.privacyPolicy')}
            </Link>
            <Link to="/legal/tokushoho" className="text-gray-400 hover:text-white text-sm">
              特定商取引法に基づく表記
            </Link>
            <button onClick={() => openManager()} className="text-gray-400 hover:text-white text-sm underline underline-offset-2">
              {t('footer.cookieSettings', 'Cookie設定')}
            </button>
            <Link to="/guidelines" className="text-gray-400 hover:text-white text-sm">
              Guidelines
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-white text-sm">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};