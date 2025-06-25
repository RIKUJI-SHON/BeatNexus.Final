import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from '../store/toastStore';
import { ChevronDown, Check, Eye, EyeOff, Save } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PushNotificationSetup } from '../components/ui/PushNotificationSetup';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackBeatNexusEvents } from '../utils/analytics';
import { validateLanguageCode } from '../lib/utils';

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [originalLanguage, setOriginalLanguage] = useState<string>(i18n.language);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchProfileLanguage = async () => {
      console.log('Settings: fetchProfileLanguage started, user:', user?.id);
      
      // タイムアウト設定（10秒）
      const timeoutId = setTimeout(() => {
        console.warn('Settings: Fetch timeout, setting loading to false');
        setIsLoading(false);
        
        const fallbackLang = i18n.language || 'en';
        setSelectedLanguage(fallbackLang);
        setOriginalLanguage(fallbackLang);
        
        toast.error(t('settingsPage.toasts.errorTitle'), '設定の読み込みがタイムアウトしました。');
      }, 10000);
      
      try {
        if (user) {
          setIsLoading(true);
          console.log('Settings: Fetching language for user:', user.id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', user.id)
            .single();

          console.log('Settings: Query result:', { data, error });

          if (error && error.code !== 'PGRST116') {
            console.error('Settings: Database error:', error);
            throw error;
          }

          let currentLang = i18n.language || 'en';
          if (data && data.language) {
            // データベースの言語値を検証
            currentLang = validateLanguageCode(data.language);
            console.log('Settings: Using language from DB:', data.language, '-> validated to:', currentLang);
          } else {
            console.log('Settings: No language in DB, using i18n language:', currentLang);
          }
          
          setSelectedLanguage(currentLang);
          setOriginalLanguage(currentLang);
          
          // i18nの言語が現在の設定と異なる場合のみ変更
          if (i18n.language !== currentLang) {
            i18n.changeLanguage(currentLang);
          }
          console.log('Settings: Language setup complete');
        } else {
          console.log('Settings: No user found, setting loading to false');
          
          // ユーザーがいない場合はデフォルト値を設定
          const fallbackLang = i18n.language || 'en';
          setSelectedLanguage(fallbackLang);
          setOriginalLanguage(fallbackLang);
        }
      } catch (error: any) {
        console.error('Settings: Error in fetchProfileLanguage:', error);
        toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.loadLanguageError'));
        
        // エラー時はデフォルト値を設定
        const fallbackLang = i18n.language || 'en';
        setSelectedLanguage(fallbackLang);
        setOriginalLanguage(fallbackLang);
      } finally {
        clearTimeout(timeoutId);
        console.log('Settings: Setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchProfileLanguage();
  }, [user?.id]); // 依存配列をuser?.idのみに変更

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setIsDropdownOpen(false);
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.mustBeLoggedIn'));
      return;
    }

    if (selectedLanguage === originalLanguage) {
      toast.info(t('settingsPage.toasts.successTitle'), t('settingsPage.toasts.noChanges'));
      return;
    }

    try {
      setIsSaving(true);

      console.log('Settings: Saving language:', selectedLanguage, '-> DB format:', selectedLanguage);

      // データベースに言語設定を保存（言語コードをそのまま保存）
      const { error } = await supabase
        .from('profiles')
        .update({ language: selectedLanguage })
        .eq('id', user.id);

      if (error) {
        console.error('Settings: Save error:', error);
        throw error;
      }

      // i18nの言語を変更
      i18n.changeLanguage(selectedLanguage);
      setOriginalLanguage(selectedLanguage);

      // Track language change event
      trackBeatNexusEvents.languageChange(selectedLanguage);

      const displayLanguage = selectedLanguage === 'ja' ? t('settingsPage.language.japanese') : t('settingsPage.language.english');
      toast.success(t('settingsPage.toasts.successTitle'), t('settingsPage.toasts.languageUpdateSuccess', { language: displayLanguage }));
      console.log('Settings: Language saved successfully');
    } catch (error: any) {
      console.error('Settings: Error updating settings:', error);
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.languageUpdateError'));
      // エラー時は元の言語に戻す
      setSelectedLanguage(originalLanguage);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = selectedLanguage !== originalLanguage;

  const handlePasswordChangeRequest = () => {
    setIsPasswordModalOpen(true);
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.passwordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.passwordTooShort'));
      return;
    }

    if (!user) {
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.mustBeLoggedInPassword'));
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('settingsPage.toasts.successTitle'), t('settingsPage.toasts.passwordUpdateSuccess'));
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(t('settingsPage.toasts.errorTitle'), error.message || t('settingsPage.toasts.passwordUpdateFailed'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccountRequest = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!user) {
      toast.error(t('settingsPage.toasts.errorTitle'), t('settingsPage.toasts.mustBeLoggedInDelete'));
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        // Edge Functionが自動的に認証ユーザーを取得するため、bodyは空でOK
      });

      if (error) throw error;

      toast.success(t('settingsPage.toasts.successTitle'), t('settingsPage.toasts.accountDeleteSuccess'));
      await signOut();
      navigate('/'); // Redirect to homepage
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(t('settingsPage.toasts.errorTitle'), error.message || t('settingsPage.toasts.accountDeleteFailed'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex justify-center items-center">
        <p>{t('settingsPage.loading')}</p> {/* Replace with a proper loader component if available */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-cyan-400">{t('settingsPage.title')}</h1>

        <div className="space-y-12">
          {/* Language Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">{t('settingsPage.preferences.title')}</h2>
            <div className="space-y-8">
              {/* Language Setting */}
              <div>
                <h3 className="text-lg font-medium text-gray-100">{t('settingsPage.language.title')}</h3>
                <p className="text-sm text-gray-400 mb-2">{t('settingsPage.language.description')}</p>
                <div className="relative inline-block text-left w-full sm:w-64" ref={dropdownRef}>
                  <div>
                    <button
                      type="button"
                      className="inline-flex justify-between w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-colors duration-150"
                      id="options-menu"
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      {selectedLanguage === 'en' ? t('settingsPage.language.english') : selectedLanguage === 'ja' ? t('settingsPage.language.japanese') : t('settingsPage.language.english')}
                      <ChevronDown className="-mr-1 ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-full rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-700 z-10">
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <a
                          href="#"
                          className={`flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-700 hover:text-white transition-colors duration-150 ${
                            selectedLanguage === 'en' ? 'text-cyan-400 font-semibold' : 'text-gray-300'
                          }`}
                          role="menuitem"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            handleLanguageSelect('en'); 
                          }}
                        >
                          {t('settingsPage.language.english')}
                          {selectedLanguage === 'en' && <Check className="h-5 w-5 text-cyan-400" />}
                        </a>
                        <a
                          href="#"
                          className={`flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-700 hover:text-white transition-colors duration-150 ${
                            selectedLanguage === 'ja' ? 'text-cyan-400 font-semibold' : 'text-gray-300'
                          }`}
                          role="menuitem"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            handleLanguageSelect('ja'); 
                          }}
                        >
                          {t('settingsPage.language.japanese')}
                          {selectedLanguage === 'ja' && <Check className="h-5 w-5 text-cyan-400" />}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Save Button */}
                <div className="mt-4">
                  <Button 
                    onClick={handleSaveSettings} 
                    variant="primary" 
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                    disabled={!hasChanges || isSaving}
                    isLoading={isSaving}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    {isSaving ? t('settingsPage.preferences.savingButton') : t('settingsPage.preferences.saveButton')}
                  </Button>
                  {hasChanges && (
                    <p className="text-sm text-cyan-400 mt-2">{t('settingsPage.preferences.unsavedChanges')}</p>
                  )}
                </div>
              </div>

              {/* Push Notification Setting */}
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-2">プッシュ通知</h3>
                <p className="text-sm text-gray-400 mb-4">バトルの更新やマッチング通知を受け取る設定を管理します。</p>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <PushNotificationSetup 
                    onSetupComplete={(isSubscribed) => {
                      if (isSubscribed) {
                        toast.success('設定完了', 'プッシュ通知が有効になりました')
                      } else {
                        toast.info('設定変更', 'プッシュ通知が無効になりました')
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">{t('settingsPage.accountManagement.title')}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-100">{t('settingsPage.changePassword.title')}</h3>
                <p className="text-sm text-gray-400 mb-2">{t('settingsPage.changePassword.description')}</p>
                <Button 
                  onClick={handlePasswordChangeRequest} 
                  variant="primary" 
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {t('settingsPage.changePassword.button')}
                </Button>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-500">{t('settingsPage.deleteAccount.title')}</h3>
                <p className="text-sm text-gray-400 mb-2">{t('settingsPage.deleteAccount.description')}</p>
                <Button 
                  onClick={handleDeleteAccountRequest} 
                  variant="danger"
                >
                  {t('settingsPage.deleteAccount.button')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title={t('settingsPage.passwordModal.title')}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">{t('settingsPage.passwordModal.newPassword')}</label>
            <div className="relative">
              <Input 
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="••••••••"
                className="bg-gray-800 border-gray-700 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">{t('settingsPage.passwordModal.confirmPassword')}</label>
            <div className="relative">
              <Input 
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                className="bg-gray-800 border-gray-700 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)} disabled={isUpdatingPassword}>{t('settingsPage.passwordModal.cancelButton')}</Button>
            <Button variant="primary" onClick={handlePasswordUpdate} isLoading={isUpdatingPassword} className="bg-cyan-600 hover:bg-cyan-700">
              {isUpdatingPassword ? t('settingsPage.passwordModal.updatingButton') : t('settingsPage.passwordModal.updateButton')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('settingsPage.deleteModal.title')} size="md">
        <p className="text-gray-300 mb-6">
          {t('settingsPage.deleteModal.confirmationMessage')}
        </p>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>{t('settingsPage.deleteModal.cancelButton')}</Button>
          <Button variant="danger" onClick={handleDeleteAccountConfirm} disabled={isDeletingAccount}>
            {isDeletingAccount ? t('settingsPage.deleteModal.deletingButton') : t('settingsPage.deleteModal.confirmButton')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage; 