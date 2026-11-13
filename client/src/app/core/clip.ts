import { Clipboard } from '@capacitor/clipboard';

let timer: ReturnType<typeof setTimeout> | undefined;

/** Copia negli appunti e li svuota dopo 30 secondi. */
export async function copyText(text: string): Promise<void> {
  await Clipboard.write({ string: text });
  clearTimeout(timer);
  timer = setTimeout(() => Clipboard.write({ string: '' }).catch(() => {}), 30_000);
}
