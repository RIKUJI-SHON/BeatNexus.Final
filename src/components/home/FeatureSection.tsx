import React from 'react';
import { Video, Award, Users, BookOpen } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition duration-300 hover:shadow-lg hover:translate-y-[-5px]">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export const FeatureSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How BeatNexus Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your next step into the beatboxing world. Create battles, get feedback, improve your skills.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Video className="h-6 w-6" />}
            title="Upload & Battle"
            description="Upload your best beatbox content and get matched with battlers of similar skill level."
          />
          
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Get Community Feedback"
            description="Receive votes and comments from the community to understand your strengths and areas for improvement."
          />
          
          <FeatureCard
            icon={<Award className="h-6 w-6" />}
            title="Build Your Profile"
            description="Climb the ranks, earn badges, and build your reputation in the beatboxing community."
          />
          
          <FeatureCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Learn & Grow"
            description="Access tutorials, techniques, and tips shared by the community to improve your skills."
          />
        </div>
      </div>
    </section>
  );
};