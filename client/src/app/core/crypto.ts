import { argon2id } from 'hash-wasm';

export interface KdfParams {
  algorithm: 'argon2id';
  memory_kib: number;
  iterations: number;
  parallelism: number;
}

/** Parametri per la master password (devono rispettare i limiti del server). */
export const DEFAULT_KDF: KdfParams = { algorithm: 'argon2id', memory_kib: 65536, iterations: 3, parallelism: 4 };
/** Parametri più leggeri per il PIN locale (protetto anche da Keystore/Keychain + limite tentativi). */
export const PIN_KDF: KdfParams = { algorithm: 'argon2id', memory_kib: 32768, iterations: 3, parallelism: 1 };

type Bytes = Uint8Array<ArrayBuffer>;
const te = new TextEncoder();
const td = new TextDecoder();

export const b64 = (u: Uint8Array): string => {
  let s = '';
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
export const unb64 = (s: string): Bytes => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const randomBytes = (n: number): Bytes => crypto.getRandomValues(new Uint8Array(n));

export interface DerivedKeys {
  authKey: string;      // va al server per il login
  encKey: CryptoKey;    // non lascia mai il dispositivo
}

/** master password -> Argon2id -> HKDF -> { auth_key, enc_key } */
export async function deriveKeys(password: string, saltB64: string, kdf: KdfParams): Promise<DerivedKeys> {
  const master = await argon2id({
    password: password.normalize('NFKC'),
    salt: unb64(saltB64),
    parallelism: kdf.parallelism,
    iterations: kdf.iterations,
    memorySize: kdf.memory_kib,
    hashLength: 32,
    outputType: 'binary',
  });
  const hkdfKey = await crypto.subtle.importKey('raw', master as Bytes, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (label: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: te.encode(label) });
  const authBits = await crypto.subtle.deriveBits(params('auth'), hkdfKey, 256);
  const encKey = await crypto.subtle.deriveKey(params('enc'), hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  master.fill(0);
  return { authKey: b64(new Uint8Array(authBits)), encKey };
}

/** AES-256-GCM: restituisce base64(nonce[12] || ciphertext+tag). */
export async function seal(key: CryptoKey, data: Uint8Array): Promise<string> {
  const nonce = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data as Bytes));
  const out = new Uint8Array(12 + ct.length);
  out.set(nonce);
  out.set(ct, 12);
  return b64(out);
}

export async function open(key: CryptoKey, blob: string): Promise<Bytes> {
  const raw = unb64(blob);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12)));
}

export const importVaultKey = (raw: Uint8Array) =>
  crypto.subtle.importKey('raw', raw as Bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

// ---------- contenuto del vault ----------

export interface Entry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  updatedAt: number;
  deleted?: boolean; // "tombstone" per sincronizzare le cancellazioni
}

export async function encryptEntries(key: CryptoKey, entries: Entry[]): Promise<string> {
  return seal(key, te.encode(JSON.stringify({ v: 1, items: entries })));
}

export async function decryptEntries(key: CryptoKey, blob: string): Promise<Entry[]> {
  const json = JSON.parse(td.decode(await open(key, blob)));
  return json.items as Entry[];
}

/** Unisce due liste: per ogni id vince la modifica più recente. */
export function mergeEntries(a: Entry[], b: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of [...a, ...b]) {
    const cur = map.get(e.id);
    if (!cur || e.updatedAt > cur.updatedAt) map.set(e.id, e);
  }
  return [...map.values()];
}

// ---------- sblocco rapido con PIN ----------

export interface PinWrap { salt: string; kdf: KdfParams; blob: string }

export async function wrapWithPin(pin: string, vaultKeyRaw: Uint8Array): Promise<PinWrap> {
  const salt = b64(randomBytes(16));
  const { encKey } = await deriveKeys(pin, salt, PIN_KDF);
  return { salt, kdf: PIN_KDF, blob: await seal(encKey, vaultKeyRaw) };
}

/** Lancia un errore se il PIN è sbagliato (il tag GCM non torna). */
export async function unwrapWithPin(pin: string, w: PinWrap): Promise<Bytes> {
  const { encKey } = await deriveKeys(pin, w.salt, w.kdf);
  return open(encKey, w.blob);
}

// ---------- generatore ----------

export function generatePassword(length = 20, symbols = true): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' + (symbols ? '!@#$%^&*-_=+?' : '');
  const limit = 256 - (256 % chars.length); // rejection sampling: nessun bias
  let out = '';
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < limit && out.length < length) out += chars[b % chars.length];
    }
  }
  return out;
}
