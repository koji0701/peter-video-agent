
import React, { useState, useEffect, useRef } from 'react';
import { type ScriptLine } from '../types';

interface ScriptOutputProps {
  scriptLines: ScriptLine[];
  onUpdateScriptLine: (index: number, newText: string, newSpeaker?: string) => void;
  onGenerateAudio: () => void;
  isGeneratingAudio: boolean;
  isScriptDirty: boolean;
  disabled?: boolean;
}

export const ScriptOutput: React.FC<ScriptOutputProps> = ({ 
  scriptLines, 
  onUpdateScriptLine, 
  onGenerateAudio, 
  isGeneratingAudio, 
  isScriptDirty,
  disabled 
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to content height
    }
  }, [editingIndex, editText]);

  const handleStartEdit = (index: number, currentText: string) => {
    if (disabled) return;
    setEditingIndex(index);
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      onUpdateScriptLine(editingIndex, editText);
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditText('');
    }
  };

  if (scriptLines.length === 0) {
    return null;
  }

  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-teal-400">Generated Script</h2>
        <button
          onClick={onGenerateAudio}
          disabled={isGeneratingAudio || scriptLines.length === 0 || disabled}
          className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingAudio ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Audio...
            </span>
          ) : isScriptDirty ? 'Generate Audio for Edited Script 🔊' : 'Generate Audio 🔊'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">Click on a line's text to edit it. Press Enter (without Shift) or click outside to save.</p>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 bg-gray-700 p-4 rounded-lg shadow-inner">
        {scriptLines.map((line, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg shadow ${
              line.speaker.toLowerCase().includes('person a') || line.speaker === "Raw Output" ? 'bg-sky-700 text-sky-100 ml-auto' : 'bg-cyan-700 text-cyan-100 mr-auto'
            } max-w-[85%] break-words transition-all duration-150 ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-teal-400'}`}
            style={ line.speaker === "Raw Output" ? {backgroundColor: '#4A5568'} : {} }
            onClick={() => editingIndex !== index && handleStartEdit(index, line.text)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => { if (e.key === 'Enter' && editingIndex !== index) handleStartEdit(index, line.text);}}
            aria-label={`Edit line ${index + 1} by ${line.speaker}`}
          >
            <span className="font-bold text-sm opacity-80">{line.speaker}:</span>
            {editingIndex === index ? (
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextareaChange}
                onBlur={handleSaveEdit}
                onKeyDown={handleTextareaKeyDown}
                className="w-full p-1 mt-1 bg-inherit text-inherit border border-teal-400 rounded-md focus:ring-1 focus:ring-teal-300 resize-none overflow-hidden min-h-[3em]"
                rows={1} // Start with 1 row, auto-expands
                aria-label={`Editing text for ${line.speaker}`}
              />
            ) : (
              <p className="text-base whitespace-pre-wrap mt-0.5">{line.text || (<i>empty line</i>)}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
