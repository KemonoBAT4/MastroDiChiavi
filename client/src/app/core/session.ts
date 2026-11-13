import { Injectable, computed, inject, signal } from '@angular/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Api, ApiError } from './api';
import * as C from './crypto';

export type Status = 'loading' | 'setup' | 'pin-setup' | 'locked' | 'unlocked';
interface Profile { server: string; email: string; salt: string; kdf: C.KdfParams; protectedVaultKey: string }
interface Cache { blob: string; version: number; dirty: boolean }

const LS_PROFILE = 'vault.profile';
const LS_CACHE = 'vault.cache';
const MAX_PIN_FAILS = 5;

const sget = async <T>(k: string): Promise<T | null> => {
  try { return (await SecureStorage.get(k)) as T | null; } catch { return null; }
};
const sset = (k: string, v: unknown) => SecureStorage.set(k, v as any);
const sdel = async (k: string) => { try { await SecureStorage.remove(k); } catch { /* assente */ } };

export class PinError extends Error {
  constructor(public remaining: number) { super('PIN errato'); }
}

@Injectable({ providedIn: 'root' })
export class Session {
  private api = inject(Api);

  status = signal<Status>('loading');
  entries = signal<C.Entry[]>([]);
  visible = computed(() =>
    this.entries().filter((e) => !e.deleted).sort((a, b) => a.title.localeCompare(b.title, 'it', { sensitivity: 'base' })));
  online = signal(true);
  biometryAvailable = signal(false);
  bioEnabled = signal(false);
  profile: Profile | null = null;

  private vaultKeyRaw: Uint8Array | null = null;
  private vk: CryptoKey | null = null;
  private version = 0;
  private dirty = false;

  async init() {
    this.api.onTokens = (t) => { void (t ? sset('tokens', t) : sdel('tokens')); };
    try { this.biometryAvailable.set((await BiometricAuth.checkBiometry()).isAvailable); } catch { /* web */ }
    const p = localStorage.getItem(LS_PROFILE);
    this.profile = p ? JSON.parse(p) : null;
    if (this.profile) {
      this.api.baseUrl = this.profile.server;
      this.api.tokens = await sget('tokens');
    }
    const pin = await sget('pin');
    this.bioEnabled.set(!!(await sget<string>('vk')) && this.biometryAvailable());
    this.status.set(this.profile && pin ? 'locked' : 'setup');
  }

  // ---------- account ----------

  async register(server: string, email: string, password: string) {
    server = server.trim().replace(/\/+$/, '');
    email = email.trim().toLowerCase();
    this.api.baseUrl = server;
    const salt = C.b64(C.randomBytes(16));
    const keys = await C.deriveKeys(password, salt, C.DEFAULT_KDF);
    const raw = C.randomBytes(32);
    const vk = await C.importVaultKey(raw);
    await this.api.register({
      email, salt, kdf_params: C.DEFAULT_KDF, auth_key: keys.authKey,
      protected_vault_key: await C.seal(keys.encKey, raw),
      vault_blob: await C.encryptEntries(vk, []),
    });
    await this.complete(server, email, salt, C.DEFAULT_KDF, keys);
  }

  async login(server: string, email: string, password: string) {
    server = server.trim().replace(/\/+$/, '');
    email = email.trim().toLowerCase();
    this.api.baseUrl = server;
    this.api.tokens = null;
    const pre = await this.api.prelogin(email);
    const keys = await C.deriveKeys(password, pre.salt, pre.kdf_params);
    await this.complete(server, email, pre.salt, pre.kdf_params, keys);
  }

  private async complete(server: string, email: string, salt: string, kdf: C.KdfParams, keys: C.DerivedKeys) {
    const res = await this.api.login(email, keys.authKey);
    const raw = await C.open(keys.encKey, res.protected_vault_key);
    this.vaultKeyRaw = raw;
    this.vk = await C.importVaultKey(raw);
    this.entries.set(await C.decryptEntries(this.vk, res.vault_blob));
    this.version = res.version;
    this.dirty = false;
    this.profile = { server, email, salt, kdf, protectedVaultKey: res.protected_vault_key };
    localStorage.setItem(LS_PROFILE, JSON.stringify(this.profile));
    this.writeCache(res.vault_blob);
    this.status.set('pin-setup');
  }

  // ---------- sblocco rapido ----------

  async setupQuickUnlock(pin: string, bio: boolean) {
    await sset('pin', await C.wrapWithPin(pin, this.vaultKeyRaw!));
    await sset('pinFails', 0);
    if (bio) await sset('vk', C.b64(this.vaultKeyRaw!)); else await sdel('vk');
    this.bioEnabled.set(bio && this.biometryAvailable());
    this.status.set('unlocked');
    void this.sync();
  }

  async unlockWithPin(pin: string) {
    const wrap = await sget<C.PinWrap>('pin');
    if (!wrap) { this.status.set('setup'); return; }
    let raw: Uint8Array;
    try {
      raw = await C.unwrapWithPin(pin, wrap);
    } catch {
      const fails = ((await sget<number>('pinFails')) ?? 0) + 1;
      if (fails >= MAX_PIN_FAILS) { await this.wipeLocal(); throw new PinError(0); }
      await sset('pinFails', fails);
      throw new PinError(MAX_PIN_FAILS - fails);
    }
    await sset('pinFails', 0);
    await this.openVault(raw);
  }

  async unlockWithBiometrics() {
    await BiometricAuth.authenticate({ reason: 'Sblocca Vault', cancelTitle: 'Usa il PIN', androidTitle: 'Sblocca Vault' });
    const vkB64 = await sget<string>('vk');
    if (!vkB64) throw new Error('Chiave biometrica non disponibile');
    await this.openVault(C.unb64(vkB64));
  }

  private async openVault(raw: Uint8Array) {
    this.vaultKeyRaw = raw;
    this.vk = await C.importVaultKey(raw);
    const cache: Cache | null = JSON.parse(localStorage.getItem(LS_CACHE) ?? 'null');
    if (cache) {
      this.entries.set(await C.decryptEntries(this.vk, cache.blob));
      this.version = cache.version;
      this.dirty = cache.dirty;
    } else {
      const remote = await this.api.getVault();   // cache locale persa: riparto dal server
      this.entries.set(await C.decryptEntries(this.vk, remote.vault_blob));
      this.version = remote.version;
      this.dirty = false;
      this.writeCache(remote.vault_blob);
    }
    this.status.set('unlocked');
    void this.sync();
  }

  lock() {
    if (this.status() !== 'unlocked') return;
    this.vaultKeyRaw?.fill(0);
    this.vaultKeyRaw = null;
    this.vk = null;
    this.entries.set([]);
    this.status.set('locked');
  }

  async forgotPin() {
    await sdel('pin'); await sdel('vk'); await sdel('pinFails');
    this.bioEnabled.set(false);
    this.status.set('setup');
  }

  private async wipeLocal() {
    localStorage.removeItem(LS_CACHE);
    await this.forgotPin();
  }

  async logout() {
    try { await SecureStorage.clear(); } catch { /* niente */ }
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_CACHE);
    this.api.tokens = null;
    this.profile = null;
    this.entries.set([]);
    this.vk = null; this.vaultKeyRaw = null;
    this.status.set('setup');
  }

  // ---------- dati e sincronizzazione ----------

  async upsert(entry: C.Entry) {
    entry.updatedAt = Date.now();
    this.entries.set([...this.entries().filter((e) => e.id !== entry.id), entry]);
    await this.commit();
  }

  async remove(id: string) {
    const tomb: C.Entry = { id, title: '', username: '', password: '', updatedAt: Date.now(), deleted: true };
    this.entries.set(this.entries().map((e) => (e.id === id ? tomb : e)));
    await this.commit();
  }

  private async commit() {
    this.dirty = true;
    this.writeCache(await C.encryptEntries(this.vk!, this.entries()));
    try { await this.push(); } catch (e) { this.netError(e); }
  }

  async sync() {
    if (!this.vk) return;
    try {
      const remote = await this.api.getVault();
      if (remote.version !== this.version) {
        const remoteItems = await C.decryptEntries(this.vk, remote.vault_blob);
        this.entries.set(this.dirty ? C.mergeEntries(this.entries(), remoteItems) : remoteItems);
        this.version = remote.version;
        if (!this.dirty) this.writeCache(remote.vault_blob);
      }
      if (this.dirty) await this.push();
      this.online.set(true);
    } catch (e) { this.netError(e); }
  }

  private async push() {
    for (let i = 0; i < 3; i++) {
      const blob = await C.encryptEntries(this.vk!, this.entries());
      try {
        const r = await this.api.putVault(blob, this.version);
        this.version = r.version;
        this.dirty = false;
        this.writeCache(blob);
        this.online.set(true);
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {   // un altro dispositivo ha salvato: unisco e riprovo
          const remote = await this.api.getVault();
          const remoteItems = await C.decryptEntries(this.vk!, remote.vault_blob);
          this.entries.set(C.mergeEntries(this.entries(), remoteItems));
          this.version = remote.version;
          continue;
        }
        throw e;
      }
    }
  }

  private writeCache(blob: string) {
    const c: Cache = { blob, version: this.version, dirty: this.dirty };
    localStorage.setItem(LS_CACHE, JSON.stringify(c));
  }

  private netError(e: unknown) {
    this.online.set(false);
    console.warn('Sync non riuscita', e);
  }
}
