import React, { useState } from 'react';
import { LANGUAGES } from '../types';
import { translateDocumentContent } from '../services/gemini';
import { Upload, FileText, Download, Loader2, File, CheckCircle } from 'lucide-react';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for text files (approx 1 million chars)

export default function DocumentTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ne');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > MAX_FILE_SIZE) {
        alert(`File is too large (${formatFileSize(selectedFile.size)}). Max allowed size is 1MB for text files.`);
        e.target.value = ''; // Reset input
        return;
      }

      setFile(selectedFile);
      setTranslatedContent('');
      
      // Simple text extraction for .txt, .md, .csv
      if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.csv')) {
        try {
            const text = await selectedFile.text();
            setContent(text);
        } catch (err) {
            alert("Failed to read file content.");
        }
      } else {
        setContent(`[Binary file ${selectedFile.name} loaded. Text extraction may not work perfectly. Please use .txt or .md files.]`);
      }
    }
  };

  const handleTranslate = async () => {
    if (!content) return;
    setIsProcessing(true);
    try {
        const sLangName = sourceLang === 'auto' 
          ? 'auto' 
          : LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
        
        const tLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
        
        const result = await translateDocumentContent(content, sLangName, tLangName);
        setTranslatedContent(result);
    } catch (e) {
        alert("Error translating document. Please check your network or API key.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([translatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(fileBlob);
    element.download = `translated_${file?.name || 'doc'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Document Translation</h1>
        <p className="text-gray-500 dark:text-gray-400">Upload documents to translate them while preserving formatting.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings & Upload */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Language</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="auto">✨ Detect Language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-center text-gray-400">
                ↓
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Language</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    {file ? (
                      <>
                        <CheckCircle className="w-10 h-10 mb-3 text-primary-600" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-full">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">TXT, MD, CSV (Max 1MB)</p>
                      </>
                    )}
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.csv" />
            </label>
          </div>
          
          {file && (
            <button
                onClick={handleTranslate}
                disabled={isProcessing}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 flex justify-center items-center"
            >
                {isProcessing ? <><Loader2 className="animate-spin mr-2"/> Translating...</> : 'Translate Document'}
            </button>
          )}
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[600px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <FileText size={18} className="text-gray-500" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {file ? file.name : 'No document selected'}
                    </span>
                </div>
                {translatedContent && (
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                        <Download size={16} /> Download Translated
                    </button>
                )}
            </div>
            
            <div className="flex-1 p-6 font-mono text-sm overflow-auto">
                {isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary-500" />
                        <p>Analyzing and translating document...</p>
                    </div>
                ) : translatedContent ? (
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-300">
                        {translatedContent}
                    </div>
                ) : content ? (
                    <div className="whitespace-pre-wrap text-gray-500 dark:text-gray-500">
                        {content}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <File className="w-16 h-16 mb-4 opacity-20" />
                        <p>Upload a file to see preview here</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}