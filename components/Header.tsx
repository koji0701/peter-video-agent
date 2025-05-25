
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full max-w-4xl text-center my-8">
      <h1 className="text-5xl font-extrabold tracking-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-500">
          AI Content Creator Studio
        </span>
      </h1>
      <p className="mt-3 text-lg text-gray-400">
        Turn any topic into an engaging educational script, ready for voice-over and video.
      </p>
    </header>
  );
};
    