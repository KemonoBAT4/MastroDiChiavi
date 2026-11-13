import { Component, OnInit, inject, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosed } from 'ionicons/icons';
import { PinError, Session } from '../core/session';
import { PinPad } from '../ui/pin-pad';

@Component({
  selector: 'app-unlock',
  imports: [PinPad, IonIcon],
  host: { class: 'screen center' },
  template: `
    <div class="logo"><ion-icon name="lock-closed" /></div>
    <h2>Vault bloccato</h2>
    <p class="muted">{{ msg() || 'Inserisci il codice' + (s.bioEnabled() ? ' o usa l\\'impronta' : '') }}</p>
    <app-pin-pad [busy]="busy()" [error]="bad()" [showBio]="s.bioEnabled()" (complete)="pin($event)" (bio)="bio()" />
    <button class="link" (click)="s.forgotPin()">Codice dimenticato? Accedi con la master password</button>
  `,
  styles: [`
    :host { padding: 24px; text-align: center; }
    .logo { width: 56px; height: 56px; border-radius: 20px; display: grid; place-items: center; background: var(--grad);
      font-size: 26px; color: #fff; margin-bottom: 14px; }
    h2 { margin: 0; } .muted { margin: 6px 0 24px; min-height: 20px; }
    .link { margin-top: 32px; background: none; color: var(--muted); font-size: 13px; text-decoration: underline; }
  `],
})
export class Unlock implements OnInit {
  s = inject(Session);
  busy = signal(false);
  bad = signal(false);
  msg = signal('');

  constructor() { addIcons({ lockClosed }); }

  ngOnInit() { if (this.s.bioEnabled()) void this.bio(); }

  async bio() {
    try { await this.s.unlockWithBiometrics(); } catch { /* annullato: resta il PIN */ }
  }

  async pin(p: string) {
    this.busy.set(true); this.bad.set(false);
    try { await this.s.unlockWithPin(p); }
    catch (e) {
      this.bad.set(true);
      setTimeout(() => this.bad.set(false), 400);
      this.msg.set(e instanceof PinError
        ? (e.remaining ? `Codice errato. Tentativi rimasti: ${e.remaining}` : 'Troppi errori: accedi di nuovo con la master password.')
        : 'Impossibile aprire il vault: ' + (e as Error).message);
    } finally { this.busy.set(false); }
  }
}
