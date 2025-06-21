/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './DrumStemSlider';
import type { DrumMix, DrumStemType } from '../types';
import { DRUM_STEM_TYPES } from '../types';

@customElement('drum-mixer')
export class DrumMixer extends LitElement {
  static override styles = css`
    /* :host inherits .content-block styles from index.tsx */

    .sliders-container {
      display: flex;
      justify-content: space-around; /* Spreads sliders evenly */
      align-items: flex-start;
      gap: 1vmin; /* Reduced gap a bit to fit more sliders if needed */
      overflow-x: auto; 
      padding: 1vmin 0.5vmin; /* Padding for scrollbar and slight horizontal space */
      scrollbar-width: thin; /* For Firefox */
      scrollbar-color: #ff00ff rgba(0,0,0,0.3); /* Pink scrollbar */
    }
    /* Webkit scrollbar styles */
    .sliders-container::-webkit-scrollbar {
      height: 8px;
    }
    .sliders-container::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
    }
    .sliders-container::-webkit-scrollbar-thumb {
      background-color: #ff00ff;
      border-radius: 4px;
      border: 2px solid rgba(0,0,0,0.3);
    }

    drum-stem-slider {
       flex: 0 0 auto; /* Allow shrinking but not growing, base on its own width */
    }
  `;

  @property({ type: Object })
  drumMix: DrumMix = {};

  private handleStemChange(event: CustomEvent<{ value: number, stem: DrumStemType }>) {
    const { value, stem } = event.detail;
    const newDrumMix = {
      ...this.drumMix,
      [stem]: value,
    };
    this.drumMix = newDrumMix; 
    this.dispatchEvent(
      new CustomEvent('drum-mix-changed', { detail: this.drumMix }),
    );
  }

  override render() {
    return html`
      <div class="content-block-title">🎧 Drum Kit Controls</div>
      <div class="sliders-container">
        ${DRUM_STEM_TYPES.map(
          (stem) => html`
            <drum-stem-slider
              .label=${stem}
              .value=${this.drumMix[stem] !== undefined ? this.drumMix[stem] : 0.5}
              @value-changed=${this.handleStemChange}
            ></drum-stem-slider>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'drum-mixer': DrumMixer;
  }
}
