"use client"

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Menu, X, Activity } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: 'Upload Health Records', href: '/upload-test' },
    { name: 'Upload Prescription', href: '/upload-prescription' },
    { name: 'View Health Records', href: '/test-reports' },
    { name: 'View Prescriptions', href: '/prescriptions' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50">
      <header className="bg-white shadow-lg sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-80 transition duration-300 flex items-center">
              <Activity className="mr-2 text-purple-600" />
              Zinth
            </Link>
            <nav className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-600 hover:text-purple-600 transition duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="flex items-center">
              <button
                className="md:hidden p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden">
            <nav className="px-4 pt-2 pb-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-purple-600 hover:bg-gray-100 transition duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-6">
        <p>&copy; 2024 Zinth. Synthesizing your health data for better living.</p>
      </footer>
    </div>
  );
};

export default Layout;