import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, Trophy, Users, Settings } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import { Card } from '../components/ui/Card';

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
    {
      category: t('faq.categories.battles'),
      question: t('faq.items.battleFormat.question'),
      answer: t('faq.items.battleFormat.answer')
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
    <div className="min-h-screen bg-slate-950 py-6 sm:py-10">
      <div className="container-ultra-wide">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative">
            {/* 背景のグラデーション効果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-3xl transform -translate-y-4"></div>
            
            <div className="relative animate-fade-in">
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="bg-cyan-500/20 rounded-full p-6 border border-cyan-500/30">
                  <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400" />
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
                {t('faq.title')}
              </h1>
              
              <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {t('faq.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card 
                key={index} 
                className="bg-slate-800 border border-slate-700 p-4 sm:p-6 text-center hover:bg-slate-700/50 transition-all duration-300 hover-lift group"
              >
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 ${category.color} group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="text-slate-50 font-semibold text-sm sm:text-base">
                  {category.name}
                </h3>
              </Card>
            );
          })}
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => {
              const isExpanded = expandedItems.includes(index);
              const Icon = getCategoryIcon(faq.category);
              
              return (
                <Card
                  key={index}
                  className="bg-slate-800 border border-slate-700 overflow-hidden transition-all duration-300 hover:bg-slate-700/50 hover-lift"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${getCategoryColor(faq.category)} flex-shrink-0`} />
                      <span className="text-slate-50 font-medium text-base sm:text-lg">
                        {faq.question}
                      </span>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400 transition-transform duration-300" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-300" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 animate-fade-in">
                      <div className="pl-8 sm:pl-10 text-slate-300 leading-relaxed text-sm sm:text-base">
                        {faq.answer}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800 border border-slate-700 p-8 sm:p-12 text-center hover-lift">
            <div className="relative">
              {/* 背景のグラデーション効果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl"></div>
              
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-4">
                  {t('faq.stillNeedHelp.title')}
                </h2>
                <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                  {t('faq.stillNeedHelp.description')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    onClick={() => window.location.href = 'mailto:beatnexus.app@gmail.com'}
                  >
                    {t('faq.stillNeedHelp.contactSupport')}
                  </button>
                  
                  <button 
                    className="bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-slate-50 font-bold py-4 px-8 rounded-xl transition-all duration-300 hover-lift"
                    onClick={() => setOnboardingModalOpen(true)}
                  >
                    {t('faq.stillNeedHelp.readGuide')}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FAQPage; 