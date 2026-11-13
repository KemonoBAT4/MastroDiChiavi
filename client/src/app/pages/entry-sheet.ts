import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, sparklesOutline } from 'ionicons/icons';
import { Entry, generatePassword } from '../core/crypto';

@Component({
  selector: 'app-entry-sheet',
  imports: [FormsModule, IonIcon],
  template: `
    <div class="backdrop" (click)="cancel.emit()"></div>
    <div class="sheet">
      <div class="grab"></div>
      <h2>{{ isNew() ? 'Nuova password' : 'Modifica' }}</h2>
      <div class="body">
        <label>Nome<input class="field" [(ngModel)]="d.title" placeholder="es. GitHub" /></label>
        <label>Utente / email<input class="field" [(ngModel)]="d.username" autocapitalize="off" autocomplete="off" /></label>
        <label>Password
          <div class="pw">
            <input class="field mono" [type]="show() ? 'text' : 'password'" [(ngModel)]="d.password" autocomplete="off" />
            <button type="button" (click)="show.set(!show())"><ion-icon [name]="show() ? 'eye-off-outline' : 'eye-outline'" /></button>
            <button type="button" title="Genera" (click)="gen()"><ion-icon name="sparkles-outline" /></button>
          </div>
        </label>
        <label>Sito web<input class="field" [(ngModel)]="d.url" inputmode="url" autocapitalize="off" placeholder="https://" /></label>
        <label>Note<textarea class="field" rows="3" [(ngModel)]="d.notes"></textarea></label>
      </div>
      <div class="actions">
        @if (!isNew()) {
          <button class="btn danger" (click)="del()">{{ confirmDel() ? 'Conferma eliminazione' : 'Elimina' }}</button>
        }
        <button class="btn primary" [disabled]="!d.title" (click)="save.emit(d)">Salva</button>
      </div>
    </div>
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); z-index: 20; animation: fade .2s; }
    .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-height: 92%; display: flex; flex-direction: column;
      background: var(--bg-elev); border-radius: 28px 28px 0 0; padding: 10px 20px calc(env(safe-area-inset-bottom) + 20px);
      border-top: 1px solid var(--border); animation: up .25s ease-out; }
    .grab { width: 40px; height: 4px; border-radius: 4px; background: var(--border); margin: 0 auto 14px; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    .body { overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-bottom: 8px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
    .pw { display: flex; gap: 8px; } .pw .field { flex: 1; min-width: 0; }
    .pw button { width: 46px; border-radius: 14px; background: var(--card); border: 1px solid var(--border); color: var(--accent); font-size: 20px; }
    .actions { display: flex; gap: 10px; margin-top: 14px; } .actions .btn { flex: 1; }
    @keyframes up { from { transform: translateY(100%); } } @keyframes fade { from { opacity: 0; } }
  `],
})
export class EntrySheet implements OnInit {
  entry = input.required<Entry>();
  isNew = input(false);
  save = output<Entry>();
  remove = output<string>();
  cancel = output<void>();

  d!: Entry;
  show = signal(false);
  confirmDel = signal(false);

  constructor() { addIcons({ eyeOutline, eyeOffOutline, sparklesOutline }); }
  ngOnInit() { this.d = { ...this.entry() }; this.show.set(this.isNew()); }

  gen() { this.d.password = generatePassword(20); this.show.set(true); }
  del() { if (this.confirmDel()) this.remove.emit(this.d.id); else this.confirmDel.set(true); }
}
