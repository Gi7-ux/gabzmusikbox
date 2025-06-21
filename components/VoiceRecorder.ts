/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement, svg } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

const MIC_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
const STOP_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 18h12V6H6v12zM8 8h8v8H8V8z"/></svg>`;
const PLAY_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
const SAVE_ICON = svg`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z"/></svg>`;


@customElement('voice-recorder')
export class VoiceRecorder extends LitElement {
  static override styles = css`
    /* Host inherits .content-block styles from parent (either main page or panel) */

    .controls {
      display: flex;
      justify-content: space-around; /* Space out buttons more in panel */
      align-items: center;
      gap: 1.5vmin; 
      margin-bottom: 2vmin; 
    }
    button {
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: rgba(255, 255, 255, 0.1); 
      border: 2px solid #ff00ff; /* Neon Pink border */
      border-radius: 50%; /* Keep circular for record buttons */
      user-select: none;
      padding: 1.2vmin; /* Adjusted padding */
      display: flex;
      align-items: center;
      justify-content: center;
      width: 7vmin; 
      height: 7vmin; 
      transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    }
    button svg {
      width: 3.2vmin; /* Slightly smaller icons to fit new padding */
      height: 3.2vmin;
    }
    button:hover:not(:disabled) {
      background: rgba(255, 0, 255, 0.3); /* Pink highlight */
      transform: scale(1.1); 
      box-shadow: 0 0 12px rgba(255,0,255,0.5);
    }
    button:active:not(:disabled) {
      transform: scale(1.05);
      background: rgba(255, 0, 255, 0.4);
    }
    button:disabled {
      opacity: 0.4; 
      cursor: not-allowed;
      background: rgba(100, 100, 100, 0.2); /* Greyer disabled */
      border-color: rgba(150, 150, 150, 0.3);
    }
    button.record-active {
      background-color: #ff007f; /* Deeper pink for active recording */
      border-color: #ff007f;
      animation: pulse 1.2s infinite;
      box-shadow: 0 0 10px #ff007f, 0 0 15px #ff007f;
    }
    @keyframes pulse { /* Keep pulse but adjust color if needed */
      0% { box-shadow: 0 0 5px #ff007f, 0 0 8px #ff007f; transform: scale(1); }
      50% { box-shadow: 0 0 15px #ff007f, 0 0 25px #ff007f; transform: scale(1.05); }
      100% { box-shadow: 0 0 5px #ff007f, 0 0 8px #ff007f; transform: scale(1); }
    }
    .status {
      text-align: center;
      font-size: 1.8vmin; 
      font-weight: 500; 
      min-height: 2.5vmin; 
      margin-bottom: 1.5vmin;
      color: #f0f0f0; /* Brighter status text */
    }
    .preview-player {
      display: block;
      width: 100%; /* Take full width of panel */
      margin: 1.5vmin auto 0 auto;
      height: 5vmin; 
    }
    .preview-player:not([src]) {
        display: none; 
    }
  `;

  @state() private isRecording = false;
  @state() private hasRecording = false;
  @state() private recordedAudioURL: string | null = null;
  @state() private statusMessage = 'Hit 🎤 to record your voice!';
  @state() private mediaStream: MediaStream | null = null;


  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordedBlob: Blob | null = null;

  @query('#preview-audio') private previewAudioElement!: HTMLAudioElement;


  private async requestMicrophonePermission() {
    if (this.mediaStream) return true; 
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.statusMessage = 'Microphone ready! 🎉';
      return true;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      this.statusMessage = 'Oops! Mic access denied. Enable it in browser settings?';
      this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
      return false;
    }
  }

  async startRecording() {
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission || !this.mediaStream) {
      return;
    }

    this.isRecording = true;
    this.hasRecording = false;
    this.recordedAudioURL = null;
    if (this.previewAudioElement) this.previewAudioElement.src = '';
    this.recordedBlob = null;
    this.audioChunks = [];
    this.statusMessage = 'Recording your awesome voice... 🎙️';

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm'; 
             if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; 
            }
        }
    }
    
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
    } catch (e) {
        console.error("Failed to create MediaRecorder:", e);
        this.statusMessage = "Hmm, can't start recording right now.";
        this.isRecording = false;
        this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
        return;
    }


    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      if (this.audioChunks.length === 0) {
        this.statusMessage = "No sound recorded. Try again?";
        this.hasRecording = false;
        return;
      }
      this.recordedBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      this.recordedAudioURL = URL.createObjectURL(this.recordedBlob);
      this.hasRecording = true;
      this.statusMessage = 'Done! Preview or Save your track. ✨';
      if (this.previewAudioElement) {
        this.previewAudioElement.src = this.recordedAudioURL;
      }
    };
    
    this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
        this.hasRecording = false;
        this.statusMessage = `Recording error: ${(event as any).error?.message || 'Unknown error'}`;
        this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
    };

    this.mediaRecorder.start();
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  playPreview() {
    if (this.previewAudioElement && this.recordedAudioURL) {
      this.previewAudioElement.play();
    }
  }

  saveRecording() {
    if (this.recordedBlob) {
      const defaultName = `My Vocal Take ${new Date().toLocaleTimeString()}`;
      this.dispatchEvent(new CustomEvent('save-voice-recording', {
        detail: { blob: this.recordedBlob, name: defaultName, mimeType: this.recordedBlob.type },
        bubbles: true,
        composed: true
      }));
      this.statusMessage = `"${defaultName}" saved! 🌟`;
      this.hasRecording = false; 
      this.recordedAudioURL = null;
      if (this.previewAudioElement) this.previewAudioElement.src = '';
      this.recordedBlob = null;
    } else {
      this.statusMessage = 'Nothing to save yet!';
      this.dispatchEvent(new CustomEvent('error-message', { detail: this.statusMessage, bubbles: true, composed: true }));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.recordedAudioURL) {
      URL.revokeObjectURL(this.recordedAudioURL);
    }
  }

  override render() {
    // Title is now part of the parent panel in index.tsx
    return html`
      <div class="content-block-title">🎤 Record Your Voice!</div>
      <div class="status">${this.statusMessage}</div>
      <div class="controls">
        <button
          @click=${this.startRecording}
          ?disabled=${this.isRecording}
          class=${this.isRecording ? 'record-active' : ''}
          aria-label="Start recording"
          title="Start Recording"
        >
          ${MIC_ICON}
        </button>
        <button
          @click=${this.stopRecording}
          ?disabled=${!this.isRecording}
          aria-label="Stop recording"
          title="Stop Recording"
        >
          ${STOP_ICON}
        </button>
        <button
          @click=${this.playPreview}
          ?disabled=${!this.hasRecording || this.isRecording}
          aria-label="Play current recording"
          title="Play Recording"
        >
          ${PLAY_ICON}
        </button>
        <button
          @click=${this.saveRecording}
          ?disabled=${!this.hasRecording || this.isRecording}
          aria-label="Save current recording"
          title="Save Recording"
        >
          ${SAVE_ICON}
        </button>
      </div>
      <audio id="preview-audio" class="preview-player" controls .src=${this.recordedAudioURL || ''}></audio>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'voice-recorder': VoiceRecorder;
  }
}
