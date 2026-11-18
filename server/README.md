# Guardia Di Porta – Server
Il server gestisce le richieste del client del Password Manager Zero-Knowledge e fornisce le API necessarie per l'autenticazione e la gestione delle credenziali.

### Avvio del server
Il server viene eseguito tramite Docker Compose ed è in ascolto sulla porta `8000`.

#### Per il primo avvio, eseguire:

```bash
docker compose up -d --build
```

Questo comando crea e avvia i container, effettuando anche la build iniziale delle immagini.

#### Per gli avvii successivi è sufficiente utilizzare:
```bash
docker compose up -d
```
È possibile omettere il flag `-d` per avviare i container senza modalità detached e visualizzare direttamente i log nel terminale:
```bash
docker compose up
```

### Note
Assicurarsi che Docker e Docker Compose siano installati e funzionanti prima di avviare il server.