
import React from 'react';
import { type ScriptLine } from '../types';

interface ScriptOutputProps {
  scriptLines: ScriptLine[];
}

export const ScriptOutput: React.FC<ScriptOutputProps> = ({ scriptLines }) => {
  if (scriptLines.length === 0) {
    return null;
  }

  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-teal-400">Generated Script</h2>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 bg-gray-700 p-4 rounded-lg shadow-inner">
        {scriptLines.map((line, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg shadow ${
              line.speaker.includes('A') || line.speaker === "Raw Output" ? 'bg-sky-700 text-sky-100 ml-auto' : 'bg-cyan-700 text-cyan-100 mr-auto'
            } max-w-[85%] break-words`}
            style={ line.speaker === "Raw Output" ? {backgroundColor: '#4A5568'} : {} }
          >
            <span className="font-bold text-sm opacity-80">{line.speaker}:</span>
            <p className="text-base whitespace-pre-wrap">{line.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
    