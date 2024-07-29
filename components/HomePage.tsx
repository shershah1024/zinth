"use client"

import React from 'react';
import { Upload, Clock, FileText, Share2, ArrowRight, LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon }) => (
  <div className="bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-700 transition duration-300 transform hover:-translate-y-1 hover:scale-105">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-teal-500 rounded-full p-3">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-teal-400">{title}</h3>
    </div>
    <p className="text-gray-300 mb-4">{description}</p>
    <a href="#" className="text-teal-400 hover:text-teal-300 inline-flex items-center">
      Learn more <ArrowRight className="ml-2 h-4 w-4" />
    </a>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-16 max-w-4xl">
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600">Medlytics</span>
        </h1>
        <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto">
          Empowering healthcare through advanced data analytics. Experience the future of personalized medical management.
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:-translate-y-1">
            Get Started
          </button>
          <button className="bg-transparent hover:bg-gray-800 text-teal-400 font-semibold hover:text-white py-3 px-6 border border-teal-400 hover:border-transparent rounded-full transition duration-300 transform hover:-translate-y-1">
            Learn More
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl">
        <FeatureCard
          title="Prescription Reminders"
          description="Never miss a dose with our smart reminder system. Upload your prescription and receive timely alerts."
          icon={Upload}
        />
        <FeatureCard
          title="Medication History"
          description="Access your complete medication history, including dosage, frequency, and duration, all in one place."
          icon={Clock}
        />
        <FeatureCard
          title="Test Report Analytics"
          description="Visualize and track your health metrics over time with our advanced analytics dashboard."
          icon={FileText}
        />
        <FeatureCard
          title="Secure Sharing"
          description="Share your medical data securely with healthcare providers or family members with just a few clicks."
          icon={Share2}
        />
      </div>
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to take control of your health?</h2>
        <p className="text-xl text-gray-300 mb-8">Join thousands of users who have transformed their healthcare experience with Medlytics.</p>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:-translate-y-1 hover:scale-105">
          Sign Up Now
        </button>
      </div>
    </div>
  );
};

export default HomePage;