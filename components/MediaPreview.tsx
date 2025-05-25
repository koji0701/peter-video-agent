
import React from 'react';
import { type ScriptLine } from '../types';

interface MediaPreviewProps {
  scriptLines: ScriptLine[];
  videoUrl: string;
  audioUrl:string; // Can be empty if not generated yet
  audioStatusMessage: string; // Can indicate state before generation
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ scriptLines, videoUrl, audioUrl, audioStatusMessage }) => {
  const hasMediaContent = videoUrl || audioUrl || audioStatusMessage;
  const hasDownloadableContent = scriptLines.length > 0 || audioUrl || videoUrl;

  const downloadScript = () => {
    if (scriptLines.length === 0) return;
    const scriptContent = scriptLines.map(line => `${line.speaker}: ${line.text}`).join('\n\n');
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_script.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!hasMediaContent && scriptLines.length === 0) {
    return (
      <section className="p-6 bg-gray-800 rounded-xl shadow-2xl text-center">
        <h2 className="text-2xl font-semibold mb-4 text-teal-400">Content Preview & Downloads</h2>
        <p className="text-gray-500">Generate a script to see the preview and download options here.</p>
      </section>
    );
  }

  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-teal-400">Content Preview & Downloads</h2>
      
      {hasMediaContent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
          {videoUrl && (
            <div className="aspect-[9/16] w-full max-w-xs mx-auto md:max-w-sm bg-black rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={`${videoUrl}?autoplay=1&mute=1&loop=1&playlist=${videoUrl.split('/').pop()?.split('?')[0]}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
                title="Background Gameplay Video"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          )}
          
          <div className={`flex flex-col justify-center space-y-4 ${videoUrl ? 'md:pt-0' : 'col-span-2 text-center'}`}>
            {(audioUrl || audioStatusMessage) && (
              <div className="p-4 bg-gray-700 rounded-lg shadow">
                <h3 className="text-lg font-medium text-cyan-300 mb-2">Generated Audio</h3>
                {audioStatusMessage && (
                  <p className="text-sm text-gray-300 mb-2">{audioStatusMessage}</p>
                )}
                {audioUrl && (
                  <div>
                    <audio controls src={audioUrl} className="w-full">
                      Your browser does not support the audio element.
                    </audio>
                     <p className="text-xs text-gray-500 mt-1">
                      {audioStatusMessage.toLowerCase().includes("simulated") || audioStatusMessage.toLowerCase().includes("placeholder") 
                        ? "(Placeholder/Simulated audio)" 
                        : "(Audio from ElevenLabs)"}
                    </p>
                  </div>
                )}
                 {!audioUrl && !audioStatusMessage && ( // Should not happen if this block is rendered based on audioStatusMessage
                  <p className="text-gray-500">Audio not yet generated or an issue occurred.</p>
                )}
              </div>
            )}
             {!(audioUrl || audioStatusMessage) && videoUrl && ( // If only video is there, and no audio message yet
                <div className="p-4 bg-gray-700 rounded-lg shadow text-center">
                     <h3 className="text-lg font-medium text-cyan-300 mb-2">Audio</h3>
                    <p className="text-gray-400">Edit the script and click "Generate Audio" to hear the voice-over.</p>
                </div>
             )}
          </div>
        </div>
      )}
       {hasMediaContent && videoUrl && (
         <p className="text-xs text-gray-500 mt-[-1.5rem] mb-6 text-center">
            Background video is muted. After generating, the audio should be played over this video.
         </p>
       )}

      {hasDownloadableContent && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-cyan-300">Download Assets</h3>
          <div className="space-y-3 md:space-y-0 md:flex md:space-x-4">
            {scriptLines.length > 0 && (
              <button
                onClick={downloadScript}
                className="w-full md:w-auto px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500 transition"
              >
                Download Script (.txt)
              </button>
            )}
            {audioUrl && (
              <a
                href={audioUrl}
                download="generated_audio.mp3"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full md:w-auto text-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition"
              >
                Download Audio (.mp3)
              </a>
            )}
            {videoUrl && (
              <a
                href={videoUrl.replace("shorts/", "watch?v=").split('&')[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full md:w-auto text-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition"
              >
                Open Video Source
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            <strong>Note:</strong> To combine the audio and video, please use video editing software.
          </p>
        </div>
      )}
    </section>
  );
};
