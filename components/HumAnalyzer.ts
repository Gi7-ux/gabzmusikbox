/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement, svg } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai'; 

const MIC_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
const STOP_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 18h12V6H6v12zM8 8h8v8H8V8z"/></svg>`;
const ANALYZE_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M20.71 19.29l-3.4-3.39A7.95 7.95 0 0019 10a8 8 0 10-8 8 7.95 7.95 0 005.9-2.29l3.39 3.4a.996.996 0 101.41-1.42zM4 10a6 6 0 1112 0A6 6 0 014 10z"/><path d="M10.27 15.09l-1.42 1.42C7.29 14.96 6 12.69 6 10H4c0 3.31 1.73 6.17 4.22 7.56l.96-1.6c-.66-.39-1.25-.89-1.74-1.49l.01-.01c.01 0 .01 0 0 0z" fill-rule="evenodd"/></svg>`; // Magic wand / Sparkle icon could be better
const COPY_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;


@customElement('hum-analyzer')
export class HumAnalyzer extends LitElement {
  static override styles = css`
    /* :host will inherit .content-block styles from index.tsx */
    .controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5vmin;
      margin-bottom: 2vmin; /* Increased margin */
    }
    button { 
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif;
      font-weight: 700; /* Bolder buttons */
      cursor: pointer;
      color: #fff;
      background: rgba(40,40,40, 0.8); /* Darker, slightly more opaque */
      border: 2px solid #00ffff; /* Cyan border for this section */
      border-radius: 12px; /* More rounded */
      user-select: none;
      padding: 1.2vmin 1.8vmin; /* More padding */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1vmin; /* Increased gap */
      transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      font-size: 1.9vmin; /* Larger font */
    }
    button svg {
      width: 2.5vmin; /* Larger icons */
      height: 2.5vmin;
    }
    button:hover:not(:disabled) {
      background: rgba(0, 255, 255, 0.3); /* Cyan highlight */
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.4);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: rgba(0,150,150,0.4);
      background: rgba(80,80,80,0.5);
    }
    button.record-active {
      background-color: #00ffff; 
      border-color: #00ffff;
      color: #111; /* Dark text on active cyan */
      animation: pulse-cyan 1.2s infinite;
    }
    @keyframes pulse-cyan {
      0% { box-shadow: 0 0 5px #00ffff; }
      50% { box-shadow: 0 0 15px #00ffff, 0 0 20px #00dddd; }
      100% { box-shadow: 0 0 5px #00ffff; }
    }
    .status {
      text-align: center;
      font-size: 1.7vmin; /* Slightly larger */
      min-height: 2.2vmin; 
      margin-bottom: 1.2vmin;
      color: #ddd;
      font-weight: 500;
    }
    .hum-player {
      display: block;
      width: 100%;
      margin: 1.2vmin auto 1.8vmin auto;
      height: 4.5vmin;
    }
    .hum-player:not([src]) {
        display: none; 
    }
    .suggestions-area {
        margin-top: 2vmin;
        padding: 1.5vmin;
        background-color: rgba(0,0,0,0.25);
        border-radius: 10px;
        border: 1px solid rgba(0,200,200,0.3);
    }
    .suggestions-title {
        font-size: 2vmin; /* Larger */
        font-weight: 600; /* Bolder */
        margin-bottom: 1.2vmin;
        color: #00ffff; /* Cyan title */
    }
    .suggestions-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1vmin;
    }
    .suggestion-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1vmin 1.2vmin;
        background-color: rgba(0, 50, 50, 0.3); /* Dark cyan tint */
        border-radius: 8px;
        font-size: 1.7vmin;
        color: #e0e0e0;
        border: 1px solid rgba(0,100,100,0.4);
    }
    .suggestion-item button { /* Copy button */
        padding: 0.6vmin;
        background: rgba(0, 200, 200, 0.2);
        border-radius: 6px;
        border-width: 1px;
        border-color: rgba(0,255,255,0.5);
    }
    .suggestion-item button svg {
        width: 2vmin;
        height: 2vmin;
    }
    .suggestion-item button:hover {
        background: rgba(0,255,255,0.4);
    }
  `;

  @property({ type: Object }) googleGenAI!: GoogleGenAI; 

  @state() private isRecordingHum = false;
  @state() private humAudioBlob: Blob | null = null;
  @state() private humAudioURL: string | null = null;
  @state() private suggestedPrompts: string[] = [];
  @state() private isLoadingSuggestions = false;
  @state() private statusMessage = 'Tap 🎤 to hum a song idea!';
  
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  @query('#hum-audio-player') private humPlayerElement!: HTMLAudioElement;

  private async requestMicrophonePermission(): Promise<boolean> {
    if (this.mediaStream) return true;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('Error accessing microphone for hum:', err);
      this.statusMessage = 'Aww, mic permission denied! Please enable it in browser settings.';
      this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
      return false;
    }
  }

  async toggleHumRecording() {
    if (this.isRecordingHum) {
      this.stopHumRecording();
    } else {
      await this.startHumRecording();
    }
  }

  private async startHumRecording() {
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission || !this.mediaStream) return;

    this.isRecordingHum = true;
    this.humAudioBlob = null;
    this.humAudioURL = null;
    if (this.humPlayerElement) this.humPlayerElement.src = '';
    this.audioChunks = [];
    this.suggestedPrompts = [];
    this.statusMessage = 'Listening to your hum... 🎶';

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';


    try {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
    } catch (e) {
        console.error("Failed to create MediaRecorder for hum:", e);
        this.statusMessage = "Oh no! Can't start hum recording right now.";
        this.isRecordingHum = false;
        this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
        return;
    }
    

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      this.isRecordingHum = false;
      if (this.audioChunks.length === 0) {
        this.statusMessage = "Didn't catch that hum. Try again?";
        return;
      }
      this.humAudioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      this.humAudioURL = URL.createObjectURL(this.humAudioBlob);
      this.statusMessage = 'Hum recorded! Ready for some magic? ✨';
      if (this.humPlayerElement) this.humPlayerElement.src = this.humAudioURL;
    };
    
    this.mediaRecorder.onerror = (event) => {
        console.error('Hum MediaRecorder error:', event);
        this.isRecordingHum = false;
        this.statusMessage = `Hum recording error: ${(event as any).error?.message || 'Unknown'}`;
        this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
    };

    this.mediaRecorder.start();
  }

  private stopHumRecording() {
    if (this.mediaRecorder && this.isRecordingHum) {
      this.mediaRecorder.stop();
    }
  }

  async getMusicIdeasFromHum() {
    if (!this.humAudioBlob) {
      this.statusMessage = 'Hum something first, silly! 😉';
      this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
      return;
    }
    if (this.isLoadingSuggestions) return;

    this.isLoadingSuggestions = true;
    this.statusMessage = 'Thinking cap on... turning your hum into music ideas! 🤔';
    this.suggestedPrompts = [];

    try {
      const reader = new FileReader();
      reader.readAsDataURL(this.humAudioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1]; 

        const audioPart = {
          inlineData: {
            mimeType: this.humAudioBlob!.type,
            data: base64Audio,
          },
        };
        
        const textPrompt = `Analyze this hum. Describe its melody, rhythm, and mood. Suggest 3-5 short musical phrases, keywords, or genre tags for a backing track. Return as a JSON array of strings. Example: ["upbeat folk guitar", "chill synthwave beat", "sad piano melody"]. Output ONLY the JSON array.`;
        
        const textPart = { text: textPrompt };

        const response: GenerateContentResponse = await this.googleGenAI.models.generateContent({
          model: 'gemini-2.5-flash-preview-04-17', 
          contents: { parts: [audioPart, textPart] },
          config: { responseMimeType: "application/json" }
        });

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }

        try {
          const parsedSuggestions = JSON.parse(jsonStr);
          if (Array.isArray(parsedSuggestions) && parsedSuggestions.every(s => typeof s === 'string')) {
            this.suggestedPrompts = parsedSuggestions;
            this.statusMessage = 'Voilà! Some cool ideas based on your hum:';
          } else {
            throw new Error('Response is not a JSON array of strings.');
          }
        } catch (e) {
          console.error('Failed to parse JSON suggestions:', e, "Raw text:", response.text);
          this.statusMessage = "AI's a bit shy today. Couldn't get suggestions. Try humming again?";
          if(response.text.length > 0 && response.text.length < 200) { 
            this.suggestedPrompts = [`AI said: "${response.text}" (Hmm, not quite right!)`];
          } else {
             this.suggestedPrompts = ["AI analysis didn't quite work this time."];
          }
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        this.statusMessage = 'Error with the hum audio. Please try again!';
        this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
        this.isLoadingSuggestions = false;
      };
    } catch (e) {
      console.error('Error getting music ideas:', e);
      this.statusMessage = `Oops, error analyzing hum: ${(e as Error).message}`;
      this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
    } finally {
      this.isLoadingSuggestions = false;
    }
  }
  
  private copySuggestion(suggestionText: string) {
    navigator.clipboard.writeText(suggestionText).then(() => {
        this.dispatchEvent(new CustomEvent('hum-suggestion', {
            detail: suggestionText,
            bubbles: true,
            composed: true
        }));
    }).catch(err => {
        console.error('Failed to copy suggestion: ', err);
        this.dispatchEvent(new CustomEvent('error-message', { detail: "Couldn't copy idea. Select & copy manually?", bubbles: true, composed: true }));
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.humAudioURL) {
      URL.revokeObjectURL(this.humAudioURL);
    }
  }

  override render() {
    return html`
      <div class="content-block-title">🎶 Hum-to-Music Ideas!</div>
      <div class="status">${this.statusMessage}</div>
      <div class="controls">
        <button
          @click=${this.toggleHumRecording}
          class=${this.isRecordingHum ? 'record-active' : ''}
          aria-label=${this.isRecordingHum ? 'Stop hum recording' : 'Start hum recording'}
          title=${this.isRecordingHum ? 'Stop Hum Recording' : 'Start Hum Recording'}
        >
          ${this.isRecordingHum ? STOP_ICON : MIC_ICON}
          ${this.isRecordingHum ? 'Stop' : 'Record Hum'}
        </button>
        <button
          @click=${this.getMusicIdeasFromHum}
          ?disabled=${!this.humAudioBlob || this.isLoadingSuggestions || this.isRecordingHum}
          aria-label="Get musical ideas from hum"
          title="Turn Hum into Music Ideas!"
        >
          ${ANALYZE_ICON}
          ${this.isLoadingSuggestions ? 'Brewing Ideas...' : 'Get Ideas!'}
        </button>
      </div>
      <audio id="hum-audio-player" class="hum-player" controls .src=${this.humAudioURL || ''}></audio>

      ${this.suggestedPrompts.length > 0 ? html`
        <div class="suggestions-area">
          <div class="suggestions-title">Try these vibes in the Sound Shapers above:</div>
          <ul class="suggestions-list">
            ${this.suggestedPrompts.map(prompt => html`
              <li class="suggestion-item">
                <span>${prompt}</span>
                <button @click=${() => this.copySuggestion(prompt)} title="Copy Idea" aria-label="Copy music idea: ${prompt}">
                    ${COPY_ICON} Copy
                </button>
              </li>
            `)}
          </ul>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hum-analyzer': HumAnalyzer;
  }
}
