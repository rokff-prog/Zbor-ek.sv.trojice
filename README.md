# Zborček Sv. Trojice

Lokalni prototip aplikacije za otroški zborček: pesmi, načrt svete maše, osnovni urejevalnik akordov, udeleženci in tiskalni pogled.

## Zagon

Odpri `index.html` v brskalniku.

Podatki se shranjujejo lokalno v brskalniku (`localStorage`). Gumba v zgornjem desnem kotu omogočata izvoz in uvoz JSON datoteke.

## Uvoz pesmarice iz Canve

1. V Canvi izberi `Natisni`.
2. Kot cilj izberi `Shrani kot PDF`.
3. Shrani PDF na računalnik.
4. Zaženi:

```powershell
.\import_canva_pdf.bat "C:\pot\do\pesmarica.pdf"
```

Skript razreže PDF v slike `assets/canva-songbook/page-01.png`, `page-02.png`, ... Aplikacija jih nato v zavihku `Pesmarica` prikaže z originalnim Canva oblikovanjem.

Tisk iz aplikacije je pripravljen po 2 strani na en A4 list. Če želiš isto pesem natisniti večkrat, pri njej samo nastavi število izvodov.

## Naslednji koraki

- Uvoz pesmi iz Google Docs v strukturirane zapise.
- Uvoz pesmi, kategorij in maš iz Google Sheets.
- Natančnejši urejevalnik akordov z akordi kot pozicijami nad zlogi.
- Povezava pesmi s stranmi v Canva pesmarici.
- Prijava in zaščita osebnih podatkov udeležencev.
