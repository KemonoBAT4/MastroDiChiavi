import { Component, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { backspaceOutline, fingerPrintOutline } from 'ionicons/icons';

@Component({
  selector: 'app-pin-pad',
  imports: [IonIcon],
  template: `
    <div class="dots" [class.shake]="error()">
      @for (i of dots; track i) { <span [class.on]="i < value().length"></span> }
    </div>
    <div class="keys">
      @for (k of keys; track k) {
        <button type="button" class="key" [disabled]="busy()" (click)="press(k)">
          @if (k === 'del') { <ion-icon name="backspace-outline" /> }
          @else if (k === 'bio') { @if (showBio()) { <ion-icon name="finger-print-outline" /> } }
          @else { {{ k }} }
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; max-width: 320px; margin: 0 auto; }
    .dots { display: flex; justify-content: center; gap: 14px; margin: 8px 0 28px; height: 14px; }
    .dots span { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--muted); transition: all .12s; }
    .dots span.on { background: var(--accent); border-color: var(--accent); transform: scale(1.1); }
    .shake { animation: shake .35s; }
    @keyframes shake { 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
    .keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .key { height: 64px; border-radius: 20px; border: 1px solid var(--border); background: var(--card);
      color: var(--text); font-size: 24px; font-weight: 500; display: grid; place-items: center; }
    .key:active { background: var(--card-hover); transform: scale(.96); }
    .key ion-icon { font-size: 26px; color: var(--accent); }
  `],
})
export class PinPad {
  length = input(6);
  busy = input(false);
  error = input(false);
  showBio = input(false);
  complete = output<string>();
  bio = output<void>();

  value = signal('');
  keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];
  get dots() { return Array.from({ length: this.length() }, (_, i) => i); }

  constructor() { addIcons({ backspaceOutline, fingerPrintOutline }); }

  press(k: string) {
    if (k === 'del') return this.value.update((v) => v.slice(0, -1));
    if (k === 'bio') return this.showBio() ? this.bio.emit() : undefined;
    if (this.value().length >= this.length()) return;
    this.value.update((v) => v + k);
    if (this.value().length === this.length()) {
      const pin = this.value();
      this.complete.emit(pin);
      setTimeout(() => this.value.set(''), 150);
    }
  }
}
