# Torneo Tennis

Web app React/PWA basata sul file fornito.

## Avvio sul PC
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

La cartella `dist/` generata è pronta per essere pubblicata su un hosting statico.

## Smartphone
Per installarla come app sul telefono, pubblica la build su un hosting HTTPS (es. un servizio di hosting statico) e apri l'indirizzo dal telefono. Dal browser puoi poi usare "Aggiungi alla schermata Home" / "Installa app".

## Dati
I dati del torneo vengono salvati con `localStorage` sul dispositivo/browser. Non sono sincronizzati tra telefoni.
