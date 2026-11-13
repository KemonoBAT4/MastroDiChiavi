import { Component, HostListener, OnInit, inject } from '@angular/core';
import { App as CapApp } from '@capacitor/app';
import { IonApp, IonSpinner } from '@ionic/angular';
import { Session } from './core/session';
import { Home } from './pages/home';
import { PinSetup } from './pages/pin-setup';
import { Unlock } from './pages/unlock';
import { Welcome } from './pages/welcome';

const IDLE_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-root',
  imports: [IonApp, IonSpinner, Welcome, PinSetup, Unlock, Home],
  template: `
    <ion-app>
      @switch (s.status()) {
        @case ('loading') { <div class="screen center"><ion-spinner name="crescent" /></div> }
        @case ('setup') { <app-welcome /> }
        @case ('pin-setup') { <app-pin-setup /> }
        @case ('locked') { <app-unlock /> }
        @case ('unlocked') { <app-home /> }
      }
    </ion-app>
  `,
})
export class App implements OnInit {
  s = inject(Session);
  private idle?: ReturnType<typeof setTimeout>;

  async ngOnInit() {
    await this.s.init();
    CapApp.addListener('pause', () => this.s.lock());           // app in background -> blocca
    document.addEventListener('visibilitychange', () => document.hidden && this.s.lock());
    this.bump();
  }

  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  bump() {
    clearTimeout(this.idle);
    this.idle = setTimeout(() => this.s.lock(), IDLE_MS);       // inattività -> blocca
  }
}
