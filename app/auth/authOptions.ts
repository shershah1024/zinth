import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token
        token.id = profile.email
        token.name = profile.name
        token.email = profile.email
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string | undefined
        session.user.email = token.email as string | undefined
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If the url is already absolute, return it as-is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // If it's a relative url, prepend the baseUrl
      if (url.startsWith('/')) {
        return new URL(url, baseUrl).toString();
      }
      // If it doesn't match any of these, just return the baseUrl
      return baseUrl;
    },
  },
  pages: {
    signIn: '/sign-up',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}