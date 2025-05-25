
export interface ScriptLine {
  speaker: string;
  text: string;
}

export interface AudioGenerationDetails {
  url: string; // URL to the audio file (can be a placeholder or data URI)
  statusMessage: string; // Message about the audio generation process
}

export interface ContentBundleResponse {
  scriptText: string;
  audioDetails: AudioGenerationDetails;
  videoUrl: string;
}
