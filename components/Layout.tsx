"use client"

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Menu, X, Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`flex flex-col min-h-screen bg-background text-foreground ${isDarkMode ? 'dark' : ''}`}>
      <header className="bg-card shadow-lg sticky top-0 z-50">
        <div className="container">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-primary hover:text-primary-foreground transition duration-300">
              Medlytics
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link href="/" className="text-muted-foreground hover:text-primary transition duration-300">Home</Link>
              <Link href="/upload-prescription" className="text-muted-foreground hover:text-primary transition duration-300">Upload Prescription</Link>
              <Link href="/upload-test" className="text-muted-foreground hover:text-primary transition duration-300">Upload Test</Link>
              <Link href="/test-reports" className="text-muted-foreground hover:text-primary transition duration-300">Test Reports</Link>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors duration-200"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow container py-8">
        {children}
      </main>
      <footer className="bg-card text-card-foreground py-6">
        <div className="container text-center">
          <p>&copy; 2024 Medlytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;