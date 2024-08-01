//app/sign-up/page.tsx

import React, { Suspense } from 'react'
import SignUpContent from './SignUpContent'
import { headers } from 'next/headers'

export default function SignUpPage() {
  const headersList = headers()
  const referer = headersList.get('referer') || '/dashboard'

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpContent callbackUrl="/dashboard" />
    </Suspense>
  )
}