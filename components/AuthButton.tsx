// components/AuthButton.tsx
'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { useState } from 'react'

export default function AuthButton() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: false
      })
      if (result?.error) {
        console.error("Sign-in error:", result.error)
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error("Sign-in exception:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({ callbackUrl: '/' })
    setIsLoading(false)
  }

  if (status === "loading" || isLoading) {
    return <Button disabled>Loading...</Button>
  }

  if (session) {
    return (
      <Button 
        onClick={handleSignOut} 
        variant="destructive"
        disabled={isLoading}
      >
        Sign Out
      </Button>
    )
  }

  return (
    <Button 
      onClick={handleSignIn} 
      variant="default"
      disabled={isLoading}
    >
      Sign In with Google
    </Button>
  )
}