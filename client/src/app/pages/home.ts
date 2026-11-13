import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline, cloudDoneOutline, cloudOfflineOutline, copyOutline, createOutline, eyeOffOutline,
  eyeOutline, lockClosedOutline, logOutOutline, openOutline, searchOutline,
} from 'ionicons/icons';
import { copyText } from '../core/clip';
import { Entry } from '../core/crypto';
import { Session } from '../core/session';
import { EntrySheet } from './entry-sheet';

@Component({
  selector: 'app-home',
  imports: [FormsModule, IonIcon, EntrySheet],
  host: { class: 'screen' },
  template: `
    <header>
      <div class="top">
        <h1>Password</h1>
        <div class="tools">
          <button class="icon" [title]="s.online() ? 'Sincronizzato' : 'Offline: tocca per riprovare'" (click)="s.sync()">
            <ion-icon [name]="s.online() ? 'cloud-done-outline' : 'cloud-offline-outline'" [class.warn]="!s.online()" />
          </button>
          <button class="icon" [class.active]="showAll()" title="Mostra tutte le password" (click)="showAll.set(!showAll())">
            <ion-icon [name]="showAll() ? 'eye-off-outline' : 'eye-outline'" />
          </button>
          <button class="icon" title="Blocca" (click)="s.lock()"><ion-icon name="lock-closed-outline" /></button>
          <button class="icon" title="Esci dall'account" (click)="logout()"><ion-icon name="log-out-outline" /></button>
        </div>
      </div>
      <div class="search">
        <ion-icon name="search-outline" />
        <input [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Cerca tra {{ s.visible().length }} password" />
      </div>
    </header>

    <main>
      @for (e of list(); track e.id) {
        <article class="card" [class.open]="open() === e.id">
          <div class="row" (click)="toggle(e.id)">
            <div class="avatar" [style.background]="color(e.title)">{{ e.title.charAt(0).toUpperCase() }}</div>
            <div class="meta">
              <div class="title">{{ e.title }}</div>
              <div class="sub">{{ e.username }}</div>
              @if (showAll()) { <div class="sub mono pwd">{{ e.password }}</div> }
            </div>
            <button class="copy" title="Copia password" (click)="copy(e.password, 'Password copiata', $event)">
              <ion-icon name="copy-outline" />
            </button>
          </div>

          @if (open() === e.id) {
            <div class="detail">
              <div class="line">
                <span class="k">Utente</span><span class="v">{{ e.username || '—' }}</span>
                @if (e.username) { <button class="mini" (click)="copy(e.username, 'Utente copiato', $event)"><ion-icon name="copy-outline" /></button> }
              </div>
              <div class="line">
                <span class="k">Password</span>
                <span class="v mono">{{ revealed().has(e.id) || showAll() ? e.password : '••••••••••••' }}</span>
                <button class="mini" (click)="reveal(e.id)"><ion-icon [name]="revealed().has(e.id) ? 'eye-off-outline' : 'eye-outline'" /></button>
                <button class="mini" (click)="copy(e.password, 'Password copiata', $event)"><ion-icon name="copy-outline" /></button>
              </div>
              @if (e.url) {
                <div class="line"><span class="k">Sito</span><span class="v">{{ e.url }}</span>
                  <button class="mini" (click)="openUrl(e.url)"><ion-icon name="open-outline" /></button></div>
              }
              @if (e.notes) { <div class="line"><span class="k">Note</span><span class="v">{{ e.notes }}</span></div> }
              <button class="btn ghost" (click)="edit(e)"><ion-icon name="create-outline" /> Modifica</button>
            </div>
          }
        </article>
      } @empty {
        <div class="empty">
          @if (q()) { Nessun risultato per “{{ q() }}”. } @else { Nessuna password salvata.<br />Tocca <b>+</b> per aggiungere la prima. }
        </div>
      }
    </main>

    <button class="fab" title="Aggiungi" (click)="add()"><ion-icon name="add-outline" /></button>
    @if (toast()) { <div class="toast">{{ toast() }}</div> }
    @if (editing(); as e) {
      <app-entry-sheet [entry]="e" [isNew]="isNew" (save)="save($event)" (remove)="remove($event)" (cancel)="editing.set(null)" />
    }
  `,
  styles: [`
    :host { padding-top: env(safe-area-inset-top); }
    header { padding: 14px 20px 8px; }
    .top { display: flex; align-items: center; justify-content: space-between; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -.5px; }
    .tools { display: flex; gap: 4px; }
    .icon { width: 40px; height: 40px; border-radius: 12px; background: none; color: var(--muted); font-size: 22px; display: grid; place-items: center; }
    .icon.active { background: var(--card-hover); color: var(--accent); } .warn { color: #ffb454; }
    .search { margin-top: 12px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-radius: 16px;
      background: var(--card); border: 1px solid var(--border); color: var(--muted); }
    .search input { flex: 1; height: 46px; background: none; border: 0; outline: 0; color: var(--text); font-size: 16px; }
    main { flex: 1; overflow-y: auto; padding: 8px 16px 110px; display: flex; flex-direction: column; gap: 10px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; transition: background .15s; }
    .card.open { background: var(--card-hover); }
    .row { display: flex; align-items: center; gap: 14px; padding: 14px; }
    .avatar { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-weight: 700; font-size: 18px; color: #fff; flex: none; }
    .meta { flex: 1; min-width: 0; } .title { font-weight: 600; font-size: 16px; }
    .sub { color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pwd { color: var(--accent); margin-top: 2px; }
    .copy { width: 44px; height: 44px; border-radius: 14px; background: rgba(139,123,255,.14); color: var(--accent); font-size: 21px; display: grid; place-items: center; flex: none; }
    .copy:active { transform: scale(.92); }
    .detail { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border); }
    .line { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .k { width: 72px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .5px; flex: none; }
    .v { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 15px; }
    .mini { width: 34px; height: 34px; border-radius: 10px; background: var(--card); color: var(--accent); font-size: 18px; display: grid; place-items: center; }
    .detail .btn { margin-top: 10px; }
    .empty { text-align: center; color: var(--muted); margin-top: 80px; line-height: 1.7; }
    .fab { position: fixed; right: 22px; bottom: calc(env(safe-area-inset-bottom) + 24px); width: 62px; height: 62px; border-radius: 22px;
      background: var(--grad); color: #fff; font-size: 32px; display: grid; place-items: center; box-shadow: 0 12px 32px -6px var(--accent); z-index: 10; }
    .toast { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 100px); transform: translateX(-50%); z-index: 30;
      background: #fff; color: #111; padding: 10px 18px; border-radius: 999px; font-weight: 600; font-size: 14px; animation: pop .2s; }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, 8px); } }
  `],
})
export class Home {
  s = inject(Session);
  q = signal('');
  showAll = signal(false);
  open = signal<string | null>(null);
  revealed = signal<Set<string>>(new Set());
  toast = signal('');
  editing = signal<Entry | null>(null);
  isNew = false;

  list = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.s.visible().filter((e) => !q || `${e.title} ${e.username} ${e.url ?? ''}`.toLowerCase().includes(q));
  });

  constructor() {
    addIcons({ addOutline, cloudDoneOutline, cloudOfflineOutline, copyOutline, createOutline, eyeOffOutline, eyeOutline,
      lockClosedOutline, logOutOutline, openOutline, searchOutline });
  }

  color(name: string) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 45%))`;
  }

  toggle(id: string) { this.open.set(this.open() === id ? null : id); }
  reveal(id: string) {
    const s = new Set(this.revealed());
    s.has(id) ? s.delete(id) : s.add(id);
    this.revealed.set(s);
  }

  async copy(text: string, label: string, ev: Event) {
    ev.stopPropagation();
    await copyText(text);
    this.flash(label + ' (si cancella tra 30 s)');
  }
  private flash(msg: string) { this.toast.set(msg); setTimeout(() => this.toast.set(''), 1800); }

  openUrl(url: string) { window.open(/^https?:\/\//.test(url) ? url : 'https://' + url, '_blank', 'noopener'); }

  add() {
    this.isNew = true;
    this.editing.set({ id: crypto.randomUUID(), title: '', username: '', password: '', updatedAt: 0 });
  }
  edit(e: Entry) { this.isNew = false; this.editing.set(e); }
  async save(e: Entry) { this.editing.set(null); await this.s.upsert(e); this.open.set(e.id); }
  async remove(id: string) { this.editing.set(null); this.open.set(null); await this.s.remove(id); }
  logout() {
    if (confirm('Uscire dall\'account? Dovrai reinserire la master password. I dati restano sul server.')) void this.s.logout();
  }
}
