/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lyric-writer')
export class LyricWriter extends LitElement {
  static override styles = css`
    /* :host will inherit .content-block styles from index.tsx */
    /* .title class is now .content-block-title from index.tsx */

    textarea {
      width: 100%;
      height: 18vmin; 
      min-height: 100px;
      padding: 1.5vmin; 
      box-sizing: border-box;
      border-radius: 10px; /* More rounded */
      border: 1px solid rgba(255, 105, 180, 0.5); /* Softer pink border */
      background-color: rgba(30, 30, 30, 0.6); /* Slightly more opaque, darker */
      color: #fff;
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif; /* Playful font */
      font-size: 2vmin; 
      margin-bottom: 1.5vmin; 
      resize: vertical;
      line-height: 1.5;
    }
    textarea:focus {
      outline: none;
      border-color: #ff00ff; 
      box-shadow: 0 0 10px #ff00ff, 0 0 5px #ff00ff inset; /* Inner glow too */
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 1.5vmin; 
    }
    button { /* General button style from index.tsx will be mostly inherited or can be overridden */
      font-family: 'Nunito', 'Arial Rounded MT Bold', sans-serif;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: rgba(40, 40, 40, 0.7);
      border: 2px solid #ff00ff;
      border-radius: 10px;
      user-select: none;
      padding: 1vmin 2vmin; 
      font-size: 1.8vmin; 
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    }
    button:hover:not(:disabled) {
      background: rgba(255, 0, 255, 0.3);
      color: #fff; /* Keep text white on pink hover for these specific buttons */
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 4px 10px rgba(255, 0, 255, 0.4);
    }
     button:active:not(:disabled) {
      transform: translateY(0px) scale(1.02);
      box-shadow: 0 2px 5px rgba(255, 0, 255, 0.3);
    }
    button.primary { /* For "Save Lyrics" */
      background-color: #ff007f; /* Brighter, more distinct pink */
      border-color: #ff007f;
      color: #fff;
    }
    button.primary:hover:not(:disabled) {
      background-color: #ff3399; /* Lighter shade for hover */
      border-color: #ff3399;
      color: #fff;
    }
  `;

  @property({ type: String }) lyrics = '';

  private handleInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.lyrics = textarea.value;
    this.dispatchEvent(
      new CustomEvent('lyrics-changed', { detail: this.lyrics }),
    );
  }

  private handleSave() {
    this.dispatchEvent(new CustomEvent('save-lyrics'));
  }

  private handleClear() {
    this.dispatchEvent(new CustomEvent('clear-lyrics'));
  }

  override render() {
    return html`
      <div class="content-block-title">✍️ My Song Lyrics</div>
      <textarea
        .value=${this.lyrics}
        @input=${this.handleInput}
        placeholder="Type your amazing song lyrics here... 🎵"
        aria-label="Lyric input area"
      ></textarea>
      <div class="buttons">
        <button @click=${this.handleClear} aria-label="Clear lyric input">Clear All</button>
        <button class="primary" @click=${this.handleSave} aria-label="Save current lyrics">Save These Lyrics!</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lyric-writer': LyricWriter;
  }
}
