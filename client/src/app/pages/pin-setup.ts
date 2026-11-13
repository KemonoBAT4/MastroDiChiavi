import { Component, inject, signal } from '@angular/core';
import { PinPad } from '../ui/pin-pad';
import { Session } from '../core/session';

@Component({
  selector: 'app-pin-setup',
  imports: [PinPad],
  host: { class: 'screen center' },
  template: `
    <h2>{{ first() ? 'Scegli un codice di sblocco' : 'Ripeti il codice' }}</h2>
    <p class="muted">Lo userai ogni volta che apri l'app{{ s.biometryAvailable() ? ', in alternativa all\\'impronta' : '' }}.</p>
    <app-pin-pad [error]="err()" (complete)="done($event)" />
    @if (s.biometryAvailable()) {
      <label class="switch">
        <input type="checkbox" [checked]="bio()" (change)="bio.set(!bio())" />
        <span>Sblocca anche con l'impronta</span>
      </label>
    }
    @if (err()) { <p class="error">I codici non coincidono, riprova.</p> }
  `,
  styles: [`
    :host { padding: 24px; gap: 8px; text-align: center; }
    h2 { margin: 0; } .muted { margin: 0 0 28px; }
    .switch { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 28px; color: var(--text); }
    .switch input { width: 20px; height: 20px; accent-color: var(--accent); }
  `],
})
export class PinSetup {
  s = inject(Session);
  first = signal(true);
  err = signal(false);
  bio = signal(true);
  private pin = '';

  async done(p: string) {
    if (this.first()) { this.pin = p; this.first.set(false); this.err.set(false); return; }
    if (p !== this.pin) { this.err.set(true); this.first.set(true); return; }
    await this.s.setupQuickUnlock(p, this.bio() && this.s.biometryAvailable());
  }
}
