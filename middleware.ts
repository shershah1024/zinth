import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Allow access to public routes
  const publicPaths = ['/', '/sign-up', '/api/auth/session']
  if (publicPaths.some(path => request.nextUrl.pathname === path)) {
    return NextResponse.next()
  }

  // Allow access to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For all other routes, check for authentication
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      const signUpUrl = new URL('/sign-up', request.url)
      signUpUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(signUpUrl)
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Error in middleware:', error)
    // In case of an error, redirect to an error page
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}