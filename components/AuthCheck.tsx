'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("AuthCheck: User is not authenticated, redirecting to sign-up")
      router.push("/sign-up")
    }
  }, [status, router])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    console.log("AuthCheck: No session, rendering null")
    return null
  }

  console.log("AuthCheck: User is authenticated, rendering children")
  return <>{children}</>
}