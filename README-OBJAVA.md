# Objava aplikacije

Aplikacija je pripravljena za Firebase Hosting. Spletni obiskovalec privzeto vidi samo zavihka Pesmarica in Koledar. Na `localhost` je zaradi razvoja samodejno vklopljen skrbniški pogled; javni pogled lokalno preveriš na `http://127.0.0.1:8765/?public=1`.

## Google prijava

1. V Firebase Console ustvari projekt in spletno aplikacijo.
2. V Authentication > Sign-in method omogoči Google.
3. V `auth-config.js` namesto `firebase: null` prilepi Firebase konfiguracijo spletne aplikacije.
4. V `adminEmails` vpiši e-poštne naslove vseh skrbnikov.

Primer:

```js
window.ZBORCEK_AUTH_CONFIG = {
  firebase: {
    apiKey: "...",
    authDomain: "...firebaseapp.com",
    projectId: "...",
    appId: "...",
  },
  adminEmails: ["ime@gmail.com"],
};
```

## Objava

1. Namesti Firebase CLI: `npm install -g firebase-tools`
2. Prijavi se: `firebase login`
3. Poveži projekt: `firebase use --add`
4. Preveri lokalno: `firebase emulators:start --only hosting`
5. Objavi: `firebase deploy --only hosting`

Datoteka `zborcek-predstavitev-pesmarica.js` vsebuje 29 trenutno uvoženih PDF-strani in mora biti vedno objavljena skupaj z aplikacijo.

## Pomembno

Trenutna različica skrbniške spremembe hrani v brskalniku. Za skupno urejanje več skrbnikov je naslednji korak povezava podatkov s Cloud Firestore in Storage; Google prijava sama po sebi še ne sinhronizira sprememb med računalniki.
