/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

@customElement('drum-stem-slider')
export class DrumStemSlider extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 45px; /* Slightly wider */
      font-family: 'Google Sans', sans-serif;
      color: #fff;
      user-select: none;
    }
    .label {
      font-size: 1.1vmin; /* Slightly larger label */
      margin-bottom: 0.6vmin;
      text-align: center;
      white-space: nowrap;
      color: #ddd; /* Lighter label color for contrast */
      text-transform: capitalize;
    }
    input[type='range'] {
      -webkit-appearance: none;
      appearance: none;
      width: 85%; 
      height: 12vmin; /* Slightly longer slider */
      background: rgba(0,0,0,0.4); /* Darker track */
      outline: none;
      border-radius: 6px; /* More rounded track */
      margin: 0;
      padding: 0;
      cursor: ns-resize;
      writing-mode: bt-lr; /* IE */
      -webkit-appearance: slider-vertical; /* WebKit */
      border: 1px solid rgba(255,255,255,0.2);
    }
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 2.5vmin; /* Larger thumb */
      height: 2.5vmin; /* Larger thumb */
      background: #fff;
      border: 0.25vmin solid #0008; /* Slightly thicker border */
      border-radius: 50%;
      cursor: ns-resize;
      transition: transform 0.1s ease;
    }
    input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }
    input[type='range']::-moz-range-thumb {
      width: 2.5vmin;
      height: 2.5vmin;
      background: #fff;
      border: 0.25vmin solid #0008;
      border-radius: 50%;
      cursor: ns-resize;
    }
    input[type='range']::-moz-range-thumb:hover {
      transform: scale(1.1);
    }
  `;

  @property({ type: String }) label = '';
  @property({ type: Number }) value = 0.5; // Range 0-1

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    // HTML range input value is string, convert to number
    // Slider gives 0-100, normalize to 0-1
    this.value = parseFloat(target.value) / 100;
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: this.value, stem: this.label },
      }),
    );
  }

  override render() {
    // Input range default is 0-100, so multiply value by 100
    const displayLabel = this.label.replace(/_/g, ' ').toLowerCase();
    return html`
      <label class="label" for="slider-${this.label}">${displayLabel}</label>
      <input
        type="range"
        id="slider-${this.label}"
        min="0"
        max="100"
        .value=${String(Math.round(this.value * 100))}
        @input=${this.handleInput}
        aria-label="${displayLabel} volume"
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'drum-stem-slider': DrumStemSlider;
  }
}