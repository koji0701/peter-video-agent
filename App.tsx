
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { TopicForm } from './components/TopicForm';
import { ScriptOutput } from './components/ScriptOutput';
import { MediaPreview } from './components/MediaPreview';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { type ScriptLine, type AudioGenerationDetails } from './types';
import { aiService } from './services/aiService';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioStatusMessage, setAudioStatusMessage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string>(''); // Renamed from statusMessage to avoid conflict
  const [error, setError] = useState<string | null>(null);

  const parseScriptText = (text: string): ScriptLine[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const parsedLines: ScriptLine[] = [];
    // Regex to capture "Person A:", "Person B:", "Person 1:", etc.
    const speakerRegex = /^(Person [A-Za-z0-9]+):\s*(.*)$/i;

    for (const line of lines) {
      const match = line.match(speakerRegex);
      if (match) {
        parsedLines.push({ speaker: match[1], text: match[2].trim() });
      } else if (line.trim() && !line.toLowerCase().startsWith("example:") && !line.toLowerCase().startsWith("person a:") && !line.toLowerCase().startsWith("person b:")) {
        // This might catch preamble or postamble from the AI if it doesn't strictly follow format.
        // For now, if it's not a speaker line, we could add it as "Narrator" or ignore.
        // Let's assume strict formatting is desired, so we only take speaker lines.
        // console.warn("Non-speaker line detected in script:", line);
      }
    }
    return parsedLines;
  };

  const handleGenerateContent = useCallback(async (currentTopic: string) => {
    if (!currentTopic.trim()) {
      setError("Topic cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setScriptLines([]);
    setAudioUrl('');
    setAudioStatusMessage('');
    setVideoUrl('');
    setCurrentStatusMessage('Warming up the AI engine...');

    try {
      setCurrentStatusMessage('Generating educational script with Gemini...');
      const { scriptText, audioDetails, videoUrl: newVideoUrl } = await aiService.generateContentBundle(currentTopic);
      
      setCurrentStatusMessage('Parsing generated script...');
      const parsedScript = parseScriptText(scriptText);

      if (parsedScript.length === 0 && scriptText && scriptText.trim().length > 0) {
        // If parsing fails but there is text, show raw output.
        // This might happen if AI doesn't follow the 'Person A/B:' format.
        setError("Failed to parse the script into speaker lines. Displaying raw text. Audio generation might be affected if it relies on parsed lines.");
        setScriptLines([{ speaker: "Raw Output", text: scriptText }]);
      } else if (parsedScript.length === 0 && (!scriptText || scriptText.trim().length === 0)) {
        setError("AI returned an empty or unparseable script. Please try a different topic or phrasing.");
        setScriptLines([]); // Ensure scriptLines is empty
      } else {
        setScriptLines(parsedScript);
      }
      
      setCurrentStatusMessage('Processing audio...');
      setAudioUrl(audioDetails.url);
      setAudioStatusMessage(audioDetails.statusMessage);
      
      setCurrentStatusMessage('Preparing background video...');
      setVideoUrl(newVideoUrl);

      if (parsedScript.length > 0 || (scriptText && scriptText.trim().length > 0) ) {
        setCurrentStatusMessage('Content generation process complete!');
      } else {
         setCurrentStatusMessage('Content generation finished with issues.');
      }

    } catch (e: any) {
      console.error("Error generating content:", e);
      setError(e.message || "An unknown error occurred. Please try again.");
      setCurrentStatusMessage(''); // Clear status on error
    } finally {
      setIsLoading(false);
      // Keep currentStatusMessage if successful and no error, otherwise it's handled by setError or cleared.
      if (error && currentStatusMessage) setCurrentStatusMessage('');
    }
  }, [error, currentStatusMessage]); // Added dependencies based on usage.


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 selection:bg-teal-500 selection:text-white">
      <Header />
      <main className="w-full max-w-4xl mt-8 space-y-8">
        <TopicForm
          topic={topic}
          setTopic={setTopic}
          onSubmit={handleGenerateContent}
          isLoading={isLoading}
        />

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <LoadingSpinner />
            <p className="mt-3 text-teal-400 font-medium animate-pulse">{currentStatusMessage || 'Processing...'}</p>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {!isLoading && scriptLines.length > 0 && (
          <ScriptOutput scriptLines={scriptLines} />
        )}

        {!isLoading && (videoUrl || audioUrl || audioStatusMessage || scriptLines.length > 0) && (
          <MediaPreview
            scriptLines={scriptLines}
            videoUrl={videoUrl}
            audioUrl={audioUrl}
            audioStatusMessage={audioStatusMessage}
          />
        )}
      </main>
      <footer className="w-full max-w-4xl mt-12 mb-6 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Content Creator Studio. All rights reserved (simulated).</p>
        <p>Gemini API for script. Video and ElevenLabs audio generation are simulated/placeholders.</p>
      </footer>
    </div>
  );
};

export default App;
