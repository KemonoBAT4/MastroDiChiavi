# Mastro Di Chiavi – Client
L'applicazione è un client per un Password Manager Zero-Knowledge, progettato per garantire la massima riservatezza e sicurezza delle credenziali salvate.

### Funzionamento
1. `Creazione account:` tramite l'apposito pulsante, l'utente registra un account inserendo il proprio indirizzo email e una Master Password.
2. `Codice di accesso:` successivamente, viene creato un codice associato all'indirizzo email, da utilizzare per gli accessi quotidiani.
3. `Login:` per accedere, è necessario inserire l'indirizzo IP del server e le credenziali precedentemente create.
4. `Gestione password:` una volta autenticato, l'utente può creare, visualizzare e modificare le proprie password salvate.

### Sicurezza
Grazie all'architettura Zero-Knowledge, le password archiviate sono accessibili esclusivamente all'utente in possesso delle credenziali necessarie. Il server non deve poter conoscere il contenuto delle credenziali salvate in chiaro.