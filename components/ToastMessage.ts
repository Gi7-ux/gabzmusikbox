/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('toast-message')
export class ToastMessage extends LitElement {
  static override styles = css`
    .toast {
      line-height: 1.6;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #000;
      color: white;
      padding: 15px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      min-width: 200px;
      max-width: 80vw;
      transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.5s ease-out;
      z-index: 1000;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      opacity: 0; /* Start hidden */
    }
    button {
      border-radius: 100px;
      aspect-ratio: 1;
      border: none;
      color: #000;
      background-color: #aaa;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    button:hover {
      background-color: #ccc;
    }
    .toast.showing {
      transform: translate(-50%, 0); /* Slide in from top */
      opacity: 1;
    }
    .toast:not(.showing) {
      transition-duration: 0.7s; /* Control fade out speed */
      transform: translate(-50%, -200%);
      opacity: 0;
    }
  `;

  @property({ type: String }) message = '';
  @property({ type: Boolean }) showing = false;

  private hideTimeout: number | null = null;

  override render() {
    return html`<div class=${classMap({ showing: this.showing, toast: true })}>
      <div class="message">${this.message}</div>
      <button @click=${this.hide} aria-label="Close message">✕</button>
    </div>`;
  }

  show(message: string, duration: number = 3000) {
    this.message = message;
    this.showing = true;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    if (duration > 0) {
        this.hideTimeout = window.setTimeout(() => {
            this.hide();
        }, duration);
    }
  }

  hide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.showing = false;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'toast-message': ToastMessage
  }
}