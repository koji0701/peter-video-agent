
import React from 'react';

interface TopicFormProps {
  topic: string;
  setTopic: (topic: string) => void;
  onSubmit: (topic: string) => void;
  isLoading: boolean;
}

export const TopicForm: React.FC<TopicFormProps> = ({ topic, setTopic, onSubmit, isLoading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(topic);
  };

  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-teal-300 mb-1">
            Enter Your Topic
          </label>
          <textarea
            id="topic"
            name="topic"
            rows={3}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow shadow-sm placeholder-gray-500"
            placeholder="e.g., 'a comparison of nihilism and existentialism'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className="w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg shadow-md hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <span className="group-hover:text-shadow-lg">Craft Content ✨</span>
          )}
        </button>
      </form>
    </section>
  );
};
    