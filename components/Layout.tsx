"use client"

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Menu, X, Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Set to true for default dark mode

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isDarkMode ? 'dark' : ''}`}>
      <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-teal-400 hover:text-teal-300 transition duration-300">
              Medlytics
            </Link>
            <nav className="hidden md:flex space-x-6">
              {['Home', 'Upload Prescription', 'Upload Test', 'Test Reports'].map((item) => (
                <Link
                  key={item}
                  href={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`}
                  className="text-gray-300 hover:text-teal-400 transition duration-300"
                >
                  {item}
                </Link>
              ))}
            </nav>
            <div className="flex items-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors duration-200 mr-4"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                className="md:hidden p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600"
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
              {['Home', 'Upload Prescription', 'Upload Test', 'Test Reports'].map((item) => (
                <Link
                  key={item}
                  href={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition duration-300"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
      <footer className="bg-gray-800 text-gray-300 text-center py-6">
        <p>&copy; 2024 Medlytics. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;