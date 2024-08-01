"use client"

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, Bell, CheckSquare, LineChart, MessageSquare, ArrowRight } from 'lucide-react';

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
              Synthesize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Health Journey</span> with Zinth
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Effortlessly manage prescriptions, track medications, and visualize your health records - all in one intuitive platform.
            </p>
            <Link href="/upload-test">
              <motion.button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-full transition duration-300 flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started <ArrowRight className="ml-2" />
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
            title="Smart Upload"
            description="Easily upload and manage all your health records and prescriptions in one secure location."
            icon={ClipboardList}
          />
          <FeatureCard
            title="Timely Reminders"
            description="Get medication reminders via WhatsApp for seamless integration with your daily life."
            icon={Bell}
          />
          <FeatureCard
            title="Medication Tracking"
            description="Mark medications as taken through our app or WhatsApp for convenient adherence tracking."
            icon={CheckSquare}
          />
          <FeatureCard
            title="Health Insights"
            description="View clear, trend-based visualizations of your health records and test results over time."
            icon={LineChart}
          />
          <FeatureCard
            title="WhatsApp Integration"
            description="Add health records and prescriptions effortlessly by sending a message on WhatsApp."
            icon={MessageSquare}
          />
          <FeatureCard
            title="Comprehensive History"
            description="Access a complete history of your current and past medications, including detailed dosage information."
            icon={ClipboardList}
          />
        </div>

        <motion.div 
          className="text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-10 rounded-xl shadow-lg max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold mb-3">Ready to Synthesize Your Health Data?</h2>
          <p className="text-lg mb-5 max-w-xl mx-auto">Join Zinth today and experience a smarter way to manage your health information.</p>
          <Link href="/upload-test">
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