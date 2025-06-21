'use client';

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

export default function InviteCodeSection({ inviteCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Invite Code</h2>
        <div className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center">
          <Share2 className="h-4 w-4 mr-1" />
          <span>Share with others</span>
        </div>
      </div>
      <div className="flex items-center">
        <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-md font-mono text-md flex-grow">
          {inviteCode}
        </div>
        <button
          onClick={handleCopy}
          className={`ml-3 px-3 py-2 flex items-center gap-1 rounded-md transition-colors ${
            copied 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Share this code with others to let them join your group
      </p>
    </div>
  );
} 
