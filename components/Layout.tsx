import React from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { Activity } from 'lucide-react';
import { Button } from "@/components/ui/button"

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50">
      <header className="bg-white shadow-lg sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-80 transition duration-300 flex items-center">
              <Activity className="mr-2 text-purple-600" />
              Zinth
            </Link>
            <nav className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                className="bg-gray-800 text-white border-gray-800 hover:bg-gray-700"
                asChild
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              {status !== "authenticated" && (
                <Button 
                  variant="outline" 
                  className="bg-gray-800 text-white border-gray-800 hover:bg-gray-700"
                  asChild
                >
                  <Link href="/sign-up">Sign Up / Sign In</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-6">
        <p>&copy; 2024 Zinth. The easiest peasiest way to track your health</p>
      </footer>
    </div>
  );
};

export default Layout;