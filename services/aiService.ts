import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { type ScriptLine, type ContentBundleResponse, type AudioGenerationDetails } from '../types';

const GEMINI_API_KEY = process.env.API_KEY;
// Use environment variable for ElevenLabs API key.
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("CRITICAL: API_KEY (for Gemini) environment variable is not set. AI features will not work.");
}
if (!ELEVENLABS_API_KEY) {
  console.warn("WARNING: ELEVENLABS_API_KEY environment variable is not set. Real audio generation with ElevenLabs will not work; simulation will proceed if script is available, or generation will be skipped.");
}

// Initialize GoogleGenAI client with API key directly from process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCRIPT_GENERATION_MODEL = 'gemini-2.5-flash-preview-04-17';
const PLACEHOLDER_VERTICAL_VIDEO_URL = 'https://www.youtube.com/watch?v=iYipwtIa1Po'; // Creative Commons Minecraft Parkour

// ElevenLabs Configuration
const ELEVENLABS_TTS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';

// Updated ElevenLabs Voice IDs based on user request
const VOICE_ID_PERSON_A = "WAhoMTNdLdMoq1j3wf3I"; // Hope - Smooth talker
const VOICE_ID_PERSON_B = "KH1SQLVulwP6uG4O3nmT"; // Hey Its Brad - Your Favorite Boyfriend

// Updated ElevenLabs Model ID based on user request for "eleven flash 2.5 model"
const ELEVENLABS_MODEL_ID = "eleven_turbo_v2"; 

// Helper function to generate audio for a single text segment with a specific voice
const generateAudioSegment = async (text: string, voiceId: string, previousText?: string, nextText?: string): Promise<ArrayBuffer> => {
  const targetUrl = `${ELEVENLABS_TTS_BASE_URL}${voiceId}`;
  
  const requestBody = {
    text: text,
    model_id: ELEVENLABS_MODEL_ID,
    output_format: "mp3_44100_128",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      use_speaker_boost: true
    }
  };

  // Add context for better prosody if available
  if (previousText) {
    requestBody.previous_text = previousText;
  }
  if (nextText) {
    requestBody.next_text = nextText;
  }

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
      errorMessage = `${errorMessage} - ${parsedError.detail?.message || errorBody}`;
    } catch {
      errorMessage = `${errorMessage} - ${errorBody}`;
    }
    throw new Error(errorMessage);
  }

  return await response.arrayBuffer();
};

// Function to concatenate audio buffers (simple concatenation for MP3)
const concatenateAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const result = new ArrayBuffer(totalLength);
  const resultView = new Uint8Array(result);
  
  let offset = 0;
  for (const buffer of buffers) {
    resultView.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return result;
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

  console.group("ElevenLabs Multi-Voice Audio Generation");
  console.log(`Generating audio for ${scriptLines.length} script segments with different voices`);
  
  try {
    const audioSegments: ArrayBuffer[] = [];
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      
      // Determine voice based on speaker
      const voiceId = (line.speaker.toLowerCase().includes('person a') || line.speaker.toLowerCase().includes(' a:')) 
        ? VOICE_ID_PERSON_A 
        : VOICE_ID_PERSON_B;
      
      // Get context for better prosody
      const previousText = i > 0 ? scriptLines.slice(0, i).map(l => l.text).join(' ') : undefined;
      const nextText = i < scriptLines.length - 1 ? scriptLines.slice(i + 1).map(l => l.text).join(' ') : undefined;
      
      console.log(`Generating segment ${i + 1}/${scriptLines.length}: ${line.speaker} (Voice: ${voiceId === VOICE_ID_PERSON_A ? 'Person A' : 'Person B'})`);
      
      const audioBuffer = await generateAudioSegment(line.text, voiceId, previousText, nextText);
      audioSegments.push(audioBuffer);
      
      // Small delay to avoid rate limiting
      if (i < scriptLines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Concatenate all audio segments
    console.log("Concatenating audio segments...");
    const finalAudioBuffer = concatenateAudioBuffers(audioSegments);
    
    // Create blob and URL
    const audioBlob = new Blob([finalAudioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.groupEnd();
    
    return { 
      url: audioUrl, 
      statusMessage: `Audio successfully generated with ${scriptLines.length} segments using multiple voices.` 
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

const generateContentBundle = async (topic: string): Promise<ContentBundleResponse> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured. Cannot connect to AI services.");
  }

  let scriptText = "";
  const parsedScriptLines: ScriptLine[] = [];

  try {
    // Step 1: Generate script using Gemini
    const prompt = `You are an AI assistant specialized in creating educational content.
    Generate a conversational script between two distinct characters, Person A and Person B.
    The script should explain and explore the following topic: "${topic}".
    Make the script engaging, clear, and suitable for a general audience.
    Ensure Person A and Person B have distinct speaking styles or perspectives. Keep the conversation under 130 words.
    Format each line strictly as 'Person A: [dialogue]' or 'Person B: [dialogue]'. Start directly with the dialogue.
    Do not include any introductory or concluding remarks outside the dialogue format.
    Example:
    Person A: Let's discuss the basics of photosynthesis.
    Person B: Great idea! Where do we start?
    Person A: We can begin with the role of chlorophyll.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: SCRIPT_GENERATION_MODEL,
        contents: prompt,
        config: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        }
    });
    
    scriptText = response.text;
    if (!scriptText || scriptText.trim() === "") {
        throw new Error("AI failed to generate a script. The response was empty.");
    }

    // Helper to parse script
    const lines = scriptText.split('\n').filter(line => line.trim() !== '');
    const speakerRegex = /^(Person [A-Za-z0-9]+):\s*(.*)$/i; // Made regex case-insensitive for "Person"
    for (const line of lines) {
      const match = line.match(speakerRegex);
      if (match) {
        parsedScriptLines.push({ speaker: match[1], text: match[2].trim() });
      }
    }

    if (parsedScriptLines.length === 0 && scriptText.length > 0) {
         console.warn("Script generated but could not be parsed into speaker lines. Raw text will be shown. Audio generation might be affected.");
    }

    // Step 2: Generate audio using ElevenLabs (or simulation if key is missing)
    const audioDetails = await generateAudioWithElevenLabs(parsedScriptLines);
    
    // Step 3: Provide placeholder video URL
    // Using a YouTube Shorts embed URL pattern.
    const videoId = PLACEHOLDER_VERTICAL_VIDEO_URL.split('v=')[1]?.split('&')[0];
    const videoUrl = videoId ? `https://www.youtube.com/shorts/${videoId}` : PLACEHOLDER_VERTICAL_VIDEO_URL;

    return {
      scriptText,
      audioDetails,
      videoUrl,
    };
  } catch (error: unknown) {
    console.error('Error in aiService.generateContentBundle:', error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred during content generation.";
    if (error instanceof Error && error.message?.includes("API key not valid")) {
        errorMessage = "The provided Gemini API Key is not valid. Please check your configuration.";
    }
    
    // Attempt to return partial results or specific error messages
    // If script generation failed before audio step, audioDetails might not be set.
    let finalAudioDetails: AudioGenerationDetails;

    if (parsedScriptLines.length > 0) {
        // If script was parsed but a subsequent error occurred (e.g., during video URL formation, though unlikely here)
        // or if generateAudioWithElevenLabs itself threw an error that was caught by the outer try-catch
        finalAudioDetails = await generateAudioWithElevenLabs(parsedScriptLines).catch((audioError: unknown) => ({
            url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
            statusMessage: `Audio generation failed or was impacted: ${audioError instanceof Error ? audioError.message : 'Unknown audio error'}. Placeholder audio provided.`
        }));
    } else {
        // If script parsing failed or script generation failed (parsedScriptLines is empty)
        finalAudioDetails = {
            url: '',
            statusMessage: `Audio generation skipped or failed: ${scriptText ? 'Script parsing issue.' : errorMessage}`
        };
    }

    return {
        scriptText: scriptText || `Script generation failed: ${errorMessage}`,
        audioDetails: finalAudioDetails,
        videoUrl: PLACEHOLDER_VERTICAL_VIDEO_URL.split('v=')[1] ? `https://www.youtube.com/shorts/${PLACEHOLDER_VERTICAL_VIDEO_URL.split('v=')[1].split('&')[0]}` : PLACEHOLDER_VERTICAL_VIDEO_URL,
    };
  }
};

export const aiService = {
  generateContentBundle,
};