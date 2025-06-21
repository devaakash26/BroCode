'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });



export default function CodeEditor({ 
  value, 
  onChange, 
  language = 'javascript', 
  height = '400px',
  readOnly = false
}) {
  const [theme, setTheme] = useState('vs-dark');

  const handleEditorChange = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end p-2 bg-gray-100 dark:bg-gray-800">
        <div>
          <select
            value={theme}
            onChange={handleThemeChange}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <div className="flex-grow" style={{ height }}>
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={theme}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
} 
