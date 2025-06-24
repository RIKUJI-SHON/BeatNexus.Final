import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, Video, Trophy, Users, Settings } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQPage: React.FC = () => {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const { setOnboardingModalOpen } = useOnboardingStore();

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const categories = [
    {
      name: t('faq.categories.gettingStarted'),
      icon: Users,
      color: 'text-blue-500'
    },
    {
      name: t('faq.categories.battles'),
      icon: Trophy,
      color: 'text-green-500'
    },
    {
      name: t('faq.categories.technical'),
      icon: Settings,
      color: 'text-purple-500'
    },
    {
      name: t('faq.categories.community'),
      icon: MessageCircle,
      color: 'text-orange-500'
    }
  ];

  const faqs: FAQItem[] = [
    // Getting Started
    {
      category: t('faq.categories.gettingStarted'),
      question: t('faq.items.howToStart.question'),
      answer: t('faq.items.howToStart.answer')
    },
    {
      category: t('faq.categories.gettingStarted'),
      question: t('faq.items.isFree.question'),
      answer: t('faq.items.isFree.answer')
    },
    {
      category: t('faq.categories.gettingStarted'),
      question: t('faq.items.beginnerFriendly.question'),
      answer: t('faq.items.beginnerFriendly.answer')
    },

    // Battles
    {
      category: t('faq.categories.battles'),
      question: t('faq.items.battleTypes.question'),
      answer: t('faq.items.battleTypes.answer')
    },
    {
      category: t('faq.categories.battles'),
      question: t('faq.items.votingPeriod.question'),
      answer: t('faq.items.votingPeriod.answer')
    },
    {
      category: t('faq.categories.battles'),
      question: t('faq.items.matching.question'),
      answer: t('faq.items.matching.answer')
    },
    {
      category: t('faq.categories.battles'),
      question: t('faq.items.showFace.question'),
      answer: t('faq.items.showFace.answer')
    },

    // Technical
    {
      category: t('faq.categories.technical'),
      question: t('faq.items.videoFormats.question'),
      answer: t('faq.items.videoFormats.answer')
    },
    {
      category: t('faq.categories.technical'),
      question: t('faq.items.uploadFailed.question'),
      answer: t('faq.items.uploadFailed.answer')
    },
    {
      category: t('faq.categories.technical'),
      question: t('faq.items.mobile.question'),
      answer: t('faq.items.mobile.answer')
    },

    // Community
    {
      category: t('faq.categories.community'),
      question: t('faq.items.ranking.question'),
      answer: t('faq.items.ranking.answer')
    },
    {
      category: t('faq.categories.community'),
      question: t('faq.items.prohibited.question'),
      answer: t('faq.items.prohibited.answer')
    }
  ];

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return HelpCircle;
    return category.icon;
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-500/20 rounded-full p-6">
              <HelpCircle className="w-16 h-16 text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {t('faq.title')}
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('faq.subtitle')}
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
                <Icon className={`w-8 h-8 mx-auto mb-3 ${category.color}`} />
                <h3 className="text-white font-semibold text-sm">
                  {category.name}
                </h3>
              </div>
            );
          })}
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isExpanded = expandedItems.includes(index);
              const Icon = getCategoryIcon(faq.category);
              
              return (
                <div 
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden transition-all duration-300 hover:bg-white/15"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                  >
                    <div className="flex items-center space-x-4">
                      <Icon className={`w-5 h-5 ${getCategoryColor(faq.category)}`} />
                      <span className="text-white font-medium text-lg">
                        {faq.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="pl-9 text-gray-300 leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl p-12 border border-blue-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('faq.stillNeedHelp.title')}
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              {t('faq.stillNeedHelp.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                onClick={() => window.location.href = 'mailto:beatnexus.app@gmail.com'}
              >
                {t('faq.stillNeedHelp.contactSupport')}
              </button>
              
              <button 
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 backdrop-blur-sm"
                onClick={() => setOnboardingModalOpen(true)}
              >
                {t('faq.stillNeedHelp.readGuide')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage; 