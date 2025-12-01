import React, { useEffect, useState } from 'react';
import { getHistory, clearHistory } from '../services/storage';
import { TranslationRecord } from '../types';
import { Trash2, Search, Clock, FileText, Type } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const filteredHistory = history.filter(item => 
    item.sourceText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.translatedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Translation History</h1>
          <p className="text-gray-500 dark:text-gray-400">View your recent translation activity.</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
        >
          <Trash2 size={16} className="mr-2" />
          Clear History
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search within translations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm shadow-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-md ${item.type === 'document' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {item.type === 'document' ? <FileText size={14} /> : <Type size={14} />}
                  </span>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="uppercase">{item.sourceLang}</span>
                    <span>→</span>
                    <span className="uppercase">{item.targetLang}</span>
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock size={12} className="mr-1" />
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {item.sourceText}
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {item.translatedText}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No history found.
          </div>
        )}
      </div>
    </div>
  );
}