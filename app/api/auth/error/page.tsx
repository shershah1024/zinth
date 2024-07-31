// app/auth/error/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

export default function AuthError() {
  const router = useRouter()

  useEffect(() => {
    // You can add logging here to capture the error details
    console.error('Authentication error occurred')
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-4">We&apos;re sorry, but there was an error during the authentication process.</p>
      <Button onClick={() => router.push('/')}>
        Return to Home
      </Button>
    </div>
  )
}