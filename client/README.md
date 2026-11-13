# Vault app (Ionic + Angular + Capacitor)

Client mobile del password manager. Cifra tutto sul dispositivo (Argon2id + AES-256-GCM) e parla col server `vault-server`.

## Provarlo subito nel browser
1. Nel `.env` del server aggiungi `CORS_ORIGINS=http://localhost:4200` e riavvia (`docker compose up -d`).
2. Qui: `npm install --legacy-peer-deps` e poi `npm start`.
3. Apri http://localhost:4200 (meglio in modalità mobile: F12 → icona telefono).
4. "Crea account" con server `http://localhost:8000`, poi scegli il codice di sblocco.
   Nel browser l'impronta non è disponibile: si usa il codice.

> Apri sempre da `localhost` o da HTTPS: la crittografia del browser (WebCrypto) non funziona su `http://192.168.x.x`.

## Sul telefono Android
```
npm run build
npx cap add android
npx cap sync
npx cap open android      # Android Studio: Run sul telefono collegato
```
- Il telefono deve raggiungere il server: stessa Wi-Fi + nel `docker-compose.yml` del server cambia `127.0.0.1:8000:8000` in `8000:8000`, oppure usa Tailscale/WireGuard.
- Per provare con `http://IP:8000` (senza HTTPS) aggiungi `android:usesCleartextTraffic="true"` al tag `<application>` di `android/app/src/main/AndroidManifest.xml`. Per l'uso reale metti il server dietro HTTPS.
- iOS: `npm i @capacitor/ios && npx cap add ios` (serve un Mac).

## Cosa fa
- Elenco password con ricerca, tocco per espandere, **copia con un tocco** (appunti cancellati dopo 30 s).
- **Occhio in alto**: mostra tutte le password nell'elenco.
- Aggiungi / modifica / elimina, con generatore di password.
- Sblocco con codice a 6 cifre e impronta; blocco dopo 5 codici errati, in background e dopo 2 minuti di inattività.
- Funziona offline: i dati restano cifrati sul telefono e si sincronizzano col server appena possibile (merge per voce se modifichi da due dispositivi).

## Non ancora fatto
Cambio master password dall'app, chiave di recupero, blocco screenshot (`FLAG_SECURE`), autofill di sistema, import/export.
