/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface Prompt {
  readonly promptId: string;
  text: string;
  weight: number;
  cc: number;
  color: string;
}

export interface ControlChange {
  channel: number;
  cc: number;
  value: number;
}

export type PlaybackState = 'stopped' | 'playing' | 'loading' | 'paused';

export const DRUM_STEM_TYPES = [
  'KICK',
  'SNARE',
  'CLOSED_HI_HAT',
  'OPEN_HI_HAT',
  'LOW_TOM',
  'MID_TOM',
  'HIGH_TOM',
  'CRASH_CYMBAL',
  'RIDE_CYMBAL',
  'PERCUSSION',
] as const;

export type DrumStemType = typeof DRUM_STEM_TYPES[number];

export type DrumMix = {
  [key in DrumStemType]?: number;
};

export interface SavedLyricEntry {
  lyrics: string;
  prompts: Prompt[]; // Store the active prompts at the time of saving
  timestamp: number; // ISO string or epoch time
}

export interface SavedVoiceRecording {
  id: string; // Unique ID, can be timestamp
  name: string;
  timestamp: number;
  audioBase64: string; // Audio data stored as a base64 string
  mimeType: string; // e.g., 'audio/webm;codecs=opus'
}
