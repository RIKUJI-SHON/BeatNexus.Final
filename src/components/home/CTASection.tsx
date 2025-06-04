import React, { useState } from 'react';
import { Video, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthModal } from '../auth/AuthModal';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: () => {},
  });

  const handleStartBattle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (requireAuth(() => navigate('/post'))) {
      navigate('/post');
    }
  };

  return (
    <section className="py-16 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Showcase Your Beatboxing Skills?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of beatboxers from around the world. Create battles, receive feedback, and improve your skills.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              variant="primary" 
              size="lg"
              className="bg-white text-blue-900 hover:bg-blue-50"
              leftIcon={<Video className="h-5 w-5" />}
              onClick={handleStartBattle}
            >
              Start Your First Battle
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white/10"
              leftIcon={<Star className="h-5 w-5" />}
              onClick={() => navigate('/battles')}
            >
              Explore Top Battles
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="signup"
      />
    </section>
  );
};