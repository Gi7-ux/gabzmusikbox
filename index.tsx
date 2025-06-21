/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, LitElement, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { GoogleGenAI, type LiveMusicSession, type LiveMusicServerMessage } from '@google/genai';

import { decode, decodeAudioData } from './utils/audio'
import { throttle } from './utils/throttle'
import { AudioAnalyser } from './utils/AudioAnalyser';
import { MidiDispatcher } from './utils/MidiDispatcher';

import './components/WeightKnob';
import './components/PromptController';
import { PlayPauseButton } from './components/PlayPauseButton';
import { ToastMessage } from './components/ToastMessage';
import './components/DrumMixer';
import './components/LyricWriter';
import './components/VoiceRecorder';
import './components/HumAnalyzer'; 

import type { Prompt, PlaybackState, DrumMix, DrumStemType, SavedLyricEntry, SavedVoiceRecording } from './types';
import { DRUM_STEM_TYPES } from './types';

// Use API_KEY from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'lyria-realtime-exp';

const DEFAULT_PROMPTS = [
  { color: '#9900ff', text: 'Bossa Nova' },
  { color: '#5200ff', text: 'Chillwave' },
  { color: '#ff25f6', text: 'Drum and Bass' },
  { color: '#2af6de', text: 'Post Punk' },
  { color: '#ffdd28', text: 'Shoegaze' },
  { color: '#2af6de', text: 'Funk' },
  { color: '#9900ff', text: 'Chiptune' },
  { color: '#3dffab', text: 'Lush Strings' },
  { color: '#d8ff3e', text: 'Sparkling Arpeggios' },
  { color: '#d9b2ff', text: 'Staccato Rhythms' },
  { color: '#3dffab', text: 'Punchy Kick' },
  { color: '#ffdd28', text: 'Dubstep' },
  { color: '#ff25f6', text: 'K Pop' },
  { color: '#d8ff3e', text: 'Neo Soul' },
  { color: '#5200ff', text: 'Trip Hop' },
  { color: '#d9b2ff', text: 'Thrash' },
];

const DEFAULT_DRUM_MIX_SETTINGS: DrumMix = {
  KICK: 0.75,
  SNARE: 0.75,
  CLOSED_HI_HAT: 0.6,
  OPEN_HI_HAT: 0.5,
  LOW_TOM: 0.4,
  MID_TOM: 0.4,
  HIGH_TOM: 0.4,
  CRASH_CYMBAL: 0.5,
  RIDE_CYMBAL: 0.5,
  PERCUSSION: 0.5,
};

const LYRICS_STORAGE_KEY = 'gabriellasMusicBoxxxLyrics';
const VOICE_RECORDINGS_STORAGE_KEY = 'gabriellasMusicBoxxxVoiceRecordings';

const PLAY_ICON_SM = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
const DELETE_ICON_SM = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>`;
const VOCALS_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
const CLOSE_ICON_LG = svg`<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-sizing: border-box;
      position: relative;
      padding: 2vmin;
      overflow-y: auto; 
      background-color: #1a1a1a; /* Slightly lighter main background */
    }
    #background {
      will-change: background-image;
      position: fixed; 
      top:0;
      left:0;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111; /* Fallback if gradient doesn't show */
    }
    .app-title {
      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif; /* Placeholder, will be themed */
      font-size: clamp(2.8rem, 8vmin, 5.5rem); 
      font-weight: bold;
      text-align: center;
      margin: 2vmin 0 4vmin 0;
      color: #ff00ff; 
      text-shadow: /* Keep existing neon effect */
        0 0 5px #ff00ff,
        0 0 10px #ff00ff,
        0 0 15px #ff00ff,
        0 0 20px #9900ff, 
        0 0 35px #9900ff,
        0 0 40px #9900ff,
        0 0 50px #9900ff,
        0 0 75px #9900ff;
      letter-spacing: 0.05em;
      -webkit-font-smoothing: antialiased;
    }
    #main-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3.5vmin; 
      width: 100%;
      max-width: 95vmin; 
      margin-bottom: 3vmin; 
    }
    #grid {
      width: 80vmin;
      height: 80vmin;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5vmin;
    }
    prompt-controller {
      width: 100%;
    }
    drum-mixer, lyric-writer, hum-analyzer { /* Voice recorder removed from here */
      width: 100%;
      max-width: 80vmin; 
    }
    
    play-pause-button {
      position: relative;
      width: 18vmin; 
      height: 18vmin; 
      margin-top: 2vmin; 
    }
    #top-buttons { /* Renamed from #buttons for clarity */
      position: absolute; 
      top: 1.5vmin; 
      left: 1.5vmin; 
      padding: 0.8vmin;
      display: flex;
      gap: 1vmin; /* Increased gap slightly */
      z-index: 10; 
    }
    button, .icon-button {
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif; /* More playful font */
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: rgba(40, 40, 40, 0.7); /* Darker, slightly transparent */
      -webkit-font-smoothing: antialiased;
      border: 2px solid #ff00ff; /* Neon pink border */
      border-radius: 10px; /* More rounded */
      user-select: none;
      padding: 1vmin 1.5vmin; /* Adjusted padding */
      font-size: 1.8vmin; 
      transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      display: inline-flex; /* For aligning icon and text if any */
      align-items: center;
      gap: 0.5vmin;
    }
    button:hover:not(:disabled), .icon-button:hover:not(:disabled) {
       background-color: rgba(255, 0, 255, 0.3); /* Pink highlight */
       transform: translateY(-2px) scale(1.05); /* More playful hover */
       box-shadow: 0 4px 10px rgba(255, 0, 255, 0.4);
    }
    button:active:not(:disabled), .icon-button:active:not(:disabled) {
        background-color: rgba(255, 0, 255, 0.4);
        transform: translateY(0px) scale(1.02);
        box-shadow: 0 2px 5px rgba(255, 0, 255, 0.3);
    }
    button.active, .icon-button.active {
        background-color: #ff00ff;
        color: #111; /* Dark text on active pink */
        box-shadow: 0 0 12px rgba(255,0,255,0.7);
    }
    .icon-button svg { 
      width: 2.2vmin;
      height: 2.2vmin;
    }
    select {
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif;
      padding: 0.8vmin; 
      background: #fff;
      color: #000;
      border-radius: 8px; /* More rounded */
      border: 2px solid #ff00ff; /* Neon pink border */
      outline: none;
      cursor: pointer;
      font-size: 1.8vmin;
    }

    /* Common container styles for functional blocks */
    .content-block {
      width: 100%;
      max-width: 80vmin;
      margin: 2vmin 0;
      padding: 2.5vmin; /* Increased padding */
      box-sizing: border-box;
      background-color: rgba(20, 20, 20, 0.5); /* Slightly darker, more contrast */
      border-radius: 15px; /* More rounded */
      border: 1px solid rgba(255, 105, 180, 0.3); /* Softer pink border */
      color: #fff;
      font-family: 'Nunito', 'Google Sans', sans-serif; /* Playful but readable */
    }
    .content-block-title {
      font-size: 2.8vmin; /* Larger titles */
      font-weight: 700; /* Bolder titles */
      text-align: center;
      margin-bottom: 2.5vmin;
      color: #ffc0cb; /* Pinkish title color */
    }

    /* Slide-out Panel Styles */
    #slide-out-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.6); /* Darker overlay */
      z-index: 900; 
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease-in-out, visibility 0s 0.3s linear;
    }
    #slide-out-overlay.visible {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease-in-out;
    }
    #voice-recorder-panel {
      position: fixed;
      top: 0;
      right: -400px; /* Start off-screen, adjust width as needed */
      width: clamp(300px, 30vw, 380px); /* Responsive width */
      height: 100%;
      background-color: #282828; /* Dark panel background */
      box-shadow: -6px 0 20px rgba(0,0,0,0.4); /* Softer shadow */
      z-index: 901;
      transition: right 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); /* Smoother transition */
      padding: 2.5vmin;
      box-sizing: border-box;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2.5vmin; /* Increased gap for panel content */
      color: #fff;
    }
    #voice-recorder-panel.open {
      right: 0;
    }
    #close-voice-recorder-panel-btn {
      position: absolute;
      top: 1.5vmin;
      right: 1.5vmin;
      background: transparent;
      border: none;
      color: #aaa;
      padding: 0.5vmin;
      cursor: pointer;
    }
    #close-voice-recorder-panel-btn:hover {
      color: #fff;
      transform: scale(1.1);
    }
    #close-voice-recorder-panel-btn svg {
      width: 3.5vmin;
      height: 3.5vmin;
    }
    /* Adjustments for content blocks inside the panel */
    #voice-recorder-panel .content-block, 
    #voice-recorder-panel .saved-tracks-container {
      max-width: 100%; 
      margin: 0; 
      background-color: rgba(0,0,0,0.2); /* Slightly different bg for panel items */
      border-color: rgba(255,255,255,0.1);
    }

    /* Saved Tracks (shared by main and panel for now, might need panel specific if styles diverge) */
    .saved-tracks-container { 
      margin: 2vmin 0;
      padding: 2vmin; 
      box-sizing: border-box;
      background-color: rgba(20, 20, 20, 0.5); 
      border-radius: 15px; 
      border: 1px solid rgba(255, 105, 180, 0.3);
      color: #fff;
      font-family: 'Nunito', 'Google Sans', sans-serif;
    }
    .saved-tracks-title {
      font-size: 2.5vmin; 
      font-weight: 700;
      text-align: center;
      margin-bottom: 2vmin; 
      color: #ffc0cb;
    }
    .saved-tracks-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 25vmin; /* Adjust as needed, esp for panel */
      overflow-y: auto;
    }
    .saved-track-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.2vmin 1.5vmin; 
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 1.8vmin; 
    }
    .saved-track-item:last-child {
      border-bottom: none;
    }
    .saved-track-name {
      flex-grow: 1;
      margin-right: 1.5vmin; 
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .saved-track-actions button { /* Uses general button styles, but can be fine-tuned */
      margin-left: 0.8vmin; 
      padding: 0.8vmin; /* Smaller padding for these action buttons */
      border-radius: 8px; /* Consistent rounding */
    }
    .saved-track-actions .icon-button svg {
        width: 2.2vmin; 
        height: 2.2vmin;
    }
    #vocal-track-player {
      display: block;
      width: 100%;
      margin-top: 1.5vmin;
      height: 4.5vmin; 
    }
    #vocal-track-player:not([src]) {
      display: none;
    }

  `;

  private prompts: Map<string, Prompt>;
  private midiDispatcher: MidiDispatcher;
  private audioAnalyser: AudioAnalyser;

  @state() private playbackState: PlaybackState = 'stopped';
  @state() private drumMixSettings: DrumMix = { ...DEFAULT_DRUM_MIX_SETTINGS };
  @state() private currentLyrics: string = '';
  @state() private savedLyrics: SavedLyricEntry[] = [];
  @state() private savedVoiceRecordings: SavedVoiceRecording[] = [];
  @state() private isVoiceRecorderPanelOpen = false;


  private session: LiveMusicSession;
  private audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
  private outputNode: GainNode = this.audioContext.createGain();
  private nextStartTime = 0;
  private readonly bufferTime = 2; 

  @property({ type: Boolean }) private showMidi = false;
  @state() private audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  private audioLevelRafId: number | null = null;
  private connectionError = true;

  @query('play-pause-button') private playPauseButton!: PlayPauseButton;
  @query('toast-message') private toastMessage!: ToastMessage;
  @query('#vocal-track-player') private vocalTrackPlayerElement!: HTMLAudioElement; // May need to re-query if inside panel

  constructor(
    prompts: Map<string, Prompt>,
    midiDispatcher: MidiDispatcher,
  ) {
    super();
    this.prompts = prompts;
    this.midiDispatcher = midiDispatcher;
    this.audioAnalyser = new AudioAnalyser(this.audioContext);
    this.audioAnalyser.node.connect(this.audioContext.destination);
    this.outputNode.connect(this.audioAnalyser.node);
    this.updateAudioLevel = this.updateAudioLevel.bind(this);
    this.updateAudioLevel();
    this.loadSavedLyrics();
    this.loadSavedVoiceRecordings();

    this.addEventListener('error-message', (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        if (this.toastMessage) {
            this.toastMessage.show(customEvent.detail);
        } else {
            console.warn("Toast message component not ready for:", customEvent.detail);
        }
    });
    this.addEventListener('hum-suggestion', (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        if (this.toastMessage) {
            this.toastMessage.show(`Idea Copied: ${customEvent.detail}! Paste it in a Sound Shaper.`, 5000);
        }
    });
  }

  override async firstUpdated() {
    await this.connectToSession();
    await this.setSessionPrompts();
    if (!this.connectionError) {
       this.setSessionDrumMix();
    }
  }

  private async connectToSession() {
    try {
      this.session = await ai.live.music.connect({
        model: model,
        callbacks: {
          onmessage: async (e: LiveMusicServerMessage) => {
            if (e.setupComplete) {
              this.connectionError = false;
              await this.setSessionDrumMix();
            }
            if (e.filteredPrompt) {
              this.filteredPrompts = new Set([...this.filteredPrompts, e.filteredPrompt.text])
              this.toastMessage.show(e.filteredPrompt.filteredReason);
            }
            if (e.serverContent?.audioChunks !== undefined) {
              if (this.playbackState === 'paused' || this.playbackState === 'stopped') return;
              const audioBuffer = await decodeAudioData(
                decode(e.serverContent?.audioChunks[0].data),
                this.audioContext,
                48000,
                2,
              );
              const source = this.audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              if (this.nextStartTime === 0) {
                this.nextStartTime = this.audioContext.currentTime + this.bufferTime;
                setTimeout(() => {
                  this.playbackState = 'playing';
                }, this.bufferTime * 1000);
              }

              if (this.nextStartTime < this.audioContext.currentTime) {
                this.playbackState = 'loading';
                this.nextStartTime = 0;
                return;
              }
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.connectionError = true;
            this.stop();
            this.toastMessage.show('Connection error, please restart audio.');
          },
          onclose: (e: CloseEvent) => {
            this.connectionError = true;
            this.stop();
            this.toastMessage.show('Connection error, please restart audio.');
          },
        },
      });
    } catch (error) {
        this.connectionError = true;
        this.stop();
        this.toastMessage.show(`Failed to connect to music session: ${(error as Error).message || 'Unknown connection error'}`);
        console.error("Connection error:", error);
    }
  }

  private getPromptsToSend() {
    return Array.from(this.prompts.values())
      .filter((p) => {
        return !this.filteredPrompts.has(p.text) && p.weight !== 0;
      })
  }

  private setSessionPrompts = throttle(async () => {
    if (this.connectionError || !this.session) return;
    const promptsToSend = this.getPromptsToSend();
    if (promptsToSend.length === 0) {
      this.toastMessage.show('There needs to be one active prompt to play.')
      this.pause();
      return;
    }
    try {
      await this.session.setWeightedPrompts({
        weightedPrompts: promptsToSend,
      });
    } catch (e) {
      this.toastMessage.show((e as Error).message)
      this.pause();
    }
  }, 200);

  private setSessionDrumMix = throttle(async () => {
    if (this.connectionError || !this.session) {
        console.warn('Cannot set drum mix, session not available or connection error.');
        return;
    }
    const drumMixToSend: DrumMix = {};
    for (const stem of DRUM_STEM_TYPES) {
        drumMixToSend[stem] = this.drumMixSettings[stem] !== undefined ? this.drumMixSettings[stem] : 0.0;
    }

    try {
      await (this.session as any).setDrumMix({ drumMix: drumMixToSend });
      console.debug('Drum mix updated:', drumMixToSend);
    } catch (e) {
      this.toastMessage.show(`Error setting drum mix: ${(e as Error).message}`);
      console.error('setDrumMix error:', e);
    }
  }, 200);


  private handleDrumMixChanged(event: CustomEvent<DrumMix>) {
    this.drumMixSettings = event.detail;
    this.setSessionDrumMix(); 
  }

  private handleLyricsChanged(event: CustomEvent<string>) {
    this.currentLyrics = event.detail;
  }

  private handleSaveLyrics() {
    if (!this.currentLyrics.trim()) {
      this.toastMessage.show("Can't save empty lyrics!");
      return;
    }
    const activePrompts = Array.from(this.prompts.values()).filter(p => p.weight > 0);
    const newEntry: SavedLyricEntry = {
      lyrics: this.currentLyrics,
      prompts: activePrompts,
      timestamp: Date.now(),
    };
    this.savedLyrics = [...this.savedLyrics, newEntry];
    this.persistSavedLyrics();
    this.currentLyrics = ''; 
    (this.shadowRoot?.querySelector('lyric-writer') as any)?.requestUpdate(); 
    this.toastMessage.show('Lyrics saved! ✍️');
  }

  private handleClearLyrics() {
    this.currentLyrics = '';
    (this.shadowRoot?.querySelector('lyric-writer') as any)?.requestUpdate(); 
  }

  private persistSavedLyrics() {
    try {
      localStorage.setItem(LYRICS_STORAGE_KEY, JSON.stringify(this.savedLyrics));
    } catch (e) {
      console.error('Failed to save lyrics to localStorage:', e);
      this.toastMessage.show('Error saving lyrics to local storage.');
    }
  }

  private loadSavedLyrics() {
    try {
      const storedLyrics = localStorage.getItem(LYRICS_STORAGE_KEY);
      if (storedLyrics) {
        this.savedLyrics = JSON.parse(storedLyrics);
      }
    } catch (e) {
      console.error('Failed to load lyrics from localStorage:', e);
      this.savedLyrics = []; 
    }
  }

  // Voice Recording Handlers
  private async handleSaveVoiceRecording(event: CustomEvent<{ blob: Blob, name: string, mimeType: string }>) {
    const { blob, name, mimeType } = event.detail;
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const newRecording: SavedVoiceRecording = {
        id: `voice-${Date.now()}`,
        name: name,
        timestamp: Date.now(),
        audioBase64: base64data,
        mimeType: mimeType,
      };
      this.savedVoiceRecordings = [...this.savedVoiceRecordings, newRecording];
      this.persistSavedVoiceRecordings();
      this.toastMessage.show(`Vocal track "${name}" saved! 🎤`);
    };
    reader.onerror = () => {
        this.toastMessage.show('Error converting voice recording for saving.');
        console.error('FileReader error while converting blob to base64');
    };
  }

  private persistSavedVoiceRecordings() {
    try {
      localStorage.setItem(VOICE_RECORDINGS_STORAGE_KEY, JSON.stringify(this.savedVoiceRecordings));
    } catch (e) {
      console.error('Failed to save voice recordings to localStorage:', e);
      this.toastMessage.show('Error saving voice recordings to local storage. Storage might be full.');
    }
  }

  private loadSavedVoiceRecordings() {
    try {
      const storedRecordings = localStorage.getItem(VOICE_RECORDINGS_STORAGE_KEY);
      if (storedRecordings) {
        this.savedVoiceRecordings = JSON.parse(storedRecordings);
      }
    } catch (e) {
      console.error('Failed to load voice recordings from localStorage:', e);
      this.savedVoiceRecordings = [];
    }
  }

  private playSavedVoiceRecording(recording: SavedVoiceRecording) {
    // The vocalTrackPlayerElement might be inside the shadow DOM of the panel now.
    // A robust way is to query it when needed, or ensure it's always available if the panel is open.
    const player = this.shadowRoot?.querySelector('#vocal-track-player-panel') as HTMLAudioElement;
    if (player) {
        player.src = recording.audioBase64;
        player.play()
            .catch(e => {
                this.toastMessage.show(`Error playing vocal track: ${(e as Error).message}`);
                console.error("Error playing saved voice recording:", e);
            });
    } else {
        console.warn("Vocal track player in panel not found.");
    }
  }

  private deleteSavedVoiceRecording(recordingId: string) {
    const recordingName = this.savedVoiceRecordings.find(r => r.id === recordingId)?.name || 'Track';
    this.savedVoiceRecordings = this.savedVoiceRecordings.filter(r => r.id !== recordingId);
    this.persistSavedVoiceRecordings();
    this.toastMessage.show(`Vocal track "${recordingName}" deleted. 🗑️`);
    
    const player = this.shadowRoot?.querySelector('#vocal-track-player-panel') as HTMLAudioElement;
    if (player && player.src.startsWith('data:') && this.savedVoiceRecordings.every(r => r.audioBase64 !== player.src)) {
        player.src = ''; // Clear player if deleted track was loaded
    }
  }


  private updateAudioLevel() {
    this.audioLevelRafId = requestAnimationFrame(this.updateAudioLevel);
    this.audioLevel = this.audioAnalyser.getCurrentLevel();
  }

  private dispatchPromptsChange() {
    this.dispatchEvent(
      new CustomEvent('prompts-changed', { detail: this.prompts }),
    );
    return this.setSessionPrompts();
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const { promptId, text, weight, cc } = e.detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) {
      console.error('prompt not found', promptId);
      return;
    }

    prompt.text = text;
    prompt.weight = weight;
    prompt.cc = cc;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, prompt);

    this.setPrompts(newPrompts);
  }

  private setPrompts(newPrompts: Map<string, Prompt>) {
    this.prompts = newPrompts;
    this.requestUpdate();
    this.dispatchPromptsChange();
  }

  private readonly makeBackground = throttle(
    () => {
      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.6;
      const bg: string[] = [];
      [...this.prompts.values()].forEach((p, i) => {
        const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
        const alpha = Math.round(alphaPct * 0xff)
          .toString(16)
          .padStart(2, '0');
        const stop = p.weight / 2;
        const x = (i % 4) / 3;
        const y = Math.floor(i / 4) / 3;
        const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;
        bg.push(s);
      });
      return bg.join(', ');
    },
    30, 
  );

  private pause() {
    if (this.session && !this.connectionError) this.session.pause();
    this.playbackState = 'paused';
    this.outputNode.gain.setValueAtTime(this.outputNode.gain.value, this.audioContext.currentTime); 
    this.outputNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
    this.nextStartTime = 0;
    this.outputNode.disconnect();
    this.outputNode = this.audioContext.createGain();
    this.outputNode.gain.value = 0; 
    this.outputNode.connect(this.audioAnalyser.node); 
  }

  private play() {
    if (!this.session) {
        this.toastMessage.show('Session not ready. Please wait or try reconnecting.');
        return;
    }
    const promptsToSend = this.getPromptsToSend();
    if (promptsToSend.length === 0) {
      this.toastMessage.show('Add some sound flavor! Turn up a knob to play music.')
      this.pause();
      return;
    }

    this.audioContext.resume();
    if (this.session && !this.connectionError) this.session.play();
    this.playbackState = 'loading';
    this.outputNode.gain.setValueAtTime(this.outputNode.gain.value, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.1);
  }

  private stop() {
    if (this.session && !this.connectionError) this.session.stop();
    this.playbackState = 'stopped';
    this.nextStartTime = 0;
  }

  private async handlePlayPause() {
    if (this.playbackState === 'playing') {
      this.pause();
    } else if (this.playbackState === 'paused' || this.playbackState === 'stopped') {
      if (this.connectionError || !this.session) {
        this.toastMessage.show('Reconnecting Lyria session...');
        await this.connectToSession(); 
        if (!this.connectionError && this.session) {
            await this.setSessionPrompts(); 
            await this.setSessionDrumMix(); 
        } else {
            this.toastMessage.show('Failed to reconnect Lyria. Please check console.');
            this.playbackState = 'stopped'; 
            return; 
        }
      }
      this.play();
    } else if (this.playbackState === 'loading') { 
      this.stop();
    }
  }

  private async toggleShowMidi() {
    this.showMidi = !this.showMidi;
    if (!this.showMidi) return;
    const inputIds = await this.midiDispatcher.getMidiAccess();
    this.midiInputIds = inputIds;
    this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private resetAll() {
    this.setPrompts(buildDefaultPrompts());
    this.drumMixSettings = { ...DEFAULT_DRUM_MIX_SETTINGS };
    this.setSessionDrumMix();
    this.currentLyrics = ''; 
    (this.shadowRoot?.querySelector('lyric-writer')as any)?.requestUpdate();
    this.toastMessage.show('✨ Fresh Start! All sound shapers and drum mix reset. Lyrics pad cleared.');
  }

  private toggleVoiceRecorderPanel() {
    this.isVoiceRecorderPanelOpen = !this.isVoiceRecorderPanelOpen;
  }

  override render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });
    return html`
      <div id="background" style=${bg}></div>
      <h1 class="app-title">GABRIELLAS MUISIC BOXXXXX</h1>
      
      <div id="top-buttons">
        <button
          @click=${this.toggleShowMidi}
          class=${this.showMidi ? 'active' : ''}
          aria-pressed=${this.showMidi}
          aria-label="Toggle MIDI controls"
          title="MIDI Settings"
          >🎹 MIDI</button
        >
        <select
          @change=${this.handleMidiInputChange}
          .value=${this.activeMidiInputId || ''}
          style=${this.showMidi ? '' : 'display: none'} /* Changed to display none for better layout */
          aria-label="Select MIDI input device"
          aria-hidden=${!this.showMidi}>
          ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id) || `Device ${id.substring(0,6)}`}
                  </option>`,
        )
        : html`<option value="">No MIDI devices found</option>`}
        </select>
        <button @click=${this.resetAll} aria-label="Reset all prompts and drum mix" title="✨ Fresh Start">✨ Fresh Start</button>
        <button 
            @click=${this.toggleVoiceRecorderPanel} 
            class="icon-button ${this.isVoiceRecorderPanelOpen ? 'active' : ''}" 
            aria-label="Open Voice Recorder Panel"
            title="🎤 My Vocals"
        >
            ${VOCALS_ICON} My Vocals
        </button>
      </div>

      <div id="main-content">
        <div id="grid">${this.renderPrompts()}</div>
        <drum-mixer 
            class="content-block"
            .drumMix=${this.drumMixSettings}
            @drum-mix-changed=${this.handleDrumMixChanged}>
        </drum-mixer>
        <lyric-writer
            class="content-block"
            .lyrics=${this.currentLyrics}
            @lyrics-changed=${this.handleLyricsChanged}
            @save-lyrics=${this.handleSaveLyrics}
            @clear-lyrics=${this.handleClearLyrics}
        ></lyric-writer>
        <hum-analyzer 
            class="content-block"
            .googleGenAI=${ai}
        ></hum-analyzer>
        
        <play-pause-button 
            .playbackState=${this.playbackState} 
            @click=${this.handlePlayPause}
            aria-label=${this.playbackState === 'playing' ? 'Pause music' : 'Play music'}>
        </play-pause-button>
      </div>

      ${this.isVoiceRecorderPanelOpen ? html`
        <div id="slide-out-overlay" class="visible" @click=${this.toggleVoiceRecorderPanel}></div>
        <div id="voice-recorder-panel" class="slide-out-panel open">
          <button id="close-voice-recorder-panel-btn" @click=${this.toggleVoiceRecorderPanel} aria-label="Close Vocals Panel" title="Close">
            ${CLOSE_ICON_LG}
          </button>
          
          <voice-recorder
              class="content-block"
              @save-voice-recording=${this.handleSaveVoiceRecording}
          ></voice-recorder>

          ${this.savedVoiceRecordings.length > 0 ? html`
            <div class="saved-tracks-container content-block">
                <div class="saved-tracks-title">My Vocal Takes 🎙️</div>
                <audio id="vocal-track-player-panel" controls></audio> <!-- Player specific to panel -->
                <ul class="saved-tracks-list">
                    ${this.savedVoiceRecordings.map(rec => html`
                        <li class="saved-track-item">
                            <span class="saved-track-name" title=${rec.name}>${rec.name}</span>
                            <div class="saved-track-actions">
                                <button class="icon-button" @click=${() => this.playSavedVoiceRecording(rec)} aria-label="Play ${rec.name}" title="Play ${rec.name}">${PLAY_ICON_SM}</button>
                                <button class.icon-button" @click=${() => this.deleteSavedVoiceRecording(rec.id)} aria-label="Delete ${rec.name}" title="Delete ${rec.name}">${DELETE_ICON_SM}</button>
                            </div>
                        </li>
                    `)}
                </ul>
            </div>
          ` : html`<div class="content-block" style="text-align: center; color: #aaa;">Record some vocals and they'll show up here!</div>`}
        </div>
      ` : ''}

      <toast-message role="alert"></toast-message>`;
  }

  private renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}

function main(parent: HTMLElement) {
  const midiDispatcher = new MidiDispatcher();
  const initialPrompts = getInitialPrompts();
  const pdjMidi = new PromptDjMidi(
    initialPrompts,
    midiDispatcher,
  );

  pdjMidi.addEventListener('prompts-changed', (e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    setStoredPrompts(customEvent.detail);
  });

  parent.appendChild(pdjMidi);
}

function getInitialPrompts(): Map<string, Prompt> {
  const { localStorage } = window;
  const storedPrompts = localStorage.getItem('prompts');

  if (storedPrompts) {
    try {
      const parsedData = JSON.parse(storedPrompts);
      if (Array.isArray(parsedData)) {
          const promptsArray = parsedData as Prompt[];
          if (promptsArray.every(p => p && typeof p.promptId === 'string')) {
            return new Map(promptsArray.map((prompt) => [prompt.promptId, prompt]));
          }
      }
      console.warn('Stored prompts format error, using defaults.');
    } catch (e) {
      console.error('Failed to parse stored prompts, using default prompts', e);
    }
  }
  return buildDefaultPrompts();
}

function buildDefaultPrompts() {
  const startOn = [...DEFAULT_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
    });
  }
  return prompts;
}

function setStoredPrompts(prompts: Map<string, Prompt>) {
  try {
    const storedPrompts = JSON.stringify([...prompts.values()]);
    const { localStorage } = window;
    localStorage.setItem('prompts', storedPrompts);
  } catch (e) {
    console.error('Failed to save prompts to localStorage', e);
  }
}

main(document.body);