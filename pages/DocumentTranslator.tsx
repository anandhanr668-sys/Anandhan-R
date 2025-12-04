import React, { useState } from 'react';
import { LANGUAGES } from '../types';
import { translateDocumentContent, translateBinaryFile } from '../services/gemini';
import { Upload, FileText, Download, Loader2, File, CheckCircle, Sparkles, Image as ImageIcon, FileType, Printer, Bot } from 'lucide-react';
import { jsPDF } from "jspdf";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export default function DocumentTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  
  // Translation States
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
        alert(`File is too large (${formatFileSize(selectedFile.size)}). Max allowed size is 5MB.`);
        e.target.value = ''; 
        return;
      }

      setFile(selectedFile);
      setTranslatedContent('');
      setPreviewUrl(null);
      setContent('');

      // Handle Image
      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } 
      // Handle PDF (Native Gemini Support)
      else if (selectedFile.type === 'application/pdf') {
        setContent("[PDF File Detected. Ready for AI Processing.]");
      }
      // Handle Text Files
      else if (
        selectedFile.type === 'text/plain' || 
        selectedFile.name.endsWith('.md') || 
        selectedFile.name.endsWith('.txt') || 
        selectedFile.name.endsWith('.csv') ||
        selectedFile.name.endsWith('.json')
      ) {
        try {
            const text = await selectedFile.text();
            setContent(text);
        } catch (err) {
            alert("Failed to read file content.");
        }
      } else {
         setContent("[File selected. If this is a document, AI will attempt to extract text.]");
      }
    }
  };

  const handleTranslate = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
        const tLangName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
        let resultText = "";

        // 1. Binary Files (PDF, Image) - Send as Base64 to Gemini
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const base64 = await fileToBase64(file);
            resultText = await translateBinaryFile(base64, file.type, tLangName);
            setTranslatedContent(resultText);
        } 
        // 2. Text Translation
        else {
            const textToTranslate = content || "Binary file content placeholder";
            const sLangName = sourceLang === 'auto' ? 'auto' : LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
            
            // If it's a binary file we couldn't preview but allowed (like docx fallback attempt)
            if (content.startsWith('[File selected')) {
                // Try sending as binary
                 const base64 = await fileToBase64(file);
                 // Warning: Gemini might not support docx mimeType directly, but we can try generic application/octet-stream or specific if known.
                 // For now, let's try strict mime type.
                 resultText = await translateBinaryFile(base64, file.type, tLangName);
            } else {
                 resultText = await translateDocumentContent(textToTranslate, sLangName, tLangName);
            }
            setTranslatedContent(resultText);
        }

    } catch (e) {
        console.error(e);
        alert("Error processing document. Please check your API key or file format.");
    } finally {
        setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove Data URL prefix to get raw base64
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
  };

  // --- Export Functions ---

  const handleDownloadPDF = () => {
    if (!translatedContent) return;
    const doc = new jsPDF();
    
    // Split text to fit page
    const splitText = doc.splitTextToSize(translatedContent, 180);
    doc.text(splitText, 10, 10);
    doc.save(`translated_${file?.name || 'doc'}.pdf`);
  };

  const handleDownloadWord = () => {
    if (!translatedContent) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + `<p style="white-space: pre-wrap;">${translatedContent}</p>` + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const element = document.createElement("a");
    element.href = source;
    element.download = `translated_${file?.name || 'doc'}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadText = () => {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Document Translator</h1>
        <p className="text-gray-500 dark:text-gray-400">
            Upload PDFs, Images, or Text files. AI will extract content and translate it while preserving context.
        </p>
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
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF, Images, TXT, MD, CSV</p>
                      </>
                    )}
                </div>
                {/* Accepted file types */}
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.txt,.md,.csv,.json" />
            </label>
          </div>
          
          {file && (
            <button
                onClick={handleTranslate}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center transform hover:-translate-y-0.5"
            >
                {isProcessing ? <><Loader2 className="animate-spin mr-2"/> Processing Document...</> : 'Translate Document'}
            </button>
          )}
        </div>

        {/* Preview & Result Area */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                    {file?.type.startsWith('image/') ? <ImageIcon size={18} className="text-gray-500"/> : <FileText size={18} className="text-gray-500" />}
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {file ? file.name : 'No file loaded'}
                    </span>
                </div>
                
                {/* Export Options */}
                <div className="flex items-center gap-1">
                    {translatedContent && (
                        <div className="flex bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 p-1">
                            <button onClick={handleDownloadPDF} title="Export PDF" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-red-600 dark:text-red-400"><Printer size={16}/></button>
                            <button onClick={handleDownloadWord} title="Export Word" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-blue-600 dark:text-blue-400"><FileType size={16}/></button>
                            <button onClick={handleDownloadText} title="Export Text" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400"><FileText size={16}/></button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Content Body */}
            <div className="flex-1 flex flex-col">
                {/* Image Preview (if image) */}
                {previewUrl && (
                    <div className="h-48 bg-gray-100 dark:bg-gray-900 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 p-2">
                        <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                    </div>
                )}

                {/* Translation Output */}
                <div className="flex-1 p-6 font-mono text-sm overflow-auto bg-white dark:bg-gray-800">
                    {isProcessing ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-900 dark:text-white">AI Processing</p>
                                <p className="text-sm">Reading file & translating...</p>
                            </div>
                        </div>
                    ) : translatedContent ? (
                        <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-300">
                             {translatedContent}
                        </div>
                    ) : content ? (
                         <div className="whitespace-pre-wrap text-gray-500 dark:text-gray-500 opacity-70">
                            {content.substring(0, 500)}...
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs">
                                Preview of content. Click "Translate Document" to process.
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <Sparkles className="w-16 h-16 mb-4" />
                            <p>Translation results will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}