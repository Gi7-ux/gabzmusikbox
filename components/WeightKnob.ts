/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/** Maps prompt weight to halo size. */
const MIN_HALO_SCALE = 1; // Base scale
const MAX_HALO_SCALE = 2.2; // Max scale at full power

/** The amount of scale to add to the halo based on audio level. */
const HALO_LEVEL_MODIFIER = 1.2; // More responsive to audio

/** A knob for adjusting and visualizing prompt weight (now "Power"). */
@customElement('weight-knob') // Tag name remains for compatibility, but it's a "Power Knob"
export class WeightKnob extends LitElement {
  static override styles = css`
    :host {
      cursor: grab;
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      flex-shrink: 0;
      touch-action: none; /* For touch interactions */
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3)); /* Add subtle shadow to SVG itself */
    }
    #halo {
      position: absolute;
      z-index: -1; /* Behind the knob */
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      mix-blend-mode: screen; /* Brighter, more colorful blend */
      transform: scale(1); /* Initial scale */
      will-change: transform, opacity; /* Optimize animation */
      opacity: 0.7; /* Default opacity */
      transition: transform 0.1s ease-out, opacity 0.1s ease-out; /* Smooth transitions */
    }
    /* Add a pulsing animation to the halo when audio level is high */
    #halo.active-pulse {
      animation: pulse-glow 1s infinite alternate;
    }
    @keyframes pulse-glow {
      from { opacity: 0.6; transform: scale(var(--halo-base-scale, 1.2)); }
      to   { opacity: 0.9; transform: scale(calc(var(--halo-base-scale, 1.2) * 1.1)); }
    }
  `;

  @property({ type: Number }) value = 0; // "Power" level from 0 to 2
  @property({ type: String }) color = '#000';
  @property({ type: Number }) audioLevel = 0;

  private dragStartPos = 0;
  private dragStartValue = 0;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    this.dragStartPos = e.clientY;
    this.dragStartValue = this.value;
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.style.cursor = 'grabbing';
  }

  private handlePointerMove(e: PointerEvent) {
    const delta = this.dragStartPos - e.clientY;
    this.value = this.dragStartValue + delta * 0.015; // Slightly more sensitivity
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private handlePointerUp(e: PointerEvent) {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.body.classList.remove('dragging');
    this.style.cursor = 'grab';
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault(); // Prevent page scroll
    const delta = e.deltaY;
    this.value = this.value + delta * -0.003; // Adjusted sensitivity for wheel
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private describeArc(
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string {
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  }

  override render() {
    const rotationRange = Math.PI * 2 * 0.8; // More rotation range
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    const rot = minRot + (this.value / 2) * (maxRot - minRot); // value is 0-2
    
    const dotStyle = styleMap({
      transform: `translate(40px, 40px) rotate(${rot}rad)`,
      transition: 'transform 0.1s linear' // Smooth dot movement
    });

    let haloBaseScale = MIN_HALO_SCALE + (this.value / 2) * (MAX_HALO_SCALE - MIN_HALO_SCALE);
    let haloCurrentScale = haloBaseScale + (this.audioLevel * HALO_LEVEL_MODIFIER * (this.value / 2)); // Audio effect stronger with higher power
    haloCurrentScale = Math.max(MIN_HALO_SCALE, haloCurrentScale); // Ensure it doesn't go below min

    const haloStyle = styleMap({
      display: this.value > 0 ? 'block' : 'none',
      background: `radial-gradient(ellipse at center, ${this.color}ff 0%, ${this.color}aa 40%, ${this.color}00 70%)`, // Softer radial gradient
      transform: `scale(${haloCurrentScale})`,
      opacity: `${0.5 + (this.value / 2) * 0.4}`, // Opacity increases with power
      '--halo-base-scale': `${haloBaseScale}` // For CSS animation
    });
    
    const haloElement = this.shadowRoot?.getElementById('halo');
    if (haloElement) {
        if (this.audioLevel > 0.3 && this.value > 0.5) { // Threshold for pulse
            haloElement.classList.add('active-pulse');
        } else {
            haloElement.classList.remove('active-pulse');
        }
    }


    return html`
      <div id="halo" style=${haloStyle}></div>
      ${this.renderStaticSvg()}
      <svg
        viewBox="0 0 80 80"
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleWheel}>
        <g style=${dotStyle}>
          <circle cx="14" cy="0" r="3" fill="#fff" stroke="#333" stroke-width="0.5" /> 
        </g>
        <path
          d=${this.describeArc(40, 40, minRot, maxRot, 34.5)}
          fill="none"
          stroke="rgba(0,0,0,0.2)" /* Softer track */
          stroke-width="4" /* Thicker track */
          stroke-linecap="round" />
        <path
          d=${this.describeArc(40, 40, minRot, rot, 34.5)}
          fill="none"
          stroke=${this.color} /* Use prompt color for active track */
          stroke-width="5" /* Thicker active track */
          stroke-linecap="round"
          style="filter: drop-shadow(0px 0px 2px ${this.color}); transition: stroke-dasharray 0.1s linear, stroke 0.1s linear;" />
      </svg>
    `;
  }
  
  // SVG for the static part of the knob - made more vibrant and "gem-like"
  private renderStaticSvg() { 
    return html`<svg viewBox="0 0 80 80">
        <defs>
            <radialGradient id="knob-shine" cx="30%" cy="30%" r="70%">
                <stop offset="0%" style="stop-color:rgba(255,255,255,0.7)" />
                <stop offset="100%" style="stop-color:rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="knob-glow-filter">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        
        <!-- Base of the knob with a slight 3D effect -->
        <ellipse
          cx="40"
          cy="42" 
          rx="38"
          ry="38"
          fill="rgba(0,0,0,0.2)" />
        <ellipse
          cx="40"
          cy="40"
          rx="38"
          ry="38"
          fill="url(#f3_updated)" 
          stroke="rgba(0,0,0,0.3)" 
          stroke-width="1"/>

        <!-- Central "gem" part -->
        <circle 
            cx="40" 
            cy="40" 
            r="30" 
            fill=${this.color || '#555'} 
            style="filter:brightness(0.8) saturate(1.2);" />
        <circle 
            cx="40" 
            cy="40" 
            r="28" 
            fill="url(#knob-shine)" 
            style="mix-blend-mode: lighten;"/>
        <circle 
            cx="40" 
            cy="40" 
            r="22" 
            fill=${this.color || '#555'} 
            stroke="rgba(255,255,255,0.2)" 
            stroke-width="1.5"
            style="filter:brightness(1.1) saturate(1.1);" />

        <!-- Reusing existing filter definitions from original file for shadow, but simplified for clarity -->
        <filter
            id="f2" 
            x="8.33301" y="10.0488" width="63.333" height="64"
            filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="2"/>
            <feGaussianBlur stdDeviation="1.5"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="shadow1"/>
            <feBlend mode="normal" in="SourceGraphic" in2="shadow1" result="shape"/>
        </filter>
        <radialGradient
            id="f3_updated" /* Updated from f3 for main knob body */
            cx="0" cy="0" r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(40 40) rotate(90) scale(38 38)"> 
            <stop offset="0.6" stop-color="rgba(100,100,100,1)" />
            <stop offset="1" stop-color="rgba(50,50,50,1)" stop-opacity="0.9" />
        </radialGradient>
      </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    // Keep 'weight-knob' as the tag name for now to avoid breaking existing TSX
    'weight-knob': WeightKnob;
  }
}
