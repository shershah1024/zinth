'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlusCircle, FileText, FilePlus, Pill, Activity, Clipboard } from 'lucide-react';

interface DashboardItemProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const DashboardItem: React.FC<DashboardItemProps> = ({ href, icon: Icon, title, description, color }) => (
  <motion.div
    whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
    className={`bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300`}
  >
    <Link href={href} className="block p-6">
      <div className={`${color} rounded-full p-3 mb-4 inline-block`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-base text-gray-600 leading-relaxed">{description}</p>
    </Link>
  </motion.div>
);

const Dashboard: React.FC = () => {
  const items: DashboardItemProps[] = [
    {
      href: '/imaging-reports-upload',
      icon: PlusCircle,
      title: 'Add Imaging Reports',
      description: 'Upload and store your medical imaging reports securely.',
      color: 'bg-blue-500'
    },
    {
      href: '/imaging-results',
      icon: FileText,
      title: 'View Imaging Results',
      description: 'Access and review your imaging results with ease.',
      color: 'bg-blue-600'
    },
    {
      href: '/upload-prescription',
      icon: FilePlus,
      title: 'Add Prescription',
      description: 'Manage your medication prescriptions in one place.',
      color: 'bg-green-500'
    },
    {
      href: '/prescriptions',
      icon: Pill,
      title: 'View Medications',
      description: 'Review your current medications and set reminders.',
      color: 'bg-green-600'
    },
    {
      href: '/upload-test',
      icon: Activity,
      title: 'Add Health Records',
      description: 'Upload and organize various health test results.',
      color: 'bg-purple-500'
    },
    {
      href: '/health-records',
      icon: Clipboard,
      title: 'View Health Records',
      description: 'Access your complete health history timeline.',
      color: 'bg-purple-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-8 text-center text-gray-800"
      >
        Your Health Hub
      </motion.h1>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {items.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <DashboardItem {...item} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Dashboard;