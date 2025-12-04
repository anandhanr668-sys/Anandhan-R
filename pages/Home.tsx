import React, { useState, useRef } from 'react';
import { LANGUAGES } from '../types';
import { translateText, generateSpeech, playAudioBuffer, transcribeAudio, refineText } from '../services/gemini';
import { ArrowRightLeft, Mic, Copy, Volume2, Check, Loader2, StopCircle, Sparkles, Briefcase, Coffee, FileText } from 'lucide-react';

export default function Home() {
  const [sourceLang, setSourceLang] = useState('ne');
  const [targetLang, setTargetLang] = useState('en');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const result = await translateText(inputText, 
        LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang, 
        LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      );
      setOutputText(result);
    } catch (error) {
      alert("Translation failed. Please check your API Key configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (type: 'polish' | 'formal' | 'casual' | 'summarize') => {
    if (!outputText) return;
    setIsRefining(true);
    try {
      const result = await refineText(outputText, type);
      setOutputText(result);
    } catch (error) {
      alert("Failed to refine text.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (!outputText) return;
    setIsSpeaking(true);
    try {
      const buffer = await generateSpeech(outputText, targetLang);
      playAudioBuffer(buffer);
    } catch (error) {
      console.error(error);
      alert("Failed to generate speech.");
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleMic = async () => {
    // If already listening, stop recording
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());

        // Process audio
        setIsLoading(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const text = await transcribeAudio(base64String, audioBlob.type);
            setInputText(text);
            setIsLoading(false);
          };
        } catch (error) {
          console.error("Transcription failed", error);
          alert("Failed to transcribe audio.");
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permission is granted.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Text Translation</h1>
        <p className="text-gray-500 dark:text-gray-400">Translate between Nepalese, Sinhala, English and more with AI.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Language Controls */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={`source-${lang.code}`} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSwap}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ArrowRightLeft size={20} />
          </button>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={`target-${lang.code}`} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input/Output Areas */}
        <div className="grid md:grid-cols-2 h-[500px] md:h-[400px] divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
          {/* Source */}
          <div className="relative p-6 flex flex-col h-full bg-white dark:bg-gray-800">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text here..."
              className="flex-1 w-full resize-none border-none focus:ring-0 bg-transparent text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
              spellCheck="false"
            />
            <div className="absolute bottom-4 left-6 flex gap-2">
              <button 
                onClick={handleMic}
                className={`p-3 rounded-full transition-all duration-300 ${
                  isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isListening ? "Stop Recording" : "Start Recording"}
              >
                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
              </button>
            </div>
            <div className="absolute bottom-4 right-6 text-sm text-gray-400">
              {inputText.length} chars
            </div>
          </div>

          {/* Target */}
          <div className="relative p-6 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
             {isLoading || isRefining ? (
               <div className="flex-1 flex flex-col items-center justify-center text-primary-600">
                 <Loader2 className="animate-spin mb-2 w-8 h-8" /> 
                 <p>{isListening ? "Listening..." : isRefining ? "Refining with AI..." : "Processing..."}</p>
               </div>
             ) : (
                <textarea
                  readOnly
                  value={outputText}
                  placeholder="Translation will appear here"
                  className="flex-1 w-full resize-none border-none focus:ring-0 bg-transparent text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
             )}
             
             {outputText && !isLoading && !isRefining && (
               <>
                {/* AI Tools */}
                <div className="absolute bottom-16 left-6 right-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => handleRefine('polish')} className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/30 whitespace-nowrap shadow-sm">
                      <Sparkles size={14} className="mr-1.5" /> Polish
                    </button>
                    <button onClick={() => handleRefine('formal')} className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 whitespace-nowrap shadow-sm">
                      <Briefcase size={14} className="mr-1.5" /> Formal
                    </button>
                    <button onClick={() => handleRefine('casual')} className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-900/30 whitespace-nowrap shadow-sm">
                      <Coffee size={14} className="mr-1.5" /> Casual
                    </button>
                    <button onClick={() => handleRefine('summarize')} className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/30 whitespace-nowrap shadow-sm">
                      <FileText size={14} className="mr-1.5" /> Summarize
                    </button>
                </div>

                {/* Standard Actions */}
                <div className="absolute bottom-4 left-6 flex gap-2">
                    <button 
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    className="p-3 rounded-full bg-white dark:bg-gray-800 text-primary-600 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="Listen"
                    >
                    <Volume2 size={20} className={isSpeaking ? "animate-pulse" : ""} />
                    </button>
                    <button 
                    onClick={handleCopy}
                    className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Copy"
                    >
                    {isCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                    </button>
                </div>
               </>
             )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleTranslate}
          disabled={isLoading || isRefining || !inputText.trim()}
          className="px-8 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading || isRefining ? 'Processing...' : 'Translate Text'}
        </button>
      </div>
    </div>
  );
}