# Canva pesmarica

V to mapo pridejo izvožene strani iz Canve kot slike.

Aplikacija pričakuje imena:

- `page-01.png`
- `page-02.png`
- `page-03.png`
- ...

Najhitrejši postopek:

1. V Canvi izberi `Natisni`.
2. Izberi `Shrani kot PDF`.
3. V glavni mapi projekta zaženi:

```powershell
.\import_canva_pdf.bat "C:\pot\do\pesmarica.pdf"
```

Ko bo dodan backend, bo te datoteke osvežil samodejno iz Canve. V statični `index.html` verziji brskalnik ne more sam varno poklicati tvojega Canva računa, zato ta mapa predstavlja lokalni cache originalnih Canva strani.
