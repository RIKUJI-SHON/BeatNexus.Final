import React from 'react';

export const SpaceBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gray-950">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
                           radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
                           radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
                           radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
                           radial-gradient(2px 2px at 130px 80px, #fff, rgba(0,0,0,0)),
                           radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0))`,
          backgroundSize: '200px 200px',
          animation: 'twinkle 4s ease-in-out infinite alternate'
        }} />
        
        {/* Nebula Effects */}
        <div className="absolute inset-0 opacity-30 mix-blend-screen">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
        </div>
        
        {/* Moving Stars */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="shooting-stars" />
        </div>
      </div>
    </div>
  );
};