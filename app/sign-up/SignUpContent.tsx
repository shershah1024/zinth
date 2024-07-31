'use client'

import React, { useState } from 'react';
import { signIn } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Globe, CheckSquare, Clock, LogIn } from 'lucide-react';

interface SignUpContentProps {
  callbackUrl: string
}

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
      icon: Globe, 
      title: "100+ Languages", 
      description: "Create quizzes in over 100 languages, reaching students globally."
    },
    { 
      icon: CheckSquare, 
      title: "AI Evaluation", 
      description: "Let Luna grade quizzes and essays, saving hours on evaluation."
    },
    { 
      icon: Clock, 
      title: "Save 500 Hours Yearly", 
      description: "Reclaim 10 hours weekly for what matters most - inspiring students."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Feature Section */}
          <div className="md:w-3/5 p-8 bg-indigo-600 text-white">
            <h1 className="text-3xl font-bold mb-6">Transform Your Teaching with Luna AI</h1>
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-indigo-500 rounded-full p-2 mt-1">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-indigo-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Up Section */}
          <div className="md:w-2/5 p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Get Started Now</h2>
            <Button 
              onClick={handleContinueWithGoogle}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Sign up with Google</span>
            </Button>
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