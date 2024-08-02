'use client'

import React, { useState } from 'react';
import { signIn } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button"
import { ClipboardList, Bell, CheckSquare, LineChart, MessageSquare, ArrowRight } from 'lucide-react';

interface SignUpContentProps {
  callbackUrl: string
}

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

export default function SignUpContent({ callbackUrl }: SignUpContentProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleContinueWithGoogle = async () => {
    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: callbackUrl,
      })

      if (result?.error) {
        console.error('Error during authentication:', result.error)
        setError('An error occurred during sign in. Please try again.')
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error('Error during authentication:', error)
      setError('An unexpected error occurred. Please try again later.')
    }
  }

  const features = [
    { 
      icon: ClipboardList, 
      title: "Smart Upload", 
      description: "Easily upload and manage all your health records and prescriptions in one secure location."
    },
    { 
      icon: Bell, 
      title: "Timely Reminders", 
      description: "Get medication reminders via WhatsApp for seamless integration with your daily life."
    },
    { 
      icon: CheckSquare, 
      title: "Medication Tracking", 
      description: "Mark medications as taken through our app or WhatsApp for convenient adherence tracking."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Feature Section */}
          <div className="md:w-3/5 p-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <h1 className="text-3xl font-bold mb-6">Synthesize Your Health Journey with Zinth</h1>
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 mt-1">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-purple-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Up Section */}
          <div className="md:w-2/5 p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Get Started with Zinth</h2>
            <motion.button 
              onClick={handleContinueWithGoogle}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowRight className="w-5 h-5" />
              <span>Sign up with Google</span>
            </motion.button>
            {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
            <p className="mt-6 text-sm text-center text-gray-600">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}