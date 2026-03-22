'use client';

import { Monitor, Smartphone, AlertCircle, Check } from 'lucide-react';

export default function MobileRestriction({ 
  action = "challenge",
  title = "Desktop Required",
  message = "For the best experience and full functionality, please switch to a desktop or laptop computer."
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-8 py-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500" strokeWidth={2} />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mobile Not Supported
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-6">
            {/* Message */}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {message}
            </p>

            {/* Requirements */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                Desktop Features Required
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Full code editor with syntax highlighting
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Better screen space for coding challenges
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Multiple panels for problem & solution
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Keyboard shortcuts & productivity features
                  </p>
                </div>
              </div>
            </div>

            {/* Device Comparison */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-8">
                {/* Mobile - Not Supported */}
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-14 h-20 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center">
                      <Smartphone className="h-7 w-7 text-gray-400 dark:text-gray-600" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✕</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Mobile
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-gray-300 dark:text-gray-700 text-lg">
                  →
                </div>

                {/* Desktop - Required */}
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-20 h-14 rounded-lg border-2 border-green-500 dark:border-green-600 bg-white dark:bg-gray-800 flex items-center justify-center">
                      <Monitor className="h-8 w-8 text-green-600 dark:text-green-500" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-500">
                    Desktop
                  </p>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong className="font-semibold">Note:</strong> You can browse and view challenges on mobile, but creation and participation require desktop.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-8 py-4 bg-gray-50 dark:bg-gray-800/30">
            <button
              onClick={() => window.history.back()}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
