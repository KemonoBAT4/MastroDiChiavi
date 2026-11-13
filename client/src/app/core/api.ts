import { Injectable } from '@angular/core';
import { KdfParams } from './crypto';

export interface Tokens { access_token: string; refresh_token: string }
export interface LoginResult extends Tokens { protected_vault_key: string; vault_blob: string; version: number }

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === 'string' ? detail : (detail as any)?.error ?? 'Errore');
  }
}

@Injectable({ providedIn: 'root' })
export class Api {
  baseUrl = '';
  tokens: Tokens | null = null;
  onTokens: (t: Tokens | null) => void = () => {};
  private refreshing: Promise<boolean> | null = null;

  private setTokens(t: Tokens | null) {
    this.tokens = t;
    this.onTokens(t);
  }

  private async raw(method: string, path: string, body: unknown, auth: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && this.tokens) headers['Authorization'] = 'Bearer ' + this.tokens.access_token;
    const res = await fetch(this.baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* risposta non JSON */ }
    return { res, data };
  }

  private async req<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    let { res, data } = await this.raw(method, path, body, auth);
    if (res.status === 401 && auth && this.tokens && (await this.refresh())) {
      ({ res, data } = await this.raw(method, path, body, auth));
    }
    if (!res.ok) throw new ApiError(res.status, data?.detail ?? res.statusText);
    return data as T;
  }

  private refresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        const { res, data } = await this.raw('POST', '/refresh', { refresh_token: this.tokens!.refresh_token }, false);
        if (!res.ok) { this.setTokens(null); return false; }
        this.setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
        return true;
      } catch { return false; } finally { this.refreshing = null; }
    })();
    return this.refreshing;
  }

  prelogin(email: string) {
    return this.req<{ salt: string; kdf_params: KdfParams }>('POST', '/prelogin', { email }, false);
  }
  register(body: unknown) {
    return this.req<unknown>('POST', '/register', body, false);
  }
  async login(email: string, authKey: string) {
    const r = await this.req<LoginResult>('POST', '/login', { email, auth_key: authKey }, false);
    this.setTokens({ access_token: r.access_token, refresh_token: r.refresh_token });
    return r;
  }
  getVault() {
    return this.req<{ vault_blob: string; version: number }>('GET', '/vault');
  }
  putVault(vaultBlob: string, baseVersion: number) {
    return this.req<{ version: number }>('PUT', '/vault', { vault_blob: vaultBlob, base_version: baseVersion });
  }
}
