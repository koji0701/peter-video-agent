
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { TopicForm } from './components/TopicForm';
import { ScriptOutput } from './components/ScriptOutput';
import { MediaPreview } from './components/MediaPreview';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { type ScriptLine } from './types';
import { aiService } from './services/aiService';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioStatusMessage, setAudioStatusMessage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [isScriptDirty, setIsScriptDirty] = useState<boolean>(false); // True if script changed since last audio gen

  const [currentStatusMessage, setCurrentStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const parseScriptText = (text: string): ScriptLine[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const parsedLines: ScriptLine[] = [];
    const speakerRegex = /^(Person [A-Za-z0-9]+):\s*(.*)$/i;

    for (const line of lines) {
      const match = line.match(speakerRegex);
      if (match) {
        parsedLines.push({ speaker: match[1], text: match[2].trim() });
      }
    }
    return parsedLines;
  };

  const handleTopicSubmit = useCallback(async (currentTopic: string) => {
    if (!currentTopic.trim()) {
      setError("Topic cannot be empty.");
      return;
    }
    setIsLoadingScript(true);
    setError(null);
    setScriptLines([]);
    setAudioUrl('');
    setAudioStatusMessage('');
    setVideoUrl('');
    setIsScriptDirty(false);
    setCurrentStatusMessage('Warming up the AI engine...');

    try {
      setCurrentStatusMessage('Generating educational script with Gemini...');
      const scriptText = await aiService.generateScript(currentTopic);
      
      setCurrentStatusMessage('Parsing generated script...');
      const parsedScript = parseScriptText(scriptText);

      if (parsedScript.length === 0 && scriptText?.trim().length > 0) {
        setError("Failed to parse the script into 'Person A/B:' lines. Displaying raw text. Audio generation may not work as expected.");
        setScriptLines([{ speaker: "Raw Output", text: scriptText }]);
      } else if (parsedScript.length === 0 && (!scriptText || scriptText.trim().length === 0)) {
        setError("AI returned an empty or unparseable script. Please try a different topic or phrasing.");
        setScriptLines([]);
      } else {
        setScriptLines(parsedScript);
      }
      
      if (parsedScript.length > 0) {
        setIsScriptDirty(true); // New script, ready for audio gen or further edits
        setCurrentStatusMessage('Script generated. You can edit it below and then generate audio.');
      } else {
         setCurrentStatusMessage('Script generation finished with issues.');
      }

      setVideoUrl(aiService.getPlaceholderVideoUrl());

    } catch (e: any) {
      console.error("Error generating script:", e);
      setError(e.message || "An unknown error occurred during script generation.");
      setCurrentStatusMessage('');
    } finally {
      setIsLoadingScript(false);
    }
  }, []);

  const handleUpdateScriptLine = useCallback((index: number, newText: string, newSpeaker?: string) => {
    setScriptLines(prevLines => {
      const newLines = [...prevLines];
      if (newLines[index]) {
        newLines[index] = { 
          speaker: newSpeaker || newLines[index].speaker, 
          text: newText 
        };
      }
      return newLines;
    });
    setIsScriptDirty(true);
    setAudioUrl(''); // Clear previous audio as script has changed
    setAudioStatusMessage('Script edited. Please regenerate audio.');
  }, []);

  const handleFinalizeAndGenerateAudio = useCallback(async () => {
    if (scriptLines.length === 0) {
      setError("Cannot generate audio for an empty script.");
      return;
    }
    setIsGeneratingAudio(true);
    setError(null);
    setAudioUrl('');
    setAudioStatusMessage('');
    setCurrentStatusMessage('Sending script to ElevenLabs for audio generation...');

    try {
      const audioDetails = await aiService.generateAudioWithElevenLabs(scriptLines);
      setAudioUrl(audioDetails.url);
      setAudioStatusMessage(audioDetails.statusMessage);
      setIsScriptDirty(false); // Audio matches current script
      setCurrentStatusMessage(audioDetails.url ? 'Audio generation complete!' : 'Audio generation finished with issues.');
    } catch (e: any) {
      console.error("Error generating audio:", e);
      const errorMessage = e.message || "An unknown error occurred during audio generation.";
      setError(errorMessage);
      setAudioUrl('');
      setAudioStatusMessage(`Audio generation failed: ${errorMessage}`);
      setCurrentStatusMessage('Audio generation failed.');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [scriptLines]);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 selection:bg-teal-500 selection:text-white">
      <Header />
      <main className="w-full max-w-4xl mt-8 space-y-8">
        <TopicForm
          topic={topic}
          setTopic={setTopic}
          onSubmit={handleTopicSubmit}
          isLoading={isLoadingScript}
        />

        {(isLoadingScript || isGeneratingAudio) && (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <LoadingSpinner />
            <p className="mt-3 text-teal-400 font-medium animate-pulse">
              {isLoadingScript ? (currentStatusMessage || 'Generating script...') : (currentStatusMessage || 'Generating audio...')}
            </p>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {!isLoadingScript && scriptLines.length > 0 && (
          <ScriptOutput 
            scriptLines={scriptLines} 
            onUpdateScriptLine={handleUpdateScriptLine}
            onGenerateAudio={handleFinalizeAndGenerateAudio}
            isGeneratingAudio={isGeneratingAudio}
            isScriptDirty={isScriptDirty}
            disabled={isGeneratingAudio || isLoadingScript} // Disable editing/audio gen if script is loading
          />
        )}

        {!isLoadingScript && !isGeneratingAudio && (videoUrl || audioUrl || audioStatusMessage || scriptLines.length > 0) && (
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
        <p>Edit script lines by clicking on them. Then, generate audio for the finalized script.</p>
      </footer>
    </div>
  );
};

export default App;
