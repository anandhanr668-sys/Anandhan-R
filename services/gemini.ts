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
    // Similar to translateText but potentially handling larger contexts or different prompting
    const model = 'gemini-2.5-flash';
    const prompt = `Translate the following document content from ${sourceLang} to ${targetLang}. 
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
      sourceLang,
      targetLang,
      type: 'document'
    });

    return translatedText;

  } catch (error) {
    console.error("Document translation error:", error);
    throw new Error("Failed to translate document.");
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
