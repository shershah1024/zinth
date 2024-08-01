import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  

  // Allow access to public routes
  const publicPaths = ['/', '/sign-up', '/api/auth/session']
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    
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
    // In case of an error, allow the request to proceed
    // This prevents the middleware from blocking requests due to unexpected errors
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

//update .env