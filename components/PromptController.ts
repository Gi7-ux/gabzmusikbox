/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import type { WeightKnob } from './WeightKnob'; // Will be effectively "PowerKnob"
import type { MidiDispatcher } from '../utils/MidiDispatcher';
import type { Prompt, ControlChange } from '../types';

/** A single prompt input associated with a MIDI CC. */
@customElement('prompt-controller')
export class PromptController extends LitElement {
  static override styles = css`
    .prompt {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.5vmin; /* Add a little padding */
      box-sizing: border-box;
      background-color: rgba(255,255,255,0.03); /* Very subtle background for each controller */
      border-radius: 10px; /* Rounded corners for the controller box */
    }
    weight-knob { /* This is the "Power Knob" */
      width: 75%; /* Slightly larger knob */
      flex-shrink: 0;
      margin-bottom: 0.5vmin; /* Space between knob and text */
    }
    #midi-link-info { /* Renamed from #midi */
      font-family: 'Nunito', 'Arial Rounded MT Bold', monospace; /* More playful monospace fallback */
      text-align: center;
      font-size: 1.4vmin; /* Slightly smaller, less prominent */
      border: 1.5px solid #aaa; /* Softer border */
      border-radius: 5px;
      padding: 3px 6px;
      color: #ccc; /* Lighter text */
      background: rgba(0,0,0,0.2);
      cursor: pointer;
      visibility: hidden; /* Still hidden by default */
      user-select: none;
      margin-top: 0.5vmin;
      transition: all 0.2s ease;
      .learn-mode & {
        color: #ff9800; /* Orange for learn mode */
        border-color: #ff9800;
        box-shadow: 0 0 5px #ff9800;
      }
      .show-cc & { /* This class is now "show-midi-links" or similar */
        visibility: visible;
      }
    }
    #text {
      font-family: 'Nunito', 'Google Sans', sans-serif; /* Playful but readable */
      font-weight: 600; /* Bolder text */
      font-size: 1.9vmin; /* Slightly larger */
      max-width: 95%; /* Ensure padding is visible */
      min-width: 2vmin;
      padding: 0.4em 0.6em; /* More padding */
      margin-top: 0.5vmin;
      flex-shrink: 0;
      border-radius: 8px; /* More rounded */
      text-align: center;
      white-space: wrap;
      word-break: break-word;
      overflow: hidden;
      border: none; /* Remove border, bg is enough */
      outline: none;
      -webkit-font-smoothing: antialiased;
      background: rgba(0,0,0,0.3); /* Slightly darker bg for text */
      color: #fff;
      transition: box-shadow 0.2s ease, background-color 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3); /* Subtle shadow */
    }
    #text:focus {
        background: rgba(0,0,0,0.5);
        box-shadow: 0 0 8px var(--prompt-color, #ff00ff), 0 2px 5px rgba(0,0,0,0.5); /* Use prompt color for focus */
    }
    :host([filtered=true]) #text {
      background: #da2000; /* Keep filtered style */
      box-shadow: 0 0 8px #da2000;
    }
    @media only screen and (max-width: 600px) { /* Keep responsive adjustments */
      #text {
        font-size: 2.4vmin;
      }
      weight-knob {
        width: 65%;
      }
    }
  `;

  @property({ type: String }) promptId = '';
  @property({ type: String }) text = '';
  @property({ type: Number }) weight = 0; // This is the "Power"
  @property({ type: String }) color = '';

  @property({ type: Number }) cc = 0; // MIDI Control Change number
  @property({ type: Number }) channel = 0; // MIDI Channel (Not currently used for dispatch logic)

  @property({ type: Boolean }) learnMode = false; // For linking MIDI
  @property({ type: Boolean }) showCC = false; // Renamed to showMidiLinks in parent

  @query('weight-knob') private weightInput!: WeightKnob; // This is the PowerKnob
  @query('#text') private textInput!: HTMLInputElement;

  @property({ type: Object })
  midiDispatcher: MidiDispatcher | null = null;

  @property({ type: Number }) audioLevel = 0;

  private lastValidText!: string;

  override connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e: Event) => {
      const customEvent = e as CustomEvent<ControlChange>;
      const { channel, cc, value } = customEvent.detail;
      if (this.learnMode) {
        this.cc = cc;
        // this.channel = channel; // Store channel if needed in future
        this.learnMode = false;
        this.dispatchPromptChange();
      } else if (cc === this.cc) {
        this.weight = (value / 127) * 2; // Max weight is 2
        this.dispatchPromptChange();
      }
    });
  }

  override firstUpdated() {
    this.textInput.setAttribute('contenteditable', 'plaintext-only');
    this.textInput.textContent = this.text || "Sound Idea!"; // Default placeholder
    this.lastValidText = this.text || "Sound Idea!";
    this.textInput.style.setProperty('--prompt-color', this.color); // For focus glow
    this.updatePlaceholder();
  }

  update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showCC') && !this.showCC) {
      this.learnMode = false;
    }
    if (changedProperties.has('text')) {
      if (this.textInput) { // Ensure textInput is available
          this.textInput.textContent = this.text;
          this.updatePlaceholder();
      }
    }
    if (changedProperties.has('color') && this.textInput) {
        this.textInput.style.setProperty('--prompt-color', this.color);
    }
    super.update(changedProperties);
  }
  
  private updatePlaceholder() {
    if (this.textInput && !this.textInput.textContent?.trim()) {
        this.textInput.textContent = "Type a sound idea!"; // More engaging placeholder
    }
  }

  private dispatchPromptChange() {
    this.dispatchEvent(
      new CustomEvent<Prompt>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight, // This is "Power"
          cc: this.cc,
          color: this.color,
        },
      }),
    );
  }

  private async updateText() {
    const newText = this.textInput.textContent?.trim();
    if (!newText || newText === "Type a sound idea!") {
      this.text = this.lastValidText; // Revert if empty or placeholder
      this.textInput.textContent = this.lastValidText;
    } else {
      this.text = newText;
      this.lastValidText = newText;
    }
    this.updatePlaceholder(); // Ensure placeholder reappears if text becomes empty
    this.dispatchPromptChange();
  }

  private onFocus() {
    if (this.textInput.textContent === "Type a sound idea!") {
        // this.textInput.textContent = ""; // Clear placeholder on focus if it's the placeholder
    }
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.textInput);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  private onBlur() {
    this.updateText();
  }

  private updateWeight() { // Renamed to updatePower conceptually
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  private toggleLearnMode() {
    this.learnMode = !this.learnMode;
  }

  override render() {
    const classes = classMap({
      'prompt': true,
      'learn-mode': this.learnMode,
      'show-cc': this.showCC, // This class enables visibility of #midi-link-info
    });
    // The "weight-knob" is the Power Knob. "weight" property is its Power level.
    return html`<div class=${classes} style="--prompt-color: ${this.color};">
      <weight-knob
        id="power-knob" 
        value=${this.weight}
        color=${this.color}
        audioLevel=${this.audioLevel}
        @input=${this.updateWeight}></weight-knob>
      <span
        id="text"
        spellcheck="false"
        @focus=${this.onFocus}
        @blur=${this.onBlur}
        title=${this.text || "Click to edit this sound idea!"}
        role="textbox"
        aria-label="Sound idea text input"
      ></span>
      <div id="midi-link-info" @click=${this.toggleLearnMode} title="Link this Shaper to a MIDI knob">
        ${this.learnMode ? 'Twist MIDI Knob...' : `🎹 Link: ${this.cc}`}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-controller': PromptController;
  }
}
