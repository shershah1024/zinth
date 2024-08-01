import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const DynamicDashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Your Health Hub | Dashboard',
  description: 'Manage your health records, prescriptions, and medical imaging in one place.',
};

export default function DashboardPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-start justify-center pt-16">
      <DynamicDashboard />
    </main>
  );
}