import { useEffect } from 'react';
import { initializeGA } from '../../utils/analytics';
import { useConsentStore } from '../../store/consentStore';

let gaInitialized = false;

export const AnalyticsConsentGate = () => {
  const analytics = useConsentStore(s => s.preferences.analytics);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Consent][Debug] Analytics consent changed:', analytics);
    }
    if (analytics && !gaInitialized) {
      if (import.meta.env.DEV) {
        console.log('[Consent][Debug] Initializing GA (development mode stub expected)');
      }
      initializeGA();
      gaInitialized = true;
    }
  }, [analytics]);

  return null;
};

export default AnalyticsConsentGate;
