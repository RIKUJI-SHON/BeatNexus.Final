import React from 'react';
import { Mic, Video, Trophy, BarChart2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export const HeroBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
              Next Level <span className="text-blue-300">Beatboxing</span> Community
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-lg">
              Battle, learn, and grow with the world's most vibrant beatboxing platform. Join battles, get votes, climb the ranks!
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="primary" 
                size="lg"
                leftIcon={<Video className="h-5 w-5" />}
                onClick={() => navigate('/battles')}
                className="bg-white text-blue-900 hover:bg-blue-50"
              >
                Start a Battle
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10"
                onClick={() => navigate('/battles')}
              >
                Learn More
              </Button>
            </div>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-lg">
              {/* Animated circles in the background */}
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
              
              {/* Main image - using a stylized illustration */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
                  <div className="flex space-x-4 mb-6">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="rounded-lg overflow-hidden mb-4 aspect-video bg-black/30">
                    {/* Placeholder for video thumbnail */}
                    <div className="w-full h-full flex items-center justify-center">
                      <Mic className="h-16 w-16 text-white/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col items-center">
                      <Video className="h-8 w-8 text-blue-300 mb-2" />
                      <span className="text-white text-sm">Post Battles</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col items-center">
                      <BarChart2 className="h-8 w-8 text-purple-300 mb-2" />
                      <span className="text-white text-sm">Get Votes</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col items-center">
                      <Trophy className="h-8 w-8 text-yellow-300 mb-2" />
                      <span className="text-white text-sm">Win Tournaments</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col items-center">
                      <Mic className="h-8 w-8 text-green-300 mb-2" />
                      <span className="text-white text-sm">Improve Skills</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" fill="#ffffff">
          <path d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,53.3C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64L1440,100L1380,100C1320,100,1200,100,1080,100C960,100,840,100,720,100C600,100,480,100,360,100C240,100,120,100,60,100L0,100Z"></path>
        </svg>
      </div>
    </div>
  );
};