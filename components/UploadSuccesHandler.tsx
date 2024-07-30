// UploadSuccessHandler.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UploadSuccessHandler() {
  const router = useRouter()

  useEffect(() => {
    const handleUploadSuccess = () => {
      router.push('/prescriptions')
    }

    window.addEventListener('uploadSuccess', handleUploadSuccess)

    return () => {
      window.removeEventListener('uploadSuccess', handleUploadSuccess)
    }
  }, [router])

  return null
}