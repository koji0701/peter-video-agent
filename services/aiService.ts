import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { type ScriptLine, type ContentBundleResponse, type AudioGenerationDetails } from '../types';

const GEMINI_API_KEY = process.env.API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("CRITICAL: API_KEY (for Gemini) environment variable is not set. AI features will not work.");
}
if (!ELEVENLABS_API_KEY) {
  console.warn("WARNING: ELEVENLABS_API_KEY environment variable is not set. Real audio generation with ElevenLabs will not work; simulation/placeholder will be used if script is available, or generation will be skipped.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCRIPT_GENERATION_MODEL = 'gemini-2.5-flash-preview-04-17';
const PLACEHOLDER_VERTICAL_VIDEO_URL = 'https://www.youtube.com/watch?v=iYipwtIa1Po'; // Creative Commons Minecraft Parkour

const ELEVENLABS_TTS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';
const VOICE_ID_PERSON_A = "WAhoMTNdLdMoq1j3wf3I"; // Hope - Smooth talker
const VOICE_ID_PERSON_B = "KH1SQLVulwP6uG4O3nmT"; // Hey Its Brad - Your Favorite Boyfriend
const ELEVENLABS_MODEL_ID = "eleven_turbo_v2";

const generateScript = async (topic: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured. Cannot connect to AI services.");
  }

  const prompt = `You are an AI assistant specialized in creating educational content.
    Generate a conversational script between two distinct characters, Person A and Person B.
    The script should explain and explore the following topic: "${topic}".
    Make the script engaging, clear, and suitable for a general audience.
    Ensure Person A and Person B have distinct speaking styles or perspectives. The conversation should be one back and forth exchange, underneath 5 words.
    Format each line strictly as 'Person A: [dialogue]' or 'Person B: [dialogue]'. Start directly with the dialogue.
    Do not include any introductory or concluding remarks outside the dialogue format.
    Example:
    Person A: Let's discuss the basics of photosynthesis.
    Person B: Great idea! Where do we start?
    Person A: We can begin with the role of chlorophyll.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: SCRIPT_GENERATION_MODEL,
        contents: prompt,
        config: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        }
    });
    
    const scriptText = response.text;
    if (!scriptText || scriptText.trim() === "") {
        throw new Error("AI failed to generate a script. The response was empty.");
    }
    return scriptText;
  } catch (error: unknown) {
    console.error('Error in aiService.generateScript:', error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred during script generation.";
    if (error instanceof Error && error.message?.includes("API key not valid")) {
        errorMessage = "The provided Gemini API Key is not valid. Please check your configuration.";
    }
    throw new Error(errorMessage);
  }
};

const generateAudioSegment = async (text: string, voiceId: string): Promise<ArrayBuffer> => {
  const targetUrl = `${ELEVENLABS_TTS_BASE_URL}${voiceId}`;
  
  const requestBody = {
    text: text,
    model_id: ELEVENLABS_MODEL_ID,
    // output_format: "mp3_44100_128", // Example output format, can be adjusted
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      // use_speaker_boost: true // This is for v2 models usually
    }
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `ElevenLabs API error: ${response.status}`;
    try {
      const parsedError = JSON.parse(errorBody);
      errorMessage = `${errorMessage} - ${parsedError.detail?.message || parsedError.detail || errorBody}`;
    } catch {
      errorMessage = `${errorMessage} - ${errorBody}`;
    }
    throw new Error(errorMessage);
  }
  return await response.arrayBuffer();
};

const concatenateAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
};

const generateAudioWithElevenLabs = async (scriptLines: ScriptLine[]): Promise<AudioGenerationDetails> => {
  if (!ELEVENLABS_API_KEY) {
    console.warn("ELEVENLABS_API_KEY not found. Skipping actual audio generation with ElevenLabs.");
    return {
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      statusMessage: "Audio generation simulated (API key missing). Placeholder audio provided."
    };
  }

  if (scriptLines.length === 0) {
    return { url: '', statusMessage: "No script lines to generate audio from." };
  }
  
  console.groupCollapsed("ElevenLabs Multi-Voice Audio Generation");
  console.log(`Generating audio for ${scriptLines.length} script segments.`);
  
  try {
    const audioSegments: ArrayBuffer[] = [];
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      const voiceId = (line.speaker.toLowerCase().includes('person a') || line.speaker.toLowerCase().includes(' a:')) 
        ? VOICE_ID_PERSON_A 
        : VOICE_ID_PERSON_B;
      
      console.log(`Segment ${i + 1}/${scriptLines.length}: Speaker '${line.speaker}' (Voice ID: ${voiceId === VOICE_ID_PERSON_A ? 'Hope' : 'Brad'}) - Text: "${line.text.substring(0,30)}..."`);
      
      if(!line.text || line.text.trim() === "") {
        console.warn(`Skipping empty text for segment ${i+1}`);
        // Add a very short silent buffer if needed, or just skip
        // For simplicity, skipping. If concatenation fails with empty segments, this might need adjustment.
        continue; 
      }
      const audioBuffer = await generateAudioSegment(line.text, voiceId);
      audioSegments.push(audioBuffer);
      
      if (i < scriptLines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 250)); // Small delay
      }
    }
    
    if (audioSegments.length === 0) {
      console.warn("No audio segments were generated (e.g., all script lines were empty).");
      console.groupEnd();
      return { url: '', statusMessage: "No audio generated as all script lines were empty or resulted in no audio." };
    }

    console.log("Concatenating audio segments...");
    const finalAudioBuffer = concatenateAudioBuffers(audioSegments);
    const audioBlob = new Blob([finalAudioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.groupEnd();
    return { 
      url: audioUrl, 
      statusMessage: `Audio successfully generated with ${audioSegments.length} segments using multiple voices.` 
    };
    
  } catch (error: unknown) {
    console.error("ElevenLabs multi-voice audio generation failed:", error);
    console.groupEnd();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', 
      statusMessage: `Multi-voice audio generation failed: ${errorMessage}. Placeholder audio provided.`
    };
  }
};


const getPlaceholderVideoUrl = (): string => {
    const videoId = PLACEHOLDER_VERTICAL_VIDEO_URL.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/shorts/${videoId}` : PLACEHOLDER_VERTICAL_VIDEO_URL;
};

export const aiService = {
  generateScript,
  generateAudioWithElevenLabs,
  getPlaceholderVideoUrl,
};
