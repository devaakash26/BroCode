'use client';

import { Shield, User, Bell, MessageSquare } from 'lucide-react';

const tabs = [
  { name: 'overview', label: 'Overview', icon: <User className="h-5 w-5 mr-2" /> },
  { name: 'queries', label: 'My Queries', icon: <MessageSquare className="h-5 w-5 mr-2" /> },
  { name: 'settings', label: 'Account Settings', icon: <Bell className="h-5 w-5 mr-2" /> },
  { name: 'danger', label: 'Danger Zone', icon: <Shield className="h-5 w-5 mr-2" /> },
];

export default function ProfileTabs({ activeTab, setActiveTab }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === tab.name
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
} 
