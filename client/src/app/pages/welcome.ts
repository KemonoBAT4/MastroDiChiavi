import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosed } from 'ionicons/icons';
import { ApiError } from '../core/api';
import { Session } from '../core/session';

@Component({
  selector: 'app-welcome',
  imports: [FormsModule, IonIcon, IonSpinner],
  host: { class: 'screen scroll' },
  template: `
    <div class="hero">
      <div class="logo"><ion-icon name="lock-closed" /></div>
      <h1>Vault</h1>
      <p class="muted">Le tue password, cifrate sul tuo telefono e salvate sul tuo server.</p>
    </div>

    <div class="tabs">
      <button [class.on]="mode() === 'login'" (click)="mode.set('login')">Accedi</button>
      <button [class.on]="mode() === 'register'" (click)="mode.set('register')">Crea account</button>
    </div>

    <label>Server
      <input class="field" [(ngModel)]="server" placeholder="https://vault.example.com" inputmode="url"
             autocapitalize="off" autocomplete="off" spellcheck="false" />
    </label>
    <label>Email
      <input class="field" type="email" [(ngModel)]="email" autocapitalize="off" autocomplete="username" />
    </label>
    <label>Master password
      <input class="field" type="password" [(ngModel)]="password" autocomplete="current-password" />
    </label>
    @if (mode() === 'register') {
      <label>Conferma master password
        <input class="field" type="password" [(ngModel)]="confirm" autocomplete="new-password" />
      </label>
      <p class="hint">Scegli una frase lunga (almeno 12 caratteri). Se la dimentichi i dati
        <b>non sono recuperabili</b>: nemmeno il server può leggerli.</p>
    }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <button class="btn primary" [disabled]="busy()" (click)="submit()">
      @if (busy()) { <ion-spinner name="dots" /> } @else { {{ mode() === 'login' ? 'Accedi' : 'Crea account' }} }
    </button>
    @if (busy()) { <p class="muted small center-text">Derivo la chiave di cifratura, può volerci qualche secondo…</p> }
  `,
  styles: [`
    :host { padding: calc(env(safe-area-inset-top) + 32px) 24px 32px; gap: 14px; }
    .hero { text-align: center; margin-bottom: 8px; }
    .logo { width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 24px; display: grid; place-items: center;
      background: var(--grad); font-size: 34px; color: #fff; box-shadow: 0 12px 40px -8px var(--accent); }
    h1 { margin: 0 0 6px; font-size: 30px; }
    .tabs { display: flex; background: var(--card); border-radius: 14px; padding: 4px; border: 1px solid var(--border); }
    .tabs button { flex: 1; padding: 10px; border-radius: 10px; background: none; color: var(--muted); font-weight: 600; }
    .tabs button.on { background: var(--card-hover); color: var(--text); }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
    .center-text { text-align: center; }
  `],
})
export class Welcome {
  private s = inject(Session);
  mode = signal<'login' | 'register'>('login');
  busy = signal(false);
  error = signal('');
  server = this.s.profile?.server ?? 'http://localhost:8000';
  email = this.s.profile?.email ?? '';
  password = '';
  confirm = '';

  constructor() { addIcons({ lockClosed }); }

  async submit() {
    this.error.set('');
    if (!this.server || !this.email || !this.password) return this.error.set('Compila tutti i campi.');
    if (this.mode() === 'register') {
      if (this.password.length < 12) return this.error.set('La master password deve avere almeno 12 caratteri.');
      if (this.password !== this.confirm) return this.error.set('Le due password non coincidono.');
    }
    this.busy.set(true);
    try {
      if (this.mode() === 'register') await this.s.register(this.server, this.email, this.password);
      else await this.s.login(this.server, this.email, this.password);
      this.password = this.confirm = '';
    } catch (e) {
      this.error.set(this.message(e));
    } finally { this.busy.set(false); }
  }

  private message(e: unknown): string {
    if (e instanceof ApiError) {
      return ({ 401: 'Email o master password errate.', 403: 'Le registrazioni sono chiuse su questo server.',
        409: 'Email già registrata: usa "Accedi".', 429: 'Troppi tentativi, riprova più tardi.' } as Record<number, string>)[e.status]
        ?? `Errore del server (${e.status}).`;
    }
    if (e instanceof TypeError) return 'Server non raggiungibile. Controlla l\'indirizzo e la connessione.';
    return 'Errore imprevisto: ' + (e as Error).message;
  }
}
