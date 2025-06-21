'use client';

import { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  AlertCircle,
  Info,
  ToggleLeft,
  ToggleRight,
  Settings,
  Shield,
  FileCode,
  Database,
  Mail
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    general: {
      siteName: 'BroCode',
      siteDescription: 'Platform for learning algorithms and data structures',
      logoUrl: '/images/logo.svg',
      allowRegistration: true,
      requireEmailVerification: true,
      maintenanceMode: false,
    },
    security: {
      sessionLength: 24, // hours
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireStrongPasswords: true,
      enableTwoFactorAuth: false,
    },
    email: {
      senderName: 'BroCode Team',
      senderEmail: 'noreply@neetcode.io',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: 'smtp-user',
      smtpPassword: '••••••••••••'
    },
    social: {
      enableDiscord: true,
      discordWebhook: 'https://discord.com/api/webhooks/example',
      enableGithub: true,
      githubClientId: 'github-client-id',
      githubClientSecret: '••••••••••••'
    },
    problems: {
      defaultTimeLimit: 60, // seconds
      enableAutomaticSubmissionRejection: true,
      submissionCooldown: 5, // seconds
      showProblemsBeforeLogin: true,
      allowProblemComments: true
    }
  });
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // This would be replaced with real API call
        // const response = await fetch('/api/admin/settings');
        // const data = await response.json();
        
        // if (data.success) {
        //   setSettings(data.settings);
        // } else {
        //   setMessage({ type: 'error', text: data.error || 'Failed to load settings' });
        // }
        
        // For demonstration, we'll just use the default settings
        // and simulate a delay
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setSettingsChanged(true);
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      // This would be replaced with a real API call
      // const response = await fetch('/api/admin/settings', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(settings),
      // });
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setSettingsChanged(false);
      // } else {
      //   setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      // }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };
  
  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      type="button"
      className={`relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked
          ? 'bg-indigo-600'
          : 'bg-gray-200 dark:bg-gray-700'
      }`}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`${
          checked ? 'translate-x-5' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform`}
      />
    </button>
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }
  
  const renderSettingsPanel = (title, icon, description, fields) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {icon}
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
              </label>
              {field.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>
              )}
            </div>
            <div className="w-full sm:w-auto">
              {field.type === 'text' && (
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={settings[field.category][field.key]}
                  onChange={(e) => updateSetting(field.category, field.key, e.target.value)}
                />
              )}
              {field.type === 'password' && (
                <input
                  type="password"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={settings[field.category][field.key]}
                  onChange={(e) => updateSetting(field.category, field.key, e.target.value)}
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={settings[field.category][field.key]}
                  onChange={(e) => updateSetting(field.category, field.key, parseInt(e.target.value, 10))}
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                />
              )}
              {field.type === 'toggle' && (
                <ToggleSwitch
                  checked={settings[field.category][field.key]}
                  onChange={() => updateSetting(field.category, field.key, !settings[field.category][field.key])}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!settingsChanged || saving}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !settingsChanged
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
      
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <Info className={`h-5 w-5 text-green-400`} />
              ) : (
                <AlertCircle className={`h-5 w-5 text-red-400`} />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6">
        {/* General Settings */}
        {renderSettingsPanel(
          'General Settings',
          <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
          'Configure basic platform settings',
          [
            { category: 'general', key: 'siteName', label: 'Site Name', type: 'text' },
            { category: 'general', key: 'siteDescription', label: 'Site Description', type: 'text' },
            { category: 'general', key: 'logoUrl', label: 'Logo URL', type: 'text' },
            { 
              category: 'general', 
              key: 'allowRegistration', 
              label: 'Allow New Registrations', 
              type: 'toggle',
              description: 'When disabled, new users cannot register'
            },
            { 
              category: 'general', 
              key: 'requireEmailVerification', 
              label: 'Require Email Verification', 
              type: 'toggle',
              description: 'Users must verify their email before accessing the platform'
            },
            { 
              category: 'general', 
              key: 'maintenanceMode', 
              label: 'Maintenance Mode', 
              type: 'toggle',
              description: 'When enabled, only admins can access the platform'
            }
          ]
        )}
        
        {/* Security Settings */}
        {renderSettingsPanel(
          'Security Settings',
          <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
          'Configure security and authentication settings',
          [
            { 
              category: 'security', 
              key: 'sessionLength', 
              label: 'Session Length (hours)', 
              type: 'number',
              min: 1,
              max: 720,
              description: 'How long user sessions remain active'
            },
            { 
              category: 'security', 
              key: 'maxLoginAttempts', 
              label: 'Max Login Attempts', 
              type: 'number',
              min: 1,
              max: 20,
              description: 'Maximum failed login attempts before account lockout'
            },
            { 
              category: 'security', 
              key: 'passwordMinLength', 
              label: 'Minimum Password Length', 
              type: 'number',
              min: 6,
              max: 32,
              description: 'Minimum number of characters for passwords'
            },
            { 
              category: 'security', 
              key: 'requireStrongPasswords', 
              label: 'Require Strong Passwords', 
              type: 'toggle',
              description: 'Passwords must contain numbers, letters, and special characters'
            },
            { 
              category: 'security', 
              key: 'enableTwoFactorAuth', 
              label: 'Enable Two-Factor Authentication', 
              type: 'toggle',
              description: 'Allow users to secure their accounts with 2FA'
            }
          ]
        )}
        
        {/* Problem Settings */}
        {renderSettingsPanel(
          'Problem Settings',
          <FileCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
          'Configure settings for problems and submissions',
          [
            { 
              category: 'problems', 
              key: 'defaultTimeLimit', 
              label: 'Default Time Limit (seconds)', 
              type: 'number',
              min: 1,
              max: 300,
              description: 'Default time limit for problem submissions'
            },
            { 
              category: 'problems', 
              key: 'enableAutomaticSubmissionRejection', 
              label: 'Enable Automatic Submission Rejection', 
              type: 'toggle',
              description: 'Automatically reject submissions that exceed time limits'
            },
            { 
              category: 'problems', 
              key: 'submissionCooldown', 
              label: 'Submission Cooldown (seconds)', 
              type: 'number',
              min: 0,
              max: 60,
              description: 'Time users must wait between submissions'
            },
            { 
              category: 'problems', 
              key: 'showProblemsBeforeLogin', 
              label: 'Show Problems Before Login', 
              type: 'toggle',
              description: 'Allow non-logged-in users to view problem statements'
            },
            { 
              category: 'problems', 
              key: 'allowProblemComments', 
              label: 'Allow Problem Comments', 
              type: 'toggle',
              description: 'Enable comments on problem pages'
            }
          ]
        )}
        
        {/* Email Settings */}
        {renderSettingsPanel(
          'Email Settings',
          <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
          'Configure SMTP and email notification settings',
          [
            { category: 'email', key: 'senderName', label: 'Sender Name', type: 'text' },
            { category: 'email', key: 'senderEmail', label: 'Sender Email', type: 'text' },
            { category: 'email', key: 'smtpHost', label: 'SMTP Host', type: 'text' },
            { category: 'email', key: 'smtpPort', label: 'SMTP Port', type: 'number', min: 1, max: 65535 },
            { category: 'email', key: 'smtpSecure', label: 'Use Secure Connection (TLS)', type: 'toggle' },
            { category: 'email', key: 'smtpUser', label: 'SMTP Username', type: 'text' },
            { category: 'email', key: 'smtpPassword', label: 'SMTP Password', type: 'password' }
          ]
        )}
        
        {/* Integration Settings */}
        {renderSettingsPanel(
          'Integration Settings',
          <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
          'Configure third-party integrations and social connections',
          [
            { category: 'social', key: 'enableDiscord', label: 'Enable Discord Integration', type: 'toggle' },
            { category: 'social', key: 'discordWebhook', label: 'Discord Webhook URL', type: 'text' },
            { category: 'social', key: 'enableGithub', label: 'Enable GitHub Integration', type: 'toggle' },
            { category: 'social', key: 'githubClientId', label: 'GitHub Client ID', type: 'text' },
            { category: 'social', key: 'githubClientSecret', label: 'GitHub Client Secret', type: 'password' }
          ]
        )}
      </div>
    </div>
  );
} 
