"use client"

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, Bell, CheckSquare, LineChart, MessageSquare, ArrowRight, Smartphone } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon }) => (
  <motion.div 
    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 flex flex-col"
    whileHover={{ y: -5 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full p-3">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600 flex-grow">{description}</p>
  </motion.div>
);

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row items-center mb-16 gap-12">
          <motion.div 
            className="lg:w-1/2"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Zinth: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">The Simplest Way to Track Your Health</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Manage your health effortlessly with Zinth&apos;s user-friendly platform. Track medications, get reminders, and update records - all in one place.
            </p>
            <Link href="/dashboard">
              <motion.button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-full transition duration-300 flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Now <ArrowRight className="ml-2" />
              </motion.button>
            </Link>
          </motion.div>
          <motion.div 
            className="lg:w-1/2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img src="https://iceqxnyfvdajcrhyfvtt.supabase.co/storage/v1/object/public/site_images/health_records.png?t=2024-07-31T18%3A26%3A46.601Z" alt="Zinth Dashboard" className="rounded-xl shadow-2xl" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            title="Easy Access"
            description="Manage your health through our app or WhatsApp - choose what works best for you."
            icon={Smartphone}
          />
          <FeatureCard
            title="Smart Reminders"
            description="Receive timely medication reminders, fitting seamlessly into your daily routine."
            icon={Bell}
          />
          <FeatureCard
            title="Quick Updates"
            description="Mark medications as taken or add new health records with just a few taps."
            icon={CheckSquare}
          />
          <FeatureCard
            title="Centralized Records"
            description="Access all your health information in one secure, convenient place."
            icon={ClipboardList}
          />
          <FeatureCard
            title="Health Insights"
            description="View easy-to-understand charts of your health records and test results over time."
            icon={LineChart}
          />
          <FeatureCard
            title="Complete History"
            description="Keep a full record of your medications and health data, accessible anytime."
            icon={ClipboardList}
          />
        </div>

        <motion.div 
          className="text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-10 rounded-xl shadow-lg max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold mb-3">Ready to Simplify Your Health Management?</h2>
          <p className="text-lg mb-5 max-w-xl mx-auto">Join Zinth today and experience how easy health tracking can be.</p>
          <Link href="/dashboard">
            <motion.button 
              className="bg-white text-purple-600 font-bold py-2 px-6 rounded-full text-sm transition duration-300 flex items-center mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Your Zinth Journey <ArrowRight className="ml-2 h-4 w-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;