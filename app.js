const MASS_PARTS = [
  "Vstopna",
  "Gospod usmili se",
  "Slava",
  "Psalm",
  "Aleluja",
  "Darovanje",
  "Svet",
  "Jagnje Božje",
  "Obhajilo",
  "Zaključek",
];

const STORAGE_KEY = "zborcek-sv-trojice-v2";
const CANVA_DESIGN_URL = "https://www.canva.com/design/DAG0E3TU2Go/ohP3lnBwbOauFqYY09DBcw/edit";
const CANVA_PAGE_COUNT = 33;
const CANVA_DB = "zborcek-canva-pages";
const CANVA_STORE = "pages";
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
const GOOGLE_CALENDAR_ID = "2103b0e25cf9502a583ece20c9286ad5ae4b33d41d001fd381c82531a359d34f@group.calendar.google.com";
const GOOGLE_CALENDAR_TIMEZONE = "Europe/Ljubljana";

let canvaPageImages = new Map();

const importedChordSheets = {
  "Ves dan vso noč": `E
Ves dan, vso noč
A                        E
angeli bdijo nad menoj, Gospod.
E                          H7                   E
Ves dan, vso noč angeli, varujte me!

E
Sonce kmalu bo zašlo,
A                               E
angeli bdijo nad menoj, Gospod.
E                                 H7
Čuvaj me to noč, moj Bog,
                        E
angeli varujte me!`,
  "On nosi ves svet": `C
On nosi cel svet v rokah.
G
On nosi cel svet v rokah.
C
On nosi cel svet v rokah.
G7                     C
On nosi cel svet v rokah.

C
On nosi dež in veter v rokah.
G
On nosi dež in veter v rokah.
C
On nosi dež in veter v rokah.
G7                     C
On nosi cel svet v rokah.`,
  "Aleluja, naše veselje": `C       F
Alelu - aleluja,
C       G
Alelu - aleluja,
C       F
Alelu - aleluja,
C   G       C
Aleluja.

C          F        G        C
Naše veselje ne bo se končalo,
a                  d           G        C
ne bo se končalo in se ne konča.   (2x)`,
  "Hozana (Oče tebi izročam vse)": `C              G          C
Oče, tebi izročam se,
          F     G     a
tebi povzdigujem glas,
           C  G        C
ljubim te in te častim,
F                 G        C
daj, da te ne izgubim.

G                a
Hozana, hozana,
F                    C
polna slave nebesa so.
G                a
Hozana, hozana,
C        G           C
ti na zemlji prepevamo.`,
  "Dal si čisto mi srce": `D
Dal si čisto mi srce,
        G7
dal odprte mi roke,
          D                                A7
dal si čustva mi in dal si mi razum.

D                            G           D
Zato bom vedno hodil za Teboj,
D                                          A7
zato bom vedno hodil za Teboj.
D                  D7
Evangelij bom živel,
G                        G7
alelujó Ti bom pel
D                A7           D
in vedno hodil za Teboj.`,
  "Darujem ti ljubezen": `E                     A              H
Darujem Ti ljubezen, ki v meni živi,
E              A             H
sprejmi ta dar, Gospod.
E                  A            H            cis
Tu je moja sreča, vse moje skrbi,
A                 H             E
vsak utrip srca darujem Ti.

A            H             E
Ti, Gospod, si v tem kruhu in vinu,
A               H              E
tu tvoje je telo in tvoja kri.`,
  "Pesem vesela naj gospoda slavi": `G
Pesem vesela naj Gospoda slavi:
D7             G
Aleluja, aleluja!
Z nami zapojte pesem radostno vsi:
A7         D7
Ale, aleluja!

G
Svet je njegova roka
D               G
ustvarila za nas ljudi,
na svod pripel je zvezde,
   D7             G
da v noči svetijo.`,
  "Če imate usta": `(D)    G                  A           D
Če roke imate, bratu pomagajte,
    G                  A           D
če ušesa imate, brata poslušajte,
   e                           A               D A h
in če noge imate, k bratu pojdite,
          G                  A           D
če imate usta, slavite Boga!

                 e      A           D
Če imate usta, če imate usta
h                 e          A              D
če imate usta, slavite Boga!`,
  "Povej naprej!": `D                            h               G         A
Povej naprej, da v ljubezni ni sovraštva, krivi.
D                        h                   G       A
Povej naprej, da v ljubezni prav nihče ne trpi.
G                    D         e         D
Če rad bi spremenil na zemlji stvari,
D                       h                   G          D
povej naprej, da z ljubeznijo se svet spremeni.`,
  "Sem jaz (družinica)": `C
Sem jaz, sem jaz, sem jaz, gradim prijateljstvo.
G7
Sem jaz, sem jaz, sem jaz, gradim prijateljstvo.
C
Sem jaz, sem jaz, sem jaz, gradim prijateljstvo.
G7                                      C
Sem jaz, gradim prijateljstvo.

C7             F
La, la, la.  Pojdi kamorkoli,
C                       G
pojdi vsepovsod in v srcu svojem
         C     C7
gradi si prijateljstvo.`,
  "Gospod usmili se": `F                   B
Gospod, usmili se,
C                F
Gospod, usmili se.   (2x)

F                   B
Kristus, usmili se,
C                 F
Kristus, usmili se.   (2x)

F                   B
Gospod, usmili se,
C                F
Gospod, usmili se.   (2x)`,
  "Jagnje Božje (Jemec)": `C                    G       F                   G
Jagnje Božje, ki odjemlješ greh sveta,
C                    G         F                  G
Jagnje Božje, ki odjemlješ greh sveta,
     a            F        d7     G
usmili se nas, usmili se nas.
      a        F            d         A7
Usmili se nas, usmili se nas.

E                    H      A                   H
Jagnje Božje, ki odjemlješ greh sveta,
E                    H      A                   H
Jagnje Božje, ki odjemlješ greh sveta,
    a                A  A                H       E
Podari nam mir, podari nam mir.`,
  "Vsa ljudstva ploskajte": `D
Vsa ljudstva ploskajte z rokami,
G             D              A      D
vriskajte Bogu z veselím glasom.

D
Gospod je kralj, Gospod je kralj,
G                D A  D
Gospod je kralj vesoljá.
D
Prepevajte, prepevajte,
G                D A  D
prepevajte Gospodu.`,
  "Poslušajte vsi ljudje": `C             G          C                          G        C
Poslušajte, vsi ljudje, sveti Jožef v mesto gre.
            G         C                       G              C
Sveti Jožef in Marija gresta v mesto Betlehem.   (2x)

C                        G   C                    G   C
Ko pa v mesto prideta, prenočišče iščeta.
            G            C                        G         C
Oj, ti mesto betlehemsko, da nas nočeš prenočit.   (2x)`,
  "Glej zvezdice Božje": `C                                      G             C
Glej, zvezdice božje migljajo lepo,
     Dm      G                 Am      G
odprto široko je sveto nebo.

G                C             G       C
Duhovi nebeški se z raja vrste,
F            C              G            C
prepevajo slavo, na zemljo hite.   2X`,
  "Tam stoji pa hlevček": `C
Tam stoji pa hlevček (2x)
C                G        C
Lepi hlevček Betlehem. (2x)

Notri je Marija, detece povija,
Sveto dete Jezusa. (2x)

Tam hite pastirci, tam hite pastirci,
v lepi hlevček Betlehem. (2x)`,
  "Kaj se vam zdi, pastirci vi": `C
Kaj se vam zdi pastirci vi,
G               C
al ste kaj slišali?
C
Veseli glas gre dol do nas,
G                               C
z nebes veseli glas.

G                   C
Gloria in excelsis Deo,
G                 C
tako angelci pojejo.`,
  "Sveta noč": `A                                E            A
Sveta noč, blažena noč vse že spi, je polnoč,
D                A                    D                A
le devica z Jožefom tam, v hlevcu varje detece nam.
E                        A                      E          A
spavaj dete sladko, spavaj dete sladko.`,
  "Slavi ga, slavi ga": `E
Slavi ga, slavi ga,
A                                         E
ko se zbuja jutro, ko zvoni opoldne.
                       H7                            E
Slavi ga, slavi ga, kadar zvezde zažare.

Moli ga ...
Ljubi ga ...
Hvali ga ...
Jezus ...
Moj Gospod in moj Bog ...`,
  "Ko čutiš to": `G              D
Ko čutiš to, da tvoja pot
C                                G
je v tem, da bitje našel si,
D
ki se mu želiš darovat,
C        D7          G
ga vedno prvi ljubil ti.

G                            C
Ljubi ne čakaj, da ljubljen boš sam,
D7                     G   D7
nihče ti branit ne more.
G                             C
Ljubi, kjer tema je, delal boš dan,
D7                             G
Lahko boš premikal gore. 2x`,
  "Ti naša mati ljubljena": `G                               a
Ti naša Mati ljubljena, si od Boga izvoljena.
C                                     a              D7
Ti polna vseh si milosti, zdaj k tebi prihitim.

G      e      a            D7    G      e        a            D7
Ave, ave, ave Marija, prosi, prosi, prosi za nas.
G      e      a            D7    G      e        a            D7
Ave, ave, ave Marija, prosi, prosi, prosi za nas
G   C G
Boga.`,
  "Naj te pozdravim": `D              G             D                A
Naj te pozdravim Sveta Gospa
h        G            D        A
in Kraljica nebeška, Mati si Božja.
D              G            D        A
Vedno ostaneš sveta Devica,
h        G            D          A
saj Oče nebeški te je blagoslovil.`,
  "O Marija (Kako si lepa)": `C                        F                C
O Marija, o Marija, o Marija, o Marija,
G7   C
kako si lepa ti!

F                                G
Zvezde se nad glavo ti bleščijo,
G7                           C
angeli te s pesmijo slavijo,
D7        G                    G7  C
o Marija, o, Marija, kako si lepa ti!`,
  "Kličem \"svet si\"": `E                            H      E
Poklonim se, vse izročim
A        H
k Jezusovim nogam:
E                     H      E
ljubezni moč, usmiljenje
A        H
k Jezusovim nogam.

A                         H
Kličem: »Svet si, svet si, svet si!«
A                         H
Kličem: »Svet si, svet si, svet si!«
E
Ti, Gospod!`,
  "Mamica je kakor zarja": `G                                                D
Mamica je kakor zarja, zjutraj se smehlja,
D7                C   D        G
ko se v postelji še dete s sanjami igra.
C                D7        G
in zato nikdar mamice ne dam,
D                   D7                C   D     G
eno le na svetu širnem mamico imam.`,
  "Mi se imamo radi": `C                                   G
Mi se imamo radi, radi, radi, radi.
G                                    C
Mi se imamo radi, radi, radi, radi.
C                                   G
Mi se imamo radi, radi, radi radi.
G                                    C
Mi se imamo radi, radi prav zares.`,
  "Glori, glori aleluja": `G
Jezus, zate smo se tukaj zbrali vsi,
C                                    G
o ja, verjamemo, da si z nami Ti!
G
Slavimo, da si smrt premagal,
D                          G
Aleluja naj zdaj doni!

G
Glory, glory, aleluja,
C                      G
glory, glory, aleluja,
G
glory, glory, aleluja,
D                           G
Jezus vstal je, on živi!`,
  "Aleluja (Jezus Kristus je naš Rešenik)": `F
Jezus Kristus je naš Rešenik
C
Jezus Kristus je vstal in živi,
d                                B C    F
s svojim križem premagal je smrt, aleluja.

F                  C                d             B C    F
Aleluja (3x), aleluja (3x), aleluja (3x), aleluja.`,
  "Jezus, hvala za sonce": `G                    D
Jezus, hvala za sonce,
G                    D
Jezus, hvala za sončno kremo,
G                    D
Jezus, hvala za morski vonj po sončni kremi,
C                        D
Hvala, hvala, hvala, hvala ti!
C                        D  D7
Hvala, hvala, hvala, hvala ti!
G                D        C      D          G    D
Vsak dan podarjaš svoje nam darove.`
};

function makeSeedSongs(rows) {
  return rows.map((row, index) => ({
    id: crypto.randomUUID(),
    songNumber: row.songNumber || index + 1,
    title: row.title,
    categories: row.categories,
    link: row.link || "",
    page: row.page,
    canvaPage: row.page,
    canvaImage: row.page ? `assets/canva-songbook/page-${String(row.page).padStart(2, "0")}.png` : "",
    known: row.known,
    inBook: row.inBook,
    lyrics: "",
    chords: row.chords || "",
    inlineChords: row.chords ? convertChordSheetToInline(row.chords) : "",
  }));
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”»«]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function lyricsFromChordSheet(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => !looksLikeChordLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSlovenianDate(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function findSongIdByTitle(data, title) {
  const key = normalizeTitle(title);
  if (!key) return "";
  const exact = data.songs.find((song) => normalizeTitle(song.title) === key);
  if (exact) return exact.id;
  const loose = data.songs.find((song) => normalizeTitle(song.title).includes(key) || key.includes(normalizeTitle(song.title)));
  return loose?.id || "";
}

function findSongIdsInCell(data, value) {
  const cell = normalizeTitle(value);
  if (!cell) return [];
  const exact = findSongIdByTitle(data, value);
  if (exact && normalizeTitle(data.songs.find((song) => song.id === exact)?.title) === cell) return [exact];

  const matches = data.songs
    .filter((song) => {
      const title = normalizeTitle(song.title);
      return title.length >= 5 && cell.includes(title);
    })
    .sort((a, b) => normalizeTitle(b.title).length - normalizeTitle(a.title).length);
  return [...new Set(matches.map((song) => song.id))];
}

function makeImportedMassHistory(data, rows) {
  return rows.map((row) => {
    const selections = {};
    const additionalSelections = {};
    MASS_PARTS.forEach((part, index) => {
      const songIds = findSongIdsInCell(data, row[index + 1]);
      selections[part] = songIds[0] || "";
      additionalSelections[part] = songIds.slice(1);
    });
    return {
      date: parseSlovenianDate(row[0]),
      note: "uvoženo iz preglednice NASTOPI",
      selections,
      additionalSelections,
      source: "NASTOPI",
      importVersion: 4,
    };
  }).filter((entry) => entry.date && Object.values(entry.selections).some(Boolean));
}

function applyImportedChords(data) {
  const byTitle = new Map(data.songs.map((song) => [normalizeTitle(song.title), song]));

  for (const [title, chords] of Object.entries(importedChordSheets)) {
    const key = normalizeTitle(title);
    let song = byTitle.get(key);
    if (!song) {
      song = {
        id: crypto.randomUUID(),
        title,
        categories: [],
        link: "",
        page: null,
        known: false,
        inBook: false,
        lyrics: "",
        chords: "",
      };
      data.songs.push(song);
      byTitle.set(key, song);
    }
    song.chords = chords.trim();
    song.lyrics = lyricsFromChordSheet(chords);
    song.inlineChords = convertChordSheetToInline(song.chords);
    song.importedFromDocs = true;
  }

  data.songs = [...byTitle.values()];
  return data;
}

const seedData = {
  songs: makeSeedSongs([
    { title: "Aleluja Jubilate", page: 1, inBook: false, known: false, categories: ["Aleluja", "Velikonočne"] },
    { title: "Aleluja, naše veselje", page: 2, inBook: true, known: true, categories: ["Aleluja", "Velikonočne"], chords: "C       F\nAlelu - aleluja,\nC       G\nAlelu - aleluja,\nC   G       C\nAleluja." },
    { title: "Bojim se samote", page: 3, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Če letal bi", page: 4, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Dal si čisto mi srce", page: 5, inBook: false, known: false, categories: ["Aleluja"] },
    { title: "Danes je dan", page: 6, inBook: false, known: false, categories: ["Vstopna", "Zaključek"] },
    { title: "Darujem ti ljubezen", page: 7, inBook: true, known: true, categories: ["Darovanje"] },
    { title: "Hozana (Oče tebi izročam vse)", page: 8, inBook: false, known: false, categories: ["Slava"] },
    { title: "Hvalnico pojem Bogu", page: 9, inBook: false, known: false, categories: ["Slava"] },
    { title: "Jezus Kristus je naš rešenik", page: 10, inBook: false, known: false, categories: ["Aleluja"] },
    { title: "Jezus ljubi vse otroke", page: 11, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Jezus moj ljubim te", page: 12, inBook: false, known: false, categories: ["Obhajilo"] },
    { title: "Jezus oprosti mi", page: 13, inBook: false, known: false, categories: ["Obhajilo", "Zaključek"] },
    { title: "Kakor je bil ta kruh", page: 14, inBook: false, known: false, categories: ["Darovanje"] },
    { title: "Kličem \"svet si\"", page: 15, inBook: true, known: true, categories: ["Svet"] },
    { title: "Ko čutiš to", page: 16, inBook: true, known: true, categories: ["Vstopna", "Psalm", "Obhajilo", "Zaključek"] },
    { title: "Ko jezus je začel učiti", page: 17, inBook: false, known: false, link: "https://jubilate.donbosko.si/song/116", categories: ["Vstopna", "Psalm", "Zaključek"] },
    { title: "Ko življenje (Sanje)", page: 18, inBook: false, known: false, categories: ["Obhajilo", "Zaključek"] },
    { title: "Mlado še dekle", page: 19, inBook: false, known: false, categories: ["Psalm", "Zaključek", "Marijine"] },
    { title: "Mnogo poti", page: 20, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Mnogo sem prehodil poti (Ni več tavanja)", page: 21, inBook: false, known: false, categories: ["Vstopna", "Zaključek"] },
    { title: "Na poti skozi življenje", page: 22, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Nad vsem", page: 23, inBook: false, known: false, categories: ["Obhajilo", "Zaključek", "Postne"] },
    { title: "Naj bo lep ta dan", page: 24, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Cvet dišeč", page: 25, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Nihče ne ljubi te kot jaz", page: 26, inBook: false, known: false, categories: ["Obhajilo"] },
    { title: "O gospod studenec vse dobrote", page: 27, inBook: false, known: false, categories: ["Vstopna", "Psalm", "Zaključek"] },
    { title: "Oče tebi izročam se", page: 28, inBook: false, known: false, categories: ["Slava"] },
    { title: "Odrini na globoko", page: 29, inBook: false, known: false, categories: ["Vstopna", "Psalm", "Zaključek"] },
    { title: "On nosi ves svet", page: 30, inBook: true, known: true, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Pesem vesela naj gospoda slavi", page: 31, inBook: true, known: true, categories: ["Vstopna", "Velikonočne"] },
    { title: "Peter skala", page: 32, inBook: false, known: false, categories: ["Vstopna", "Psalm", "Zaključek"] },
    { title: "Bog je z nami (Petje ptičev)", page: 33, inBook: false, known: false, categories: ["Vstopna", "Zaključek"] },
    { title: "Poglej to lučko", page: 34, inBook: false, known: false, categories: ["Božične"] },
    { title: "Pojdi v popolnem miru", page: 35, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Povzdigujem tvoje ime", page: 36, inBook: false, known: false, categories: ["Slava", "Zaključek"] },
    { title: "Pridi k nam gospod", page: 37, inBook: false, known: false, categories: ["Vstopna", "Obhajilo"] },
    { title: "Pridi, sveti duh, luč srca", page: 38, inBook: false, known: false, categories: ["Vstopna"] },
    { title: "Pričeval ljubezen bom", page: 39, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Rad bi te videl", page: 40, inBook: false, known: false, categories: ["Obhajilo", "Zaključek"] },
    { title: "Res velik si Bog", page: 41, inBook: false, known: false, categories: ["Obhajilo", "Zaključek"] },
    { title: "Sem jaz (družinica)", page: 42, inBook: true, known: true, categories: ["Vstopna", "Zaključek"] },
    { title: "Slavi ga, slavi ga", page: 43, inBook: true, known: true, categories: ["Slava"] },
    { title: "Svetel plamen", page: 44, inBook: false, known: false, categories: ["Vstopna", "Obhajilo", "Zaključek"] },
    { title: "Ti si moj prijatelj", page: 45, inBook: false, known: false, categories: ["Obhajilo"] },
    { title: "Ti si ta luč sveta", page: 46, inBook: false, known: false, categories: ["Vstopna", "Obhajilo"] },
    { title: "Tu sta dva krokodila", page: 47, inBook: false, known: false, categories: ["Vstopna", "Psalm", "Obhajilo"] },
    { title: "Tu smo zbrani", page: 48, inBook: false, known: false, categories: ["Vstopna", "Gospod usmili se"] },
    { title: "Ves dan vso noč", page: 49, inBook: true, known: true, categories: ["Vstopna", "Zaključek"] },
    { title: "Vlij mi olja", page: 50, inBook: false, known: false, categories: ["Slava"] },
    { title: "Zamenjam vse skrbi", page: 51, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Zdaj sem tu, moj Bog", page: 52, inBook: false, known: false, categories: ["Vstopna", "Obhajilo"] },
    { title: "Življenje je dar", page: 53, inBook: false, known: false, categories: ["Obhajilo", "Zaključek"] },
    { title: "Življenje v tebi", page: 54, inBook: false, known: false, categories: [] },
    { title: "Ko so pastirji", page: 55, inBook: false, known: false, categories: ["Božične"] },
    { title: "Nikoli slabe volje", page: 56, inBook: false, known: false, categories: ["Zaključek"] },
    { title: "Noč se spušča", page: 57, inBook: false, known: false, categories: ["Božične"] },
    { title: "Gledam te (božična)", page: 58, inBook: false, known: false, categories: ["Božične"] },
    { title: "Dajte gospodu čast", page: 59, inBook: false, known: false, categories: ["Psalm"] },
    { title: "Hozana (Svet si ti naš Gospod)", page: 60, inBook: true, known: true, categories: ["Svet"] },
    { title: "Jagnje Božje (Jemec)", page: 61, inBook: true, known: true, link: "https://jubilate.donbosko.si/song/384", categories: ["Jagnje Božje"] },
    { title: "Gospod usmili se", page: 62, inBook: true, known: true, link: "https://jubilate.donbosko.si/song/439", categories: ["Gospod usmili se"] },
    { title: "Ti si moja Gospa", page: 63, inBook: false, known: false, categories: ["Marijine"] },
    { title: "Če imate usta", page: 64, inBook: true, known: true, categories: ["Vstopna", "Obhajilo"] },
    { title: "Povej naprej!", page: 65, inBook: true, known: true, link: "https://jubilate.donbosko.si/song/450", categories: ["Zaključek"] },
    { title: "Tam stoji pa hlevček", page: 66, inBook: true, known: true, categories: ["Božične"] },
    { title: "Glej zvezdice Božje", page: 68, inBook: true, known: true, categories: ["Božične"] },
    { title: "Sveta noč", page: 70, inBook: true, known: true, categories: ["Zaključek", "Božične"] },
    { title: "Danes je zasijala luč", page: 71, inBook: false, known: false, categories: ["Božične"] },
    { title: "Kaj se vam zdi, pastirci vi", page: 72, inBook: true, known: true, categories: ["Slava", "Božične"] },
    { title: "Jezus adoramus te", page: 73, inBook: false, known: false, categories: ["Božične"] },
    { title: "Si videl zvezdice", page: 74, inBook: false, known: false, categories: ["Božične"] },
    { title: "Vsa ljudstva ploskajte", page: 75, inBook: true, known: true, link: "https://jubilate.donbosko.si/song/331", categories: ["Psalm"] },
    { title: "Poslušajte vsi ljudje", page: 76, inBook: true, known: true, categories: ["Božične"] },
    { title: "O Marija (Kako si lepa)", page: 77, inBook: true, known: true, link: "https://jubilate.donbosko.si/song/202", categories: ["Zaključek", "Marijine"] },
    { title: "Dotik nebes", page: 78, inBook: false, known: false, link: "https://jubilate.donbosko.si/song/63", categories: ["Vstopna", "Marijine"] },
    { title: "Lepa si", page: 79, inBook: false, known: false, categories: ["Vstopna", "Marijine"] },
    { title: "Mali cvet", page: 80, inBook: false, known: false, categories: ["Vstopna", "Marijine"] },
    { title: "Ti, ki si na svet prinesla sonce (Zate, Marija)", page: 81, inBook: false, known: false, categories: ["Vstopna", "Marijine"] },
    { title: "Ti naša mati ljubljena", page: 83, inBook: false, known: false, categories: ["Vstopna", "Marijine"] },
    { title: "Ti si šel na križ", page: 84, inBook: false, known: false, categories: ["Postne"] },
    { title: "Vstal je kakor je rekel", page: 86, inBook: false, known: false, categories: ["Velikonočne"] },
    { title: "Sta šla učenca (Emavs)", page: 87, inBook: false, known: false, categories: ["Velikonočne"] },
    { title: "Spremenil srca je", page: 88, inBook: false, known: false, categories: ["Velikonočne"] },
    { title: "O moj Bog, dopusti mi", page: 90, inBook: false, known: false, categories: ["Velikonočne"] },
    { title: "Da, Gospod, dober si", page: 91, inBook: false, known: false, categories: ["Velikonočne"] },
    { title: "Aleluja (Taizejska)", page: 92, inBook: false, known: false, categories: ["Psalm", "Velikonočne"] },
    { title: "Aleluja (Jezus Kristus je naš Rešenik)", page: 93, inBook: true, known: true, categories: ["Psalm", "Velikonočne"] },
    { title: "Ko bi ljudje ljubili se", page: 94, inBook: false, known: false, categories: ["Božične"] },
    { title: "Jezus, hvala za sonce", page: 95, inBook: true, known: true, categories: ["Zaključek"] },
    { title: "Naj te pozdravim", page: 96, inBook: true, known: true, categories: ["Vstopna", "Marijine"] },
  ]),
  people: [
    { id: crypto.randomUUID(), name: "Eneja", age: "10 let", parents: "", notes: "" },
    { id: crypto.randomUUID(), name: "Nuša", age: "10 let", parents: "", notes: "" },
    { id: crypto.randomUUID(), name: "Anja", age: "9 let", parents: "", notes: "" },
  ],
  mass: {
    date: "2026-06-14",
    note: "zaključna maša",
    selections: {},
  },
  massHistory: [],
};

applyImportedChords(seedData);

for (const part of MASS_PARTS) {
  seedData.mass.selections[part] = "";
}
seedData.mass.selections["Vstopna"] = seedData.songs.find((song) => song.title === "Ko čutiš to").id;
seedData.mass.selections["Aleluja"] = seedData.songs.find((song) => song.title === "Aleluja, naše veselje").id;
seedData.mass.selections["Darovanje"] = seedData.songs.find((song) => song.title === "Darujem ti ljubezen").id;
seedData.mass.selections["Obhajilo"] = seedData.songs.find((song) => song.title === "On nosi ves svet").id;
seedData.mass.selections["Zaključek"] = seedData.songs.find((song) => song.title === "Jezus, hvala za sonce").id;
seedData.massHistory = makeImportedMassHistory(seedData, [
  ["7.12.2025", "Če imate usta", "Gospod usmili se", "", "vsa ljudstva ploskajte", "Aleluja, naše veselje", "Darujem ti ljubezen", "Hozana (Svet si ti naš Gospod)", "Jagnje Božje (Jemec)", "On nosi ves svet", "Ves dan vso noč"],
  ["24.12.2025", "Poslušajte vsi ljudje", "Gospod usmili se", "Kaj se vam zdi, pastirci vi", "vsa ljudstva ploskajte", "Aleluja, naše veselje", "Darujem ti ljubezen", "Hozana (Svet si ti naš Gospod)", "Jagnje Božje (Jemec)", "Tam stoji pa hlevček, On nosi ves svet, Če imate usta", "Sveta noč"],
  ["1.2.2026", "Ves dan vso noč", "Gospod usmili se", "Slavi ga, slavi ga", "Ko čutiš to", "Aleluja, naše veselje", "Darujem ti ljubezen", "Hozana (Svet si ti naš Gospod)", "Jagnje Božje (Jemec)", "On nosi ves svet", "Sem jaz (družinica)"],
  ["22.3.2026", "Če imate usta", "Gospod usmili se", "Slavi ga, slavi ga", "Ko čutiš to", "", "Darujem ti ljubezen", "Kličem \"svet si\"", "Jagnje Božje (Jemec)", "On nosi ves svet", "Povej naprej!"],
  ["3.5.2026", "Pesem vesela naj gospoda slavi", "Gospod usmili se", "Slavi ga, slavi ga", "Vsa ljudstva ploskajte", "Aleluja, naše veselje", "Darujem ti ljubezen", "Kličem \"svet si\"", "Jagnje Božje (Jemec)", "On nosi ves svet", "O Marija (Kako si lepa)"],
  ["7.6.2026", "Ves dan vso noč", "Gospod usmili se", "Slavi ga, slavi ga", "Ko čutiš to", "Aleluja (Jezus Kristus je naš Rešenik)", "Darujem ti ljubezen", "Kličem \"svet si\"", "Jagnje Božje (Jemec)", "On nosi ves svet", "Jezus, hvala za sonce"],
  ["14.6.2026", "Naj te pozdravim", "Gospod usmili se", "Slavi ga, slavi ga", "Ko čutiš to", "Aleluja (Jezus Kristus je naš Rešenik)", "Darujem ti ljubezen", "Kličem \"svet si\"", "Jagnje Božje (Jemec)", "On nosi ves svet", "Jezus, hvala za sonce"],
  ["3.10.2026", "Ko čutiš to", "Gospod usmili se", "Slavi ga, slavi ga", "Vsa ljudstva ploskajte", "Aleluja, naše veselje", "Darujem ti ljubezen", "Kličem \"svet si\"", "Jagnje Božje (Jemec)", "On nosi ves svet", "Sem jaz (družinica)"],
]);

let state = loadState();
let selectedSongId = state.songs[0]?.id || null;
let selectedSongbookPageId = null;
let selectedChordSongId = null;
let currentChordTokens = [];
let activeChordInputIndex = null;
let visibleMassMonth = state.mass?.date ? state.mass.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
let isAdminView = Boolean(window.zborcekAuth?.state?.isAdmin);
migrateState();

const viewTitles = {
  mass: "Načrt svete maše",
  songs: "Pesmi",
  songbook: "Pesmarica",
  chords: "Urejevalnik akordov",
  calendar: "Koledar dogodkov",
  people: "Udeleženci",
  print: "Tiskanje",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedData);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(seedData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
}

function migrateState() {
  state.massHistory = Array.isArray(state.massHistory) ? state.massHistory : [];
  const refreshedImportedDates = new Set();
  for (const seedEntry of seedData.massHistory || []) {
    const entry = structuredClone(seedEntry);
    for (const part of MASS_PARTS) {
      const seedSong = seedData.songs.find((song) => song.id === seedEntry.selections?.[part]);
      entry.selections[part] = seedSong ? findSongIdByTitle(state, seedSong.title) : "";
      entry.additionalSelections[part] = (seedEntry.additionalSelections?.[part] || []).map((seedId) => {
        const additionalSeedSong = seedData.songs.find((song) => song.id === seedId);
        return additionalSeedSong ? findSongIdByTitle(state, additionalSeedSong.title) : "";
      }).filter(Boolean);
    }
    const existing = state.massHistory.find((item) => item.date === entry.date);
    const importedCount = Object.values(entry.selections || {}).filter(Boolean).length;
    const existingCount = Object.values(existing?.selections || {}).filter(Boolean).length;
    if (!existing) state.massHistory.push(structuredClone(entry));
    else if (existingCount < importedCount || (existing.source === "NASTOPI" && Number(existing.importVersion || 0) < Number(entry.importVersion || 0))) {
      Object.assign(existing, structuredClone(entry));
      refreshedImportedDates.add(entry.date);
    }
  }
  if (state.mass?.date && Object.values(state.mass.selections || {}).some(Boolean) && !state.massHistory.some((item) => item.date === state.mass.date)) {
    state.massHistory.push({
      date: state.mass.date,
      note: state.mass.note || "",
      selections: { ...(state.mass.selections || {}) },
      source: "app",
    });
  }
  const currentMassEntry = state.massHistory.find((item) => item.date === state.mass?.date);
  const currentSelectionCount = Object.values(state.mass?.selections || {}).filter(Boolean).length;
  const historySelectionCount = Object.values(currentMassEntry?.selections || {}).filter(Boolean).length;
  if (currentMassEntry && (currentSelectionCount < historySelectionCount || refreshedImportedDates.has(state.mass?.date))) {
    state.mass.note = currentMassEntry.note || state.mass.note || "";
    state.mass.selections = { ...currentMassEntry.selections };
    state.mass.additionalSelections = structuredClone(currentMassEntry.additionalSelections || {});
  }
  if (state.canvaPages?.length) {
    state.canvaPages = state.canvaPages.map((page) => ({
      ...page,
      canvaDbPage: page.canvaDbPage || page.page,
    }));
  }
  let touched = false;
  state.songs = state.songs.map((song) => {
    if (song.inlineChords || !song.chords) return song;
    touched = true;
    return { ...song, inlineChords: convertChordSheetToInline(song.chords) };
  });
  if (touched) persist();
  if (!state.songNumbersAssigned) {
    state.songs.forEach((song, index) => {
      if (!song.songNumber) song.songNumber = index + 1;
    });
    state.songNumbersAssigned = true;
    persist();
  }
  if (!state.songNumbersSyncedToSheetRows) {
    state.songs.forEach((song) => {
      if (Number(song.page)) song.songNumber = Number(song.page);
    });
    state.songNumbersSyncedToSheetRows = true;
    persist();
  }
  if (state.songbookDefaultsZero) {
    persist();
    return;
  }
  state.songbookCopies = state.songbookCopies || {};
  for (const key of Object.keys(state.songbookCopies)) state.songbookCopies[key] = 0;
  if (state.canvaPages?.length) {
    state.canvaPages = state.canvaPages.map((page) => ({ ...page, copies: 0 }));
  }
  state.songs = state.songs.map((song) => ({
    ...song,
    inlineChords: song.inlineChords || convertChordSheetToInline(song.chords || ""),
  }));
  state.songbookDefaultsZero = true;
  persist();
}

function openCanvaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CANVA_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(CANVA_STORE, { keyPath: "page" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCanvaPageImage(page, blob) {
  const db = await openCanvaDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(CANVA_STORE, "readwrite");
    tx.objectStore(CANVA_STORE).put({ page, blob, updatedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadCanvaPageImages() {
  const db = await openCanvaDb();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(CANVA_STORE, "readonly");
    const request = tx.objectStore(CANVA_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();

  const bundledSongs = window.ZBORCEK_SONGBOOK?.songs || [];
  if (!records.length && bundledSongs.length) {
    canvaPageImages = new Map(bundledSongs
      .filter((song) => song.imageDataUrl)
      .map((song) => [Number(song.page || song.number), song.imageDataUrl]));
    state.canvaPages = bundledSongs.map((song, index) => ({
      id: `canva-page-${Number(song.page || index + 1)}`,
      page: Number(song.page || index + 1),
      canvaDbPage: Number(song.page || index + 1),
      title: song.title || `Canva stran ${index + 1}`,
      copies: 0,
    })).sort((a, b) => a.page - b.page);
    return;
  }

  for (const url of canvaPageImages.values()) URL.revokeObjectURL(url);
  canvaPageImages = new Map(records.map((record) => [record.page, URL.createObjectURL(record.blob)]));

  if (records.length && (!state.canvaPages || state.canvaPages.length !== records.length)) {
    state.canvaPages = records
      .map((record) => ({
        id: `canva-page-${record.page}`,
        page: record.page,
        canvaDbPage: record.page,
        title: `Canva stran ${record.page}`,
        copies: 0,
      }))
      .sort((a, b) => a.page - b.page);
    persist();
  }
}

function setPdfImportStatus(message) {
  const status = $("#pdfImportStatus");
  if (status) status.textContent = message;
}

function syncCanvaSongbook({ silent = false } = {}) {
  const seen = new Set();
  const uniqueSongs = [];

  for (const song of state.songs) {
    const key = normalizeTitle(song.title);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSongs.push(song);
  }

  state.songs = uniqueSongs.map((song) => ({
    ...song,
    canvaDesignUrl: song.inBook ? CANVA_DESIGN_URL : song.canvaDesignUrl || "",
    canvaPage: song.canvaPage || song.page || null,
    canvaImage: song.canvaImage || (song.inBook && song.page ? `assets/canva-songbook/page-${String(song.page).padStart(2, "0")}.png` : ""),
  }));
  state.canva = {
    designUrl: CANVA_DESIGN_URL,
    pageCount: CANVA_PAGE_COUNT,
    lastChecked: new Date().toISOString(),
    note: "Statični prototip deduplicira po naslovu. Živa Canva sinhronizacija potrebuje backend.",
  };
  ensureSongbookCopies();
  persist();

  const status = $("#syncStatus");
  if (status) {
    const importedCount = state.songs.filter((song) => song.inBook).length;
    status.textContent = `Canva: ${CANVA_PAGE_COUNT} strani, ${importedCount} povezanih pesmi`;
  }
  if (!silent) renderAll();
}

function songById(id) {
  return state.songs.find((song) => song.id === id);
}

function songbookSongForPage(page) {
  if (page.songId) {
    const linkedSong = songById(page.songId);
    if (linkedSong) return linkedSong;
  }
  const pageNumber = Number(page.canvaPage || page.page || 0);
  const titleKey = normalizeTitle(page.title);
  return state.songs.find((song) => normalizeTitle(song.title) === titleKey)
    || state.songs.find((song) => Number(song.page || 0) === pageNumber)
    || null;
}

function nextSongNumber() {
  return Math.max(0, ...state.songs.map((song) => Number(song.songNumber || 0))) + 1;
}

function numberForSongbookItem(item, fallback = item?.page || "") {
  const song = state.canvaPages?.length ? songbookSongForPage(item) : songById(item.id);
  return song?.songNumber || item.songNumber || fallback;
}

function ensureSongForSongbookPage(page) {
  let song = songbookSongForPage(page);
  if (!song) {
    song = {
      id: crypto.randomUUID(),
      songNumber: nextSongNumber(),
      title: page.title || `Canva stran ${page.page}`,
      categories: [],
      link: "",
      page: page.page,
      canvaPage: page.page,
      known: false,
      inBook: true,
      lyrics: "",
      chords: "",
      inlineChords: "",
    };
    state.songs.push(song);
  }

  page.songId = song.id;
  song.inBook = true;
  song.canvaPage = page.page;
  if (!song.page) song.page = page.page;
  if (!page.title || /^Canva stran \d+$/i.test(page.title)) page.title = song.title;
  return song;
}

function ensureSongbookCopies() {
  state.songbookCopies = state.songbookCopies || {};
  for (const song of state.songs) {
    if (!song.inBook) continue;
    if (state.songbookCopies[song.id] === undefined) state.songbookCopies[song.id] = 0;
  }
}

async function blobUrlToDataUrl(url) {
  const blob = await fetch(url).then((response) => response.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function imageUrlToDataUrl(url) {
  if (String(url || "").startsWith("data:image/")) return url;
  const response = await fetch(url);
  if (!response.ok) return "";
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function presentationSongbookPayload() {
  const pages = state.canvaPages?.length
    ? state.canvaPages.slice().sort((a, b) => a.page - b.page)
    : state.songs.filter((song) => song.inBook).sort((a, b) => (a.songNumber || 9999) - (b.songNumber || 9999));
  const songs = [];
  const bundledPayload = window.ZBORCEK_SONGBOOK;
  const bundledIsCurrent = Boolean(bundledPayload?.exportedAt && !state.canva?.needsPresentationExport);
  const bundledByPage = new Map((bundledPayload?.songs || []).map((song) => [Number(song.page || song.number), song.imageDataUrl || ""]));

  for (const [index, page] of pages.entries()) {
    setPdfImportStatus(`Pripravljam stran ${index + 1} od ${pages.length} ...`);
    const song = state.canvaPages?.length ? ensureSongForSongbookPage(page) : page;
    const imageUrl = state.canvaPages?.length ? canvaPageImages.get(Number(page.canvaDbPage || page.page)) : page.canvaImage;
    let imageDataUrl = bundledIsCurrent ? bundledByPage.get(Number(page.page || song.page || 0)) || "" : "";
    if (!imageDataUrl && imageUrl) {
      try {
        imageDataUrl = await imageUrlToDataUrl(imageUrl);
      } catch {
        imageDataUrl = "";
      }
    }
    songs.push({
      number: Number(song.songNumber || song.page || page.page),
      title: song.title || page.title || `Pesem ${page.page}`,
      body: song.lyrics || song.title || "",
      mode: "children",
      imageDataUrl,
      page: Number(page.page || song.page || 0),
    });
  }

  return {
    type: "zborcek-predstavitev",
    exportedAt: new Date().toISOString(),
    songs,
  };
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveSongbookToSongs() {
  setPdfImportStatus("Shranjujem pesmarico in pripravljam predvajalnik ...");
  try {
    let added = 0;
    let updated = 0;
    if (state.canvaPages?.length) {
      for (const page of state.canvaPages) {
        const before = page.songId && songById(page.songId);
        const song = ensureSongForSongbookPage(page);
        if (before) updated += 1;
        else added += 1;
        song.inBook = true;
        song.canvaPage = page.page;
        song.page = Number(song.page || page.page);
        song.songNumber = Number(song.songNumber || song.page || page.page || nextSongNumber());
      }
    } else {
      for (const song of state.songs) {
        if (!song.inBook) continue;
        song.songNumber = Number(song.songNumber || song.page || nextSongNumber());
        updated += 1;
      }
    }
    ensureSongbookCopies();
    persist();
    const payload = await presentationSongbookPayload();
    state.canva = { ...(state.canva || {}), needsPresentationExport: false, lastPresentationExport: payload.exportedAt };
    persist();
    try { localStorage.removeItem("zborcek-usb-predvajalnik"); } catch {}
    downloadTextFile(
      "zborcek-predstavitev-pesmarica.js",
      `window.ZBORCEK_SONGBOOK = ${JSON.stringify(payload)};`,
      "text/javascript",
    );
    setPdfImportStatus(`Pesmarica pripravljena: ${added} novih, ${updated} posodobljenih pesmi. Prenesena je datoteka zborcek-predstavitev-pesmarica.js.`);
    renderAll();
  } catch (error) {
    setPdfImportStatus(`Shranjevanje ni uspelo: ${error.message}`);
  }
}

function setView(view) {
  if (!isAdminView && !["songbook", "calendar"].includes(view)) view = "songbook";
  $$(".view").forEach((node) => node.classList.toggle("active", node.id === view));
  $$(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
  $("#viewTitle").textContent = viewTitles[view];
  if (view === "print") renderPrint();
  if (view === "calendar") renderCalendar();
}

function applyAccessMode(authState = {}) {
  isAdminView = Boolean(authState.isAdmin);
  document.body.classList.toggle("admin-mode", isAdminView);
  document.body.classList.toggle("public-mode", !isAdminView);
  const identity = $("#adminIdentity");
  if (identity) identity.textContent = authState.email || "Skrbnik";
  const activeView = $(".view.active")?.id;
  if (!isAdminView && !["songbook", "calendar"].includes(activeView)) setView("songbook");
}

function renderMass() {
  const savedMass = state.massHistory.find((item) => item.date === state.mass.date);
  const currentMassSongs = Object.values(state.mass.selections || {}).filter(Boolean).length;
  const savedMassSongs = Object.values(savedMass?.selections || {}).filter(Boolean).length;
  if (savedMass && currentMassSongs < savedMassSongs) {
    state.mass.note = savedMass.note || state.mass.note || "";
    state.mass.selections = { ...savedMass.selections };
    state.mass.additionalSelections = structuredClone(savedMass.additionalSelections || {});
    persist();
  }
  $("#massDate").value = state.mass.date || "";
  $("#massNote").value = state.mass.note || "";
  renderMassCalendar();
  $("#massSlots").innerHTML = MASS_PARTS.map((part) => {
    const selectedIds = [state.mass.selections[part], ...(state.mass.additionalSelections?.[part] || [])].filter(Boolean);
    const selectIds = selectedIds.length ? selectedIds : [""];
    const selects = selectIds.map((selectedId, index) => {
      const options = state.songs
        .filter((song) => song.inBook || song.id === selectedId)
        .slice()
        .sort((a, b) => (a.songNumber || 9999) - (b.songNumber || 9999) || a.title.localeCompare(b.title, "sl"))
        .map((song) => `<option value="${song.id}" ${selectedId === song.id ? "selected" : ""}>${escapeHtml(`${song.songNumber || ""}. ${song.title}`)}</option>`)
        .join("");
      return `<select data-mass-part="${escapeHtml(part)}" data-mass-index="${index}"><option value="">Izberi pesem</option>${options}</select>`;
    }).join("");

    return `
      <div class="slot">
        <h3>${escapeHtml(part)}</h3>
        ${selects}
      </div>
    `;
  }).join("");
}

function hasMassSongs(entry) {
  return Object.values(entry?.selections || {}).some(Boolean);
}

function saveMassToHistory() {
  if (!state.mass.date || !Object.values(state.mass.selections || {}).some(Boolean)) return;
  const existing = state.massHistory.find((item) => item.date === state.mass.date);
  const entry = {
    date: state.mass.date,
    note: state.mass.note || "",
    selections: { ...state.mass.selections },
    additionalSelections: structuredClone(state.mass.additionalSelections || {}),
    source: existing?.source || "app",
    importVersion: existing?.importVersion,
  };
  if (existing) Object.assign(existing, entry);
  else state.massHistory.push(entry);
}

function renderMassCalendar() {
  const calendar = $("#massCalendar");
  const title = $("#massCalendarTitle");
  if (!calendar || !title) return;
  const [year, month] = visibleMassMonth.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const firstDay = (monthDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const historyByDate = new Map(state.massHistory.filter(hasMassSongs).map((entry) => [entry.date, entry]));
  const formatter = new Intl.DateTimeFormat("sl-SI", { month: "long", year: "numeric" });

  title.textContent = formatter.format(monthDate);
  const cells = ["pon", "tor", "sre", "čet", "pet", "sob", "ned"].map((day) => `<span class="calendar-weekday">${day}</span>`);
  for (let i = 0; i < firstDay; i += 1) cells.push(`<span class="calendar-empty"></span>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${visibleMassMonth}-${String(day).padStart(2, "0")}`;
    const entry = historyByDate.get(date);
    cells.push(`
      <button class="calendar-day ${entry ? "has-mass" : ""} ${state.mass.date === date ? "active" : ""}" type="button" data-mass-date="${date}" title="${entry ? escapeAttr(entry.note || "Shranjena maša") : ""}">
        <span>${day}</span>
      </button>
    `);
  }
  calendar.innerHTML = cells.join("");
}

function moveMassMonth(delta) {
  const [year, month] = visibleMassMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  visibleMassMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  renderMassCalendar();
}

function loadMassFromHistory(date) {
  const entry = state.massHistory.find((item) => item.date === date);
  state.mass.date = date;
  if (entry) {
    state.mass.note = entry.note || "";
    state.mass.selections = { ...entry.selections };
    state.mass.additionalSelections = structuredClone(entry.additionalSelections || {});
  } else {
    state.mass.note = "";
    state.mass.selections = Object.fromEntries(MASS_PARTS.map((part) => [part, ""]));
    state.mass.additionalSelections = {};
  }
  visibleMassMonth = date.slice(0, 7);
  persist();
  renderMass();
  renderPrint();
}

function autosaveMassFromForm() {
  state.mass.date = $("#massDate").value;
  state.mass.note = $("#massNote").value;
  state.mass.additionalSelections = {};
  MASS_PARTS.forEach((part) => {
    const values = $$(`[data-mass-part="${part}"]`).map((select) => select.value).filter(Boolean);
    state.mass.selections[part] = values[0] || "";
    state.mass.additionalSelections[part] = values.slice(1);
  });
  if (state.mass.date) visibleMassMonth = state.mass.date.slice(0, 7);
  saveMassToHistory();
  persist();
  renderMassCalendar();
  renderPrint();
}

function renderSongs() {
  const query = $("#songSearch")?.value?.trim().toLowerCase() || "";
  const songs = state.songs
    .filter((song) => song.title.toLowerCase().includes(query))
    .sort((a, b) => a.title.localeCompare(b.title, "sl"));

  $("#songList").innerHTML = songs.map((song) => `
    <button class="song-item ${song.id === selectedSongId ? "active" : ""}" data-song-id="${song.id}">
      <strong>${escapeHtml(song.title)}</strong>
      <span class="muted">${song.inBook ? `stran ${song.page || "?"}` : "ni v otroški pesmarici"}</span>
      <span class="chips">
        ${song.categories.map((cat) => `<span class="chip">${escapeHtml(cat)}</span>`).join("")}
        ${song.importedFromDocs ? `<span class="chip">akordi</span>` : ""}
        ${song.inBook ? `<span class="chip">Canva</span>` : ""}
      </span>
    </button>
  `).join("");

  fillSongForm();
  renderChords();
}

function getSongbookSongs() {
  const query = normalizeTitle($("#songbookSearch")?.value || "");
  const massPart = $("#songbookMassPart")?.value || "";
  if (state.canvaPages?.length) {
    return state.canvaPages
      .filter((page) => {
        const song = songbookSongForPage(page);
        const title = normalizeTitle(song?.title || page.title);
        return title.includes(query) || String(page.page).includes(query);
      })
      .filter((page) => {
        if (!massPart) return true;
        const song = songbookSongForPage(page);
        return song?.categories?.includes(massPart);
      })
      .sort((a, b) => a.page - b.page);
  }
  return state.songs
    .filter((song) => song.inBook)
    .filter((song) => normalizeTitle(song.title).includes(query))
    .filter((song) => !massPart || song.categories.includes(massPart))
    .sort((a, b) => (a.page || 9999) - (b.page || 9999) || a.title.localeCompare(b.title, "sl"));
}

function renderSongbookMassPartFilter() {
  const select = $("#songbookMassPart");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Vsi deli</option>${MASS_PARTS.map((part) => `<option value="${escapeAttr(part)}">${escapeHtml(part)}</option>`).join("")}`;
  select.value = MASS_PARTS.includes(current) ? current : "";
}

function renderSongbook() {
  ensureSongbookCopies();
  renderSongbookMassPartFilter();
  const songs = getSongbookSongs();
  if (!songs.some((song) => song.id === selectedSongbookPageId)) {
    selectedSongbookPageId = null;
  }
  $(".songbook-workspace")?.classList.toggle("editing", Boolean(selectedSongbookPageId));
  $("#songbookPages").innerHTML = songs.map((song, index) => `
    <article class="songbook-card ${song.id === selectedSongbookPageId ? "active" : ""}">
      <button class="songbook-image-button" type="button" data-songbook-open="${song.id}">
        <span class="song-number">${escapeHtml(numberForSongbookItem(song, index + 1))}</span>
        ${renderCanvaPage(song)}
      </button>
      <div class="songbook-card-controls">
        <label>
          Izvodov
          <div class="stepper" data-stepper="${song.id}">
            <button type="button" data-copy-step="${song.id}" data-delta="-1">-</button>
            <input type="number" min="0" max="50" value="${getSongbookCopies(song)}" data-songbook-copy="${song.id}" />
            <button type="button" data-copy-step="${song.id}" data-delta="1">+</button>
          </div>
        </label>
      </div>
    </article>
  `).join("");
  renderSongbookEditor();
  renderSongbookPrint();
}

function currentSongbookPage() {
  if (!state.canvaPages?.length) return null;
  return state.canvaPages.find((page) => page.id === selectedSongbookPageId) || null;
}

function renderSongbookEditor() {
  const form = $("#songbookEditor");
  if (!form) return;
  const page = currentSongbookPage();

  if (!page) {
    form.classList.add("empty", "hidden");
    $("#songbookTitle").value = "";
    $("#songbookPageNumber").value = "";
    $("#songbookLink").value = "";
    $("#songbookMassParts").innerHTML = "";
    return;
  }

  selectedSongbookPageId = page.id;
  const song = ensureSongForSongbookPage(page);
  form.classList.remove("empty", "hidden");
  $("#songbookTitle").value = song.title;
  $("#songbookPageNumber").value = page.page || song.page || "";
  $("#songbookLink").value = song.link || "";
  $("#songbookMassParts").innerHTML = MASS_PARTS.map((part) => `
    <label class="checkbox">
      <input type="checkbox" value="${escapeAttr(part)}" ${song.categories.includes(part) ? "checked" : ""} />
      ${escapeHtml(part)}
    </label>
  `).join("");
}

function getSongbookCopies(item) {
  if (state.canvaPages?.length) return Number(item.copies || 0);
  return Number(state.songbookCopies?.[item.id] || 0);
}

function renderSongbookLyrics(song) {
  const text = (song.lyrics || song.title).trim();
  const lines = text.split("\n").filter(Boolean).slice(0, 18);
  return `<pre>${escapeHtml(lines.join("\n"))}</pre>`;
}

function renderCanvaPage(song) {
  const page = escapeHtml(String(song.canvaPage || song.page || "?"));
  const pageNumber = Number(song.canvaDbPage || song.canvaPage || song.page || 0);
  const image = canvaPageImages.get(pageNumber) || song.canvaImage || "";
  const linkedSong = state.canvaPages?.length ? songbookSongForPage(song) : null;
  const title = linkedSong?.title || song.title;
  const fallback = `
    <div class="canva-missing">
      <span>Canva stran ${page}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>Manjka izvožena slika strani.</p>
    </div>
  `;

  if (!image) return `<div class="canva-page-frame">${fallback}</div>`;

  return `
    <div class="canva-page-frame">
      <img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" loading="lazy" onerror="this.parentElement.classList.add('missing'); this.remove();" />
      ${fallback}
    </div>
  `;
}

async function importCanvaPdf(file) {
  if (!file) return;
  setPdfImportStatus("Uvažam PDF iz Canve ...");

  try {
    const pdfjs = await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    const importedPages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setPdfImportStatus(`Uvažam stran ${pageNumber} od ${pdf.numPages} ...`);
      const page = await pdf.getPage(pageNumber);
      const title = await extractPdfPageTitle(page, pageNumber);
      const viewport = page.getViewport({ scale: 2.3 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      await saveCanvaPageImage(pageNumber, blob);
      importedPages.push({
        id: `canva-page-${pageNumber}`,
        page: pageNumber,
        canvaDbPage: pageNumber,
        title,
        copies: 0,
      });
    }

    state.canvaPages = importedPages;
    state.canva = {
      ...(state.canva || {}),
      designUrl: CANVA_DESIGN_URL,
      pageCount: pdf.numPages,
      importedPdfName: file.name,
      lastImported: new Date().toISOString(),
      needsPresentationExport: true,
    };
    persist();
    await loadCanvaPageImages();
    renderSongbook();
    setPdfImportStatus(`Uvoženo: ${importedPages.length} strani iz ${file.name}`);
  } catch (error) {
    console.error(error);
    setPdfImportStatus("PDF-ja nisem mogel uvoziti. Preveri internetno povezavo in da je datoteka PDF iz Canve.");
  }
}

async function extractPdfPageTitle(page, pageNumber) {
  try {
    const content = await page.getTextContent();
    const lines = [];
    const grouped = new Map();

    for (const item of content.items || []) {
      const text = String(item.str || "").trim();
      if (!text) continue;
      const y = Math.round(item.transform?.[5] || 0);
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y).push(text);
    }

    for (const y of [...grouped.keys()].sort((a, b) => b - a)) {
      const line = grouped.get(y).join(" ").replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
    }

    const ignored = /^(PESMARICA|OTROŠKI PEVSKI ZBOR|SV\. TROJICE|V HALOZAH|[0-9]+)$/i;
    const title = lines.find((line) => line.length >= 3 && line.length <= 70 && !ignored.test(line));
    return title || `Canva stran ${pageNumber}`;
  } catch {
    return `Canva stran ${pageNumber}`;
  }
}

function renderSongbookPrint() {
  ensureSongbookCopies();
  const printablePages = [];
  const sourcePages = state.canvaPages?.length
    ? state.canvaPages.slice().sort((a, b) => a.page - b.page)
    : state.songs.filter((item) => item.inBook).sort((a, b) => (a.page || 9999) - (b.page || 9999));

  for (const song of sourcePages) {
    const count = getSongbookCopies(song);
    for (let i = 0; i < count; i += 1) printablePages.push(song);
  }

  const sheets = [];
  for (let i = 0; i < printablePages.length; i += 2) sheets.push(printablePages.slice(i, i + 2));

  $("#songbookPrint").innerHTML = sheets.map((sheet) => `
    <section class="songbook-print-sheet">
      ${sheet.map((song) => `
        <div class="songbook-print-page">
          <span class="songbook-print-number">${escapeHtml(numberForSongbookItem(song))}</span>
          ${renderCanvaPage(song)}
        </div>
      `).join("")}
    </section>
  `).join("");
}

function fillSongForm() {
  const song = songById(selectedSongId);
  $("#deleteSong").disabled = !song;
  if (!song) {
    $("#songForm").reset();
    return;
  }
  $("#songTitle").value = song.title;
  $("#songCategories").value = song.categories.join(", ");
  $("#songLink").value = song.link || "";
  $("#songPage").value = song.page || "";
  $("#songKnown").checked = Boolean(song.known);
  $("#songInBook").checked = Boolean(song.inBook);
  $("#songLyrics").value = song.lyrics || "";
}

function getChordSongs() {
  const query = normalizeTitle($("#chordSearch")?.value || "");
  return state.songs
    .filter((song) => song.inlineChords || song.chords || song.lyrics)
    .filter((song) => normalizeTitle(song.title).includes(query))
    .sort((a, b) => a.title.localeCompare(b.title, "sl"));
}

function renderChords() {
  const songs = getChordSongs();
  if (!songs.some((song) => song.id === selectedChordSongId)) {
    selectedChordSongId = null;
  }
  $(".chord-workspace")?.classList.toggle("editing", Boolean(selectedChordSongId));

  const pages = $("#chordPages");
  if (pages) {
    pages.innerHTML = songs.map((song, index) => {
      const isActive = song.id === selectedChordSongId;
      const chordText = song.inlineChords || song.chords || song.lyrics || "";
      return `
      <article class="chord-card ${song.id === selectedChordSongId ? "active" : ""}">
        <button class="chord-page-button" type="button" data-chord-open="${song.id}">
          <span class="song-number">${escapeHtml(song.songNumber || index + 1)}</span>
          <div class="chord-sheet ${chordDensityClass(chordText)}">
            <div class="chord-sheet-head">
              <span>${escapeHtml(song.categories[0] || "Akordi")}</span>
              <strong>${escapeHtml(song.title)}</strong>
            </div>
            <div class="chord-sheet-body">${renderChordLines(chordText, isActive)}</div>
          </div>
        </button>
      </article>
    `;
    }).join("");
  }

  renderChordEditor();
  renderChordPrint();
}

function renderChordPrint(songsToPrint = getChordSongs()) {
  const print = $("#chordPrint");
  if (!print) return;
  const songs = songsToPrint;
  print.innerHTML = songs.map((song, index) => `
    <section class="chord-print-page ${chordDensityClass(song.inlineChords || song.chords || song.lyrics || "")}">
      <div class="print-song-number">${escapeHtml(song.songNumber || index + 1)}</div>
      <h1>${escapeHtml(song.title)}</h1>
      <div class="chord-print-body">${renderInlineChordLines(song.inlineChords || song.chords || song.lyrics || "", 999)}</div>
    </section>
  `).join("");
}

function chordDensityClass(text) {
  const lines = normalizeChordInput(text).split("\n");
  const longestLine = lines.reduce((longest, line) => Math.max(longest, line.replace(/\[[^\]]+\]/g, "").length), 0);
  if (lines.length > 28 || longestLine > 72) return "chord-density-tight";
  if (lines.length > 20 || longestLine > 58) return "chord-density-compact";
  return "chord-density-normal";
}

function renderChordPrintPicker() {
  const picker = $("#chordPrintPicker");
  if (!picker) return;
  const songs = getChordSongs();
  picker.innerHTML = songs.map((song, index) => `
    <label class="print-picker-item">
      <input type="checkbox" value="${escapeAttr(song.id)}" />
      <span class="print-picker-number">${escapeHtml(song.songNumber || index + 1)}</span>
      <span>${escapeHtml(song.title)}</span>
    </label>
  `).join("");
}

function renderChordEditor() {
  const song = songById(selectedChordSongId);
  const form = $("#chordEditor");
  if (!form) return;
  if (!song) {
    form.classList.add("empty", "hidden");
    $("#chordTitle").value = "";
    $("#chordText").value = "";
    $("#inlineChordEditor").innerHTML = "";
    return;
  }
  form.classList.remove("empty", "hidden");
  $("#chordTitle").value = song.title;
  $("#chordText").value = normalizeChordInput(song.inlineChords || song.chords || song.lyrics || "");
  renderInlineChordEditor();
}

function renderChordLines(text, expanded = false) {
  const source = normalizeChordInput(text);
  if (source.includes("[")) return renderInlineChordLines(source, expanded ? 999 : 18);
  return String(source || "")
    .split("\n")
    .slice(0, expanded ? 999 : 34)
    .map((line) => {
      const cls = looksLikeChordLine(line) ? "chord-line" : "";
      return `<div class="${cls}">${escapeHtml(line) || "&nbsp;"}</div>`;
    })
    .join("");
}

function looksLikeChordLine(line) {
  const compact = line.trim();
  if (!compact) return false;
  return /^([A-Ha-h](#|b|is|es)?(m|maj|min|sus|dim|aug)?[0-9]?(\/[A-Ha-h](#|b|is|es)?[0-9]?)?|fis|cis|gis|dis|ais|bes|hes)(\s+([A-Ha-h](#|b|is|es)?(m|maj|min|sus|dim|aug)?[0-9]?(\/[A-Ha-h](#|b|is|es)?[0-9]?)?|fis|cis|gis|dis|ais|bes|hes))*$/i.test(compact);
}

function isChordToken(value) {
  return /^([A-Ha-h](#|b|is|es)?(m|maj|min|sus|dim|aug)?[0-9]?(\/[A-Ha-h](#|b|is|es)?[0-9]?)?|fis|cis|gis|dis|ais|bes|hes)$/i.test(String(value || ""));
}

function normalizeChordName(value) {
  const raw = String(value || "").trim();
  const map = {
    cis: "C#",
    dis: "D#",
    fis: "F#",
    gis: "G#",
    ais: "A#",
    bes: "B",
    hes: "H",
  };
  if (map[raw.toLowerCase()]) return map[raw.toLowerCase()];
  return raw;
}

function normalizeChordInput(text) {
  const markdownConverted = String(text || "")
    .replace(/\*\*([^*\n]+)\*\*/g, (_, chord) => isChordToken(chord) ? `[${normalizeChordName(chord)}]` : `**${chord}**`);
  if (markdownConverted.includes("[")) return markdownConverted;
  if (markdownConverted.split("\n").some((line) => looksLikeChordLine(line))) return convertChordSheetToInline(markdownConverted);
  return convertCompactChordText(markdownConverted);
}

function readCompactChord(line, index) {
  const rest = line.slice(index);
  const named = rest.match(/^(fis|cis|gis|dis|ais|bes|hes)(?=\s|[a-zčšžćđ])/i);
  if (named) return named[1];
  const chord = rest.match(/^([A-H](?:#|b|is|es)?(?:m|maj|min|sus|dim|aug)?[0-9]?(?:\/[A-H](?:#|b|is|es)?[0-9]?)?)/);
  if (!chord) return "";
  const token = chord[1];
  const before = index === 0 ? "" : line[index - 1];
  const after = line[index + token.length] || "";
  if (index === 0 || /\s|[a-zčšžćđ.,;:!?')]/.test(before) || /[A-ZČŠŽĆĐ]/.test(token[0])) {
    if (after && !/\s|[a-zčšžćđA-ZČŠŽĆĐ.,;:!?')]/.test(after)) return "";
    return token;
  }
  return "";
}

function convertCompactChordText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      let output = "";
      for (let index = 0; index < line.length; index += 1) {
        const chord = readCompactChord(line, index);
        if (chord) {
          output += `[${normalizeChordName(chord)}]`;
          index += chord.length - 1;
        } else {
          output += line[index];
        }
      }
      return output;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenizeInlineChords(text) {
  const tokens = [];
  for (const line of String(text || "").split("\n")) {
    if (!line.length) {
      tokens.push({ type: "break" });
      continue;
    }
    let pendingChord = "";
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === "[") {
        const end = line.indexOf("]", index + 1);
        if (end > index) {
          pendingChord = line.slice(index + 1, end);
          index = end;
          continue;
        }
      }
      tokens.push({ type: "char", chord: pendingChord, text: line[index] });
      pendingChord = "";
    }
    tokens.push({ type: "break" });
  }
  if (tokens.at(-1)?.type === "break") tokens.pop();
  return tokens;
}

function tokensToInlineText(tokens) {
  const lines = [];
  let line = [];
  for (const token of tokens) {
    if (token.type === "break") {
      lines.push(line.join(""));
      line = [];
      continue;
    }
    line.push(`${token.chord ? `[${token.chord}]` : ""}${token.text}`);
  }
  lines.push(line.join(""));
  return lines.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

function convertChordSheetToInline(text) {
  const lines = String(text || "").split("\n");
  const output = [];
  let pendingChords = [];

  for (const line of lines) {
    if (looksLikeChordLine(line)) {
      pendingChords = line.trim().split(/\s+/).filter(Boolean);
      continue;
    }
    if (!line.trim()) {
      output.push("");
      pendingChords = [];
      continue;
    }
    if (!pendingChords.length) {
      output.push(line.trim());
      continue;
    }
    const words = line.trim().split(/\s+/);
    const spread = Math.max(1, Math.floor(words.length / pendingChords.length));
    for (let index = 0; index < pendingChords.length; index += 1) {
      const wordIndex = Math.min(words.length - 1, index * spread);
      words[wordIndex] = `[${pendingChords[index]}]${words[wordIndex]}`;
    }
    output.push(words.join(" "));
    pendingChords = [];
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function inlineTextToLyrics(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function tokenLines(tokens) {
  const lines = [];
  let line = [];
  tokens.forEach((token, index) => {
    if (token.type === "break") {
      lines.push(line);
      line = [];
      return;
    }
    line.push({ ...token, index });
  });
  lines.push(line);
  return lines;
}

function renderChordLineRow(lineTokens, editable = false) {
  if (!lineTokens.length) return `<div class="inline-chord-line">&nbsp;</div>`;
  const lyric = lineTokens.map((token) => token.text).join("");
  const chords = lineTokens
    .filter((token) => token.chord)
    .map((token) => editable ? `
      <button class="token-chord editable-chord" type="button" draggable="true" data-drag-chord="${token.index}" style="left: ${lineTokens.indexOf(token)}ch" title="Povleci akord na drugo črko">
        ${escapeHtml(token.chord)}<span data-chord-action="remove" data-token-index="${token.index}" title="Odstrani akord">×</span>
      </button>
    ` : `<span class="token-chord" style="left: ${lineTokens.indexOf(token)}ch">${escapeHtml(token.chord)}</span>`)
    .join("");
  const hitTargets = editable ? lineTokens.map((token, index) => `
    <button
      type="button"
      class="char-drop-target"
      data-drop-word="${token.index}"
      style="left: ${index}ch"
      aria-label="Mesto ${index + 1}"
    ></button>
  `).join("") : "";

  return `
    <div class="inline-chord-line">
      <div class="chord-marker-layer">${chords}</div>
      <div class="lyric-run">${escapeHtml(lyric).replace(/ /g, "&nbsp;")}</div>
      ${hitTargets ? `<div class="char-target-layer">${hitTargets}</div>` : ""}
    </div>
  `;
}

function renderInlineChordLines(text, limit = 120) {
  return tokenLines(tokenizeInlineChords(text))
    .slice(0, limit)
    .map((line) => renderChordLineRow(line, false))
    .join("");
}

function renderInlineChordEditor() {
  const box = $("#inlineChordEditor");
  const textarea = $("#chordText");
  if (!box || !textarea) return;
  textarea.value = normalizeChordInput(textarea.value);
  currentChordTokens = tokenizeInlineChords(textarea.value);
  box.innerHTML = `
    <p class="inline-help">Akord primeš in ga spustiš nad pravo črko. Za nov akord klikni črko in ga vpiši nad njo.</p>
    <div class="chord-sheet editable-chord-sheet">
      <div class="chord-sheet-head">
        <span>Urejanje</span>
        <strong>${escapeHtml($("#chordTitle").value || "Pesem")}</strong>
      </div>
      <div class="chord-sheet-body editable-chord-body">
        ${renderEditableChordLines(currentChordTokens)}
      </div>
    </div>
  `;
}

function renderEditableChordLines(tokens) {
  return tokenLines(tokens).map((lineTokens) => {
    const row = renderChordLineRow(lineTokens, true);
    if (!lineTokens.some((token) => token.index === activeChordInputIndex)) return row;
    const activeIndex = lineTokens.findIndex((token) => token.index === activeChordInputIndex);
    const activeToken = lineTokens[activeIndex];
    return row.replace(
      '<div class="chord-marker-layer">',
      `<input class="inline-chord-input floating" data-inline-chord-input="${activeToken.index}" value="${escapeAttr(activeToken.chord || "")}" placeholder="Akord" style="left: ${activeIndex}ch" /><div class="chord-marker-layer">`
    );
  }).join("");
}

function saveCurrentChordDraft() {
  const song = songById(selectedChordSongId);
  if (!song) return;
  song.title = $("#chordTitle").value.trim() || song.title;
  song.inlineChords = normalizeChordInput($("#chordText").value);
  song.chords = song.inlineChords;
  song.lyrics = inlineTextToLyrics(song.inlineChords);
  song.importedFromDocs = true;
}

function setChordImportStatus(message) {
  const status = $("#chordImportStatus");
  if (status) status.textContent = message;
}

function isProbableSongTitle(line, knownTitles) {
  const clean = line.trim();
  if (!clean || clean.length > 70 || looksLikeChordLine(clean)) return false;
  const key = normalizeTitle(clean);
  if (knownTitles.has(key)) return true;
  const letters = clean.replace(/[^A-Za-zČŠŽĆĐčšžćđ]/g, "");
  return letters.length >= 4
    && clean.length <= 45
    && !/[,.!?;:]/.test(clean)
    && clean === clean.toLocaleUpperCase("sl-SI");
}

function parseChordDocument(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  const knownTitles = new Set(state.songs.map((song) => normalizeTitle(song.title)));
  const chunks = [];
  let current = null;

  for (const line of lines) {
    if (isProbableSongTitle(line, knownTitles)) {
      if (current && current.body.some((item) => item.trim())) chunks.push(current);
      current = { title: line.trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current && current.body.some((item) => item.trim())) chunks.push(current);
  return chunks;
}

function importChordDocument(text) {
  const source = String(text || "").trim();
  const chunks = parseChordDocument(source);
  if (!chunks.length && source) {
    chunks.push({ title: "Nova pesem z akordi", body: source.split("\n") });
  }
  const byTitle = new Map(state.songs.map((song) => [normalizeTitle(song.title), song]));
  let imported = 0;

  for (const chunk of chunks) {
    const chords = chunk.body.join("\n").trim();
    if (!chords) continue;
    const key = normalizeTitle(chunk.title);
    let song = byTitle.get(key);
    if (!song) {
      song = {
      id: crypto.randomUUID(),
      songNumber: nextSongNumber(),
      title: chunk.title,
        categories: [],
        link: "",
        page: null,
        canvaPage: null,
        canvaImage: "",
        known: false,
        inBook: false,
        lyrics: "",
        chords: "",
        inlineChords: "",
      };
      state.songs.push(song);
      byTitle.set(key, song);
    }
    song.chords = chords;
    song.inlineChords = normalizeChordInput(chords);
    song.lyrics = inlineTextToLyrics(song.inlineChords);
    song.importedFromDocs = true;
    imported += 1;
  }

  persist();
  setChordImportStatus(imported ? `Uvoženih ${imported} pesmi z akordi.` : "V datoteki nisem našel pesmi. Preveri, da so naslovi v svojih vrsticah.");
  return imported;
}

async function importChordTextFile(file) {
  if (!file) return;
  try {
    const imported = importChordDocument(await file.text());
    if (imported) renderAll();
  } catch (error) {
    setChordImportStatus(`Uvoz akordov ni uspel: ${error.message}`);
  }
}

function transpose(text, steps) {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];
  const flatMap = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "B" };
  return text.replace(/\b([A-Ha-h](?:#|b)?)(m|maj|min|sus|dim|aug|[0-9])?(?=[/\]\s.,;:!?)-]|$)/g, (match, root, suffix = "") => {
    const isMinorLetter = root[0] === root[0].toLowerCase();
    const normalizedRoot = root[0].toUpperCase() + root.slice(1);
    const normalized = flatMap[normalizedRoot] || normalizedRoot;
    const index = notes.indexOf(normalized);
    if (index === -1) return match;
    const next = notes[(index + steps + notes.length) % notes.length];
    return `${isMinorLetter ? next.toLowerCase() : next}${suffix}`;
  });
}

function renderPeople() {
  $("#peopleRows").innerHTML = state.people.map((person) => `
    <tr data-person-id="${person.id}">
      <td><input value="${escapeAttr(person.name)}" data-field="name" /></td>
      <td><input value="${escapeAttr(person.age)}" data-field="age" /></td>
      <td><input value="${escapeAttr(person.parents)}" data-field="parents" /></td>
      <td><input value="${escapeAttr(person.notes)}" data-field="notes" /></td>
      <td><button class="danger" data-delete-person="${person.id}">Izbriši</button></td>
    </tr>
  `).join("");
}

function renderPrint() {
  const mode = $("#printMode").value;
  const date = state.mass.date ? new Date(state.mass.date).toLocaleDateString("sl-SI") : "Brez datuma";
  const selected = MASS_PARTS.flatMap((part) => [state.mass.selections[part], ...(state.mass.additionalSelections?.[part] || [])]
    .map((songId) => ({ part, song: songById(songId) })))
    .filter((item) => item.song);

  if (mode === "plan") {
    $("#printPage").innerHTML = `
      <h1>Seznam za sveto mašo</h1>
      <p><strong>${escapeHtml(date)}</strong>${state.mass.note ? ` · ${escapeHtml(state.mass.note)}` : ""}</p>
      <ol>${selected.map((item) => `<li><strong>${escapeHtml(item.part)}:</strong> ${escapeHtml(item.song.title)}</li>`).join("")}</ol>
    `;
    return;
  }

  $("#printPage").innerHTML = `
    <h1>${mode === "guitar" ? "Pesmi z akordi" : "Pesmi za otroke"}</h1>
    <p><strong>${escapeHtml(date)}</strong>${state.mass.note ? ` · ${escapeHtml(state.mass.note)}` : ""}</p>
    ${selected.map((item) => `
      <section class="print-song">
        <p class="muted">${escapeHtml(item.part)}</p>
        <h2>${escapeHtml(item.song.title)}</h2>
        ${item.song.page ? `<p>Pesmarica: stran ${escapeHtml(String(item.song.page))}</p>` : ""}
        ${item.song.canvaDesignUrl ? `<p><a href="${escapeAttr(item.song.canvaDesignUrl)}">Canva pesmarica</a></p>` : ""}
        <pre>${escapeHtml(mode === "guitar" ? item.song.inlineChords || item.song.chords || item.song.lyrics || "" : item.song.lyrics || item.song.title)}</pre>
      </section>
    `).join("")}
  `;
}

function calendarEventsFromMassHistory() {
  return (state.massHistory || [])
    .filter((entry) => entry.date)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      const songs = MASS_PARTS
        .flatMap((part) => [entry.selections?.[part], ...(entry.additionalSelections?.[part] || [])]
          .map((songId) => ({ part, song: songById(songId) })))
        .filter((item) => item.song)
        .map((item) => `${item.part}: ${item.song.title}`);
      return {
        date: entry.date,
        title: entry.note ? `Zborcek - ${entry.note}` : "Zborcek - sveta masa",
        description: songs.join("\n"),
      };
    });
}

function googleCalendarUrls() {
  if (!GOOGLE_CALENDAR_ID.trim()) return null;
  const id = encodeURIComponent(GOOGLE_CALENDAR_ID.trim());
  return {
    embed: `https://calendar.google.com/calendar/embed?src=${id}&ctz=${encodeURIComponent(GOOGLE_CALENDAR_TIMEZONE)}`,
    open: `https://calendar.google.com/calendar/render?cid=${id}`,
    ics: `webcal://calendar.google.com/calendar/ical/${id}/public/basic.ics`,
  };
}

function googleCalendarDate(date, time) {
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function openGoogleCalendarEvent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("#calendarEventStatus");
  if (!form.reportValidity()) return;

  const title = $("#calendarEventTitle").value.trim();
  const date = $("#calendarEventDate").value;
  const start = googleCalendarDate(date, $("#calendarEventStart").value);
  const end = googleCalendarDate(date, $("#calendarEventEnd").value);

  if (!start || !end || end <= start) {
    status.textContent = "Končni čas mora biti po začetnem času.";
    return;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: $("#calendarEventDescription").value.trim(),
    location: $("#calendarEventLocation").value.trim(),
    ctz: GOOGLE_CALENDAR_TIMEZONE,
    src: GOOGLE_CALENDAR_ID.trim(),
    visibility: "public",
  });
  window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank", "noopener");
  status.textContent = "Dogodek je pripravljen. V Google Koledarju klikni Shrani.";
}

function renderCalendar() {
  const urls = googleCalendarUrls();
  const frame = $("#googleCalendarFrame");
  const fallback = $("#calendarFallback");
  const setup = $("#calendarSetup");
  const openLink = $("#googleCalendarOpen");
  const icsLink = $("#googleCalendarIcs");
  const events = calendarEventsFromMassHistory();

  if (frame && fallback && setup && openLink && icsLink) {
    frame.hidden = !urls;
    fallback.hidden = Boolean(urls);
    setup.hidden = Boolean(urls);
    openLink.classList.toggle("disabled", !urls);
    icsLink.classList.toggle("disabled", !urls);
    openLink.href = urls?.open || "#";
    icsLink.href = urls?.ics || "#";
    if (urls) frame.src = urls.embed;
  }

  const count = $("#calendarEventCount");
  if (count) count.textContent = `${events.length} shranjenih dogodkov`;

  const list = $("#calendarEvents");
  if (!list) return;
  list.innerHTML = events.length
    ? events.map((event) => `
      <article class="calendar-event">
        <time datetime="${escapeAttr(event.date)}">${escapeHtml(new Date(event.date).toLocaleDateString("sl-SI"))}</time>
        <div>
          <strong>${escapeHtml(event.title)}</strong>
          ${event.description ? `<p>${escapeHtml(event.description).replace(/\n/g, "<br>")}</p>` : ""}
        </div>
      </article>
    `).join("")
    : `<p class="muted">Ko shranis nacrt mase z datumom, se bo prikazal tudi tukaj.</p>`;
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dateToIcsDay(value) {
  return String(value || "").replace(/-/g, "");
}

function downloadLocalCalendarIcs() {
  const events = calendarEventsFromMassHistory();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zborcek Sv Trojice//Dogodki//SL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const day = dateToIcsDay(event.date);
    const next = new Date(`${event.date}T12:00:00`);
    next.setDate(next.getDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:zborcek-${day}@sv-trojice`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${dateToIcsDay(next.toISOString().slice(0, 10))}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  const blob = new Blob([`${lines.join("\r\n")}\r\n`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "zborcek-sv-trojice-dogodki.ics";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function wireEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

  $("#loginButton").addEventListener("click", () => {
    $("#loginStatus").textContent = "";
    $("#loginDialog").showModal();
  });
  $("#cancelLogin").addEventListener("click", () => $("#loginDialog").close());
  $("#confirmLogin").addEventListener("click", async () => {
    const status = $("#loginStatus");
    status.textContent = "Odpiram Google prijavo ...";
    try {
      await window.zborcekAuth.signIn();
      $("#loginDialog").close();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  $("#logoutButton").addEventListener("click", () => window.zborcekAuth.signOut());

  $("#saveMass").addEventListener("click", () => {
    autosaveMassFromForm();
  });
  $("#massDate").addEventListener("change", () => {
    const existing = state.massHistory.find((item) => item.date === $("#massDate").value);
    if (existing) loadMassFromHistory(existing.date);
    else {
      state.mass.selections = Object.fromEntries(MASS_PARTS.map((part) => [part, ""]));
      state.mass.additionalSelections = {};
      state.mass.note = "";
      state.mass.date = $("#massDate").value;
      visibleMassMonth = state.mass.date.slice(0, 7);
      persist();
      renderMass();
      renderPrint();
    }
  });
  $("#massNote").addEventListener("input", autosaveMassFromForm);
  $("#massSlots").addEventListener("change", (event) => {
    if (event.target.matches("[data-mass-part]")) autosaveMassFromForm();
  });
  $("#prevMassMonth").addEventListener("click", () => moveMassMonth(-1));
  $("#nextMassMonth").addEventListener("click", () => moveMassMonth(1));
  $("#massCalendar").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mass-date]");
    if (!button) return;
    loadMassFromHistory(button.dataset.massDate);
  });

  $("#songSearch").addEventListener("input", renderSongs);
  $("#songList").addEventListener("click", (event) => {
    const item = event.target.closest("[data-song-id]");
    if (!item) return;
    selectedSongId = item.dataset.songId;
    renderSongs();
  });

  $("#newSong").addEventListener("click", () => {
    const song = {
      id: crypto.randomUUID(),
      title: "Nova pesem",
      categories: [],
      link: "",
      page: null,
      known: false,
      inBook: false,
      lyrics: "",
      chords: "",
      inlineChords: "",
    };
    state.songs.unshift(song);
    selectedSongId = song.id;
    persist();
    renderAll();
  });

  $("#songForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const song = songById(selectedSongId);
    if (!song) return;
    song.title = $("#songTitle").value.trim() || "Brez naslova";
    song.categories = $("#songCategories").value.split(",").map((part) => part.trim()).filter(Boolean);
    song.link = $("#songLink").value.trim();
    song.page = $("#songPage").value ? Number($("#songPage").value) : null;
    song.known = $("#songKnown").checked;
    song.inBook = $("#songInBook").checked;
    song.lyrics = $("#songLyrics").value;
    persist();
    renderAll();
  });

  $("#deleteSong").addEventListener("click", () => {
    if (!selectedSongId) return;
    state.songs = state.songs.filter((song) => song.id !== selectedSongId);
    for (const part of MASS_PARTS) {
      if (state.mass.selections[part] === selectedSongId) state.mass.selections[part] = "";
    }
    selectedSongId = state.songs[0]?.id || null;
    persist();
    renderAll();
  });

  $("#chordSearch").addEventListener("input", renderChords);
  $("#chordPages").addEventListener("click", (event) => {
    const button = event.target.closest("[data-chord-open]");
    if (!button) return;
    selectedChordSongId = selectedChordSongId === button.dataset.chordOpen ? null : button.dataset.chordOpen;
    activeChordInputIndex = null;
    renderChords();
  });
  $("#chordEditor").addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrentChordDraft();
    persist();
    renderAll();
  });
  $("#chordText").addEventListener("input", renderInlineChordEditor);
  $("#inlineChordEditor").addEventListener("click", (event) => {
    if (event.target.closest("[data-inline-chord-input]")) return;
    const action = event.target.closest("[data-chord-action]");
    const word = event.target.closest("[data-drop-word]");
    if (!action && !word) return;
    if (action) {
      const index = Number(action.dataset.tokenIndex);
      const token = currentChordTokens[index];
      if (!token || token.type !== "char") return;
      token.chord = "";
      activeChordInputIndex = null;
    } else {
      const index = Number(word.dataset.dropWord);
      if (currentChordTokens[index]?.type !== "char") return;
      activeChordInputIndex = index;
    }

    $("#chordText").value = tokensToInlineText(currentChordTokens);
    renderInlineChordEditor();
    $("#inlineChordEditor [data-inline-chord-input]")?.focus();
  });
  $("#inlineChordEditor").addEventListener("focusout", (event) => {
    const input = event.target.closest("[data-inline-chord-input]");
    if (!input) return;
    const index = Number(input.dataset.inlineChordInput);
    if (currentChordTokens[index]?.type === "char") {
      currentChordTokens[index].chord = normalizeChordName(input.value);
      $("#chordText").value = tokensToInlineText(currentChordTokens);
    }
    activeChordInputIndex = null;
    setTimeout(renderInlineChordEditor, 0);
  });
  $("#inlineChordEditor").addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-inline-chord-input]");
    if (!input || event.key !== "Enter") return;
    event.preventDefault();
    input.blur();
  });
  $("#inlineChordEditor").addEventListener("dragstart", (event) => {
    const chord = event.target.closest("[data-drag-chord]");
    if (!chord) return;
    event.dataTransfer.setData("text/plain", chord.dataset.dragChord);
    event.dataTransfer.effectAllowed = "move";
  });
  $("#inlineChordEditor").addEventListener("dragover", (event) => {
    const word = event.target.closest("[data-drop-word]");
    if (!word) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    word.classList.add("drop-ready");
  });
  $("#inlineChordEditor").addEventListener("dragleave", (event) => {
    event.target.closest("[data-drop-word]")?.classList.remove("drop-ready");
  });
  $("#inlineChordEditor").addEventListener("drop", (event) => {
    const word = event.target.closest("[data-drop-word]");
    if (!word) return;
    event.preventDefault();
    word.classList.remove("drop-ready");
    const from = Number(event.dataTransfer.getData("text/plain"));
    const to = Number(word.dataset.dropWord);
    if (!currentChordTokens[from] || !currentChordTokens[to] || currentChordTokens[from].type !== "char" || currentChordTokens[to].type !== "char" || from === to) return;
    const moving = currentChordTokens[from].chord;
    currentChordTokens[from].chord = currentChordTokens[to].chord;
    currentChordTokens[to].chord = moving;
    activeChordInputIndex = null;
    $("#chordText").value = tokensToInlineText(currentChordTokens);
    renderInlineChordEditor();
  });
  $("#transposeDown").addEventListener("click", () => {
    $("#chordText").value = transpose($("#chordText").value, -1);
    renderInlineChordEditor();
  });
  $("#transposeUp").addEventListener("click", () => {
    $("#chordText").value = transpose($("#chordText").value, 1);
    renderInlineChordEditor();
  });
  $("#printChords").addEventListener("click", () => {
    renderChordPrintPicker();
    $("#chordPrintDialog").showModal();
  });
  $("#selectAllChordPrint").addEventListener("click", () => {
    $$("#chordPrintPicker input[type='checkbox']").forEach((input) => {
      input.checked = true;
    });
  });
  $("#clearChordPrint").addEventListener("click", () => {
    $$("#chordPrintPicker input[type='checkbox']").forEach((input) => {
      input.checked = false;
    });
  });
  $("#cancelChordPrint").addEventListener("click", () => $("#chordPrintDialog").close());
  $("#confirmChordPrint").addEventListener("click", () => {
    const ids = new Set($$("#chordPrintPicker input[type='checkbox']:checked").map((input) => input.value));
    const songs = getChordSongs().filter((song) => ids.has(song.id));
    if (!songs.length) {
      setChordImportStatus("Za tisk akordov izberi vsaj eno pesem.");
      return;
    }
    renderChordPrint(songs);
    $("#chordPrintDialog").close();
    document.body.classList.add("printing-chords");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-chords"), 500);
  });
  $("#openChordImport").addEventListener("click", () => {
    $("#chordImportText").value = "";
    $("#chordImportDialog").showModal();
  });
  $("#cancelChordImport").addEventListener("click", () => $("#chordImportDialog").close());
  $("#importChordPaste").addEventListener("click", () => {
    const imported = importChordDocument($("#chordImportText").value);
    if (imported) {
      $("#chordImportDialog").close();
      renderAll();
    }
  });

  $("#addPerson").addEventListener("click", () => {
    state.people.push({ id: crypto.randomUUID(), name: "", age: "", parents: "", notes: "" });
    persist();
    renderPeople();
  });
  $("#peopleRows").addEventListener("input", (event) => {
    const row = event.target.closest("[data-person-id]");
    if (!row) return;
    const person = state.people.find((item) => item.id === row.dataset.personId);
    if (!person) return;
    person[event.target.dataset.field] = event.target.value;
    persist();
  });
  $("#peopleRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-person]");
    if (!button) return;
    state.people = state.people.filter((person) => person.id !== button.dataset.deletePerson);
    persist();
    renderPeople();
  });

  $("#printMode").addEventListener("change", renderPrint);
  $("#printButton").addEventListener("click", () => window.print());
  $("#calendarEventDate").value = new Date().toLocaleDateString("sv-SE");
  $("#calendarEventForm").addEventListener("submit", openGoogleCalendarEvent);
  $("#downloadLocalIcs").addEventListener("click", downloadLocalCalendarIcs);

  $("#songbookSearch").addEventListener("input", renderSongbook);
  $("#songbookMassPart").addEventListener("change", renderSongbook);
  $("#songbookPages").addEventListener("click", (event) => {
    const button = event.target.closest("[data-songbook-open]");
    if (!button) return;
    selectedSongbookPageId = selectedSongbookPageId === button.dataset.songbookOpen ? null : button.dataset.songbookOpen;
    renderSongbook();
  });
  $("#songbookPages").addEventListener("input", (event) => {
    const input = event.target.closest("[data-songbook-copy]");
    if (!input) return;
    if (state.canvaPages?.length) {
      const page = state.canvaPages.find((item) => item.id === input.dataset.songbookCopy);
      if (page) page.copies = Math.max(0, Number(input.value || 0));
    } else {
      state.songbookCopies[input.dataset.songbookCopy] = Math.max(0, Number(input.value || 0));
    }
    persist();
    renderSongbookPrint();
  });
  $("#songbookPages").addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-step]");
    if (!button) return;
    event.stopPropagation();
    const id = button.dataset.copyStep;
    const delta = Number(button.dataset.delta || 0);
    if (state.canvaPages?.length) {
      const page = state.canvaPages.find((item) => item.id === id);
      if (page) page.copies = Math.max(0, Math.min(50, Number(page.copies || 0) + delta));
    } else {
      state.songbookCopies[id] = Math.max(0, Math.min(50, Number(state.songbookCopies[id] || 0) + delta));
    }
    persist();
    renderSongbook();
  });
  $("#songbookEditor").addEventListener("submit", (event) => {
    event.preventDefault();
    const page = currentSongbookPage();
    if (!page) return;
    const song = ensureSongForSongbookPage(page);
    song.title = $("#songbookTitle").value.trim() || `Canva stran ${page.page}`;
    page.title = song.title;
    page.page = Number($("#songbookPageNumber").value || page.page);
    song.page = page.page;
    song.canvaPage = page.page;
    song.link = $("#songbookLink").value.trim();
    song.categories = $$("#songbookMassParts input:checked").map((input) => input.value);
    persist();
    renderAll();
  });
  $("#printSongbook").addEventListener("click", () => {
    renderSongbookPrint();
    document.body.classList.add("printing-songbook");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-songbook"), 500);
  });
  $("#importCanvaPdf").addEventListener("change", (event) => importCanvaPdf(event.target.files[0]));
  $("#saveSongbookToSongs").addEventListener("click", saveSongbookToSongs);

  $("#exportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zborcek-sv-trojice.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("#importJson").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    state = JSON.parse(await file.text());
    selectedSongId = state.songs[0]?.id || null;
    selectedChordSongId = null;
    selectedSongbookPageId = null;
    persist();
    renderAll();
  });

  $("#syncCanva").addEventListener("click", () => syncCanvaSongbook());
}

function renderAll() {
  renderMass();
  renderSongs();
  renderSongbook();
  renderChords();
  renderCalendar();
  renderPeople();
  renderPrint();
}

document.addEventListener("zborcek-auth-state", (event) => applyAccessMode(event.detail));
wireEvents();
applyAccessMode(window.zborcekAuth?.state || {});
syncCanvaSongbook({ silent: true });
loadCanvaPageImages()
  .catch(() => setPdfImportStatus("Shranjene Canva strani niso dostopne. PDF lahko ponovno uvoziš."))
  .finally(renderAll);
