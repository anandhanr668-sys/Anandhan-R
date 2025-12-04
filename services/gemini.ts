import { GoogleGenAI, Modality } from "@google/genai";
import { saveTranslation } from "./storage";

// Initialize Gemini Client
// WARNING: In a real production app, never expose API keys on the frontend.
// Requests should go through your own backend.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 
    Preserve meaning, correct grammar, and avoid literal translations. 
    Return ONLY the translated text, no preamble or markdown formatting.
    
    Text: "${text}"`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const translatedText = response.text?.trim() || "";
    
    // Save to history
    saveTranslation({
      sourceText: text,
      translatedText,
      sourceLang,
      targetLang,
      type: 'text'
    });

    return translatedText;

  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text. Please try again.");
  }
};

export const translateDocumentContent = async (
  content: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Determine source language instruction
    const sourceInstruction = (sourceLang === 'auto' || sourceLang === 'Detect Language')
      ? "Detect the source language automatically" 
      : `from ${sourceLang}`;

    const prompt = `Translate the following document content ${sourceInstruction} to ${targetLang}. 
    Maintain the original structure/paragraphs as much as possible.
    
    Document Content:
    ${content}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const translatedText = response.text?.trim() || "";

    saveTranslation({
      sourceText: content.substring(0, 100) + "...", // truncate for storage
      translatedText: translatedText.substring(0, 100) + "...",
      sourceLang: sourceLang === 'auto' ? 'Auto' : sourceLang,
      targetLang,
      type: 'document'
    });

    return translatedText;

  } catch (error) {
    console.error("Document translation error:", error);
    throw new Error("Failed to translate document.");
  }
};

export const refineText = async (
  text: string,
  type: 'summarize' | 'polish' | 'formal' | 'casual'
): Promise<string> => {
  try {
    // Using Flash for fast editing tasks
    const model = 'gemini-2.5-flash';
    let prompt = "";
    
    switch (type) {
        case 'summarize': 
          prompt = "Summarize the following text concisely in the same language as the text:"; 
          break;
        case 'polish': 
          prompt = "Polish the following text to improve fluency, grammar, and vocabulary, keeping the meaning intact. Return only the polished text:"; 
          break;
        case 'formal': 
          prompt = "Rewrite the following text to be more formal and professional. Return only the rewritten text:"; 
          break;
        case 'casual': 
          prompt = "Rewrite the following text to be more casual and conversational. Return only the rewritten text:"; 
          break;
    }
    
    const response = await ai.models.generateContent({
      model,
      contents: `${prompt}\n\n"${text}"`
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Refine error:", error);
    throw new Error("Failed to refine text.");
  }
};

export const generateAnalyticsInsights = async (data: any): Promise<string> => {
    try {
        // Using Pro for complex reasoning and analysis
        const model = 'gemini-3-pro-preview';
        const prompt = `Analyze the following translation app usage data and provide 3 short, actionable strategic insights or interesting trends. Format the output as a simple list.
        
        Data: ${JSON.stringify(data)}`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });
        return response.text?.trim() || "No insights available.";
    } catch (error) {
        console.error("Insights error:", error);
        return "Could not generate insights at this time.";
    }
};

export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string = "audio/webm"
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Transcribe the spoken language in this audio exactly as it is. Return only the transcription text.",
          },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio.");
  }
};

export const generateSpeech = async (text: string, langCode: string): Promise<AudioBuffer> => {
  try {
    // gemini-2.5-flash-preview-tts is the model.
    // NOTE: This model is experimental.

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned");
    }

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1
    );
    
    return audioBuffer;

  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};


// Helper for Audio Decoding (from Google GenAI examples)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};