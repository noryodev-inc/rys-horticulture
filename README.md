# RYS Horticulture — web stranica

Statična stranica (HTML + CSS + JavaScript, bez build koraka i bez ovisnosti).
Postavlja se tako da se sadržaj mape `web/` prekopira na hosting.

## Pokretanje lokalno

```bash
python3 -m http.server 4321 --directory /Users/nino/Desktop/clients/rysHorticulture/web
```

Zatim otvoriti <http://localhost:4321>.

## Struktura

```
web/
├── index.html          Početna
├── usluge.html         Usluge + paušalni ugovor + dodatne usluge
├── galerija.html       Galerija s pregledom fotografija
├── izracun-cijene.html Kalkulator cijene (travnjak, živica, dolazak) + cjenik
├── o-nama.html         O nama, vrijednosti, područje rada
├── kontakt.html        Dva načina kontakta (e-mail / WhatsApp) + obrazac
├── 404.html            Stranica za nepostojeće adrese
├── robots.txt          Upute tražilicama (traži stvarnu domenu)
├── sitemap.xml         Popis stranica (traži stvarnu domenu)
├── assets/
│   ├── css/style.css   Cijeli dizajn sustav u jednoj datoteci
│   ├── js/main.js      Interakcije (opruge, ladica, pregled fotografija)
│   └── img/            Logo, fotografije, favicon
├── PLACEHOLDERS.md     Popis svega što još treba zamijeniti stvarnim sadržajem
└── README.md
```

Zaglavlje, izbornik i podnožje ponavljaju se u svakoj datoteci (nema build koraka).
Kod izmjene navigacije ili kontakt podataka treba proći kroz svih šest stranica —
`grep -rn "tekst" web/` je najbrži način.

## Dizajn

**Boje** (Option A — „Warm & Approachable”, iz priloženog PDF-a):

| Uloga | Vrijednost |
| --- | --- |
| Kremasta pozadina | `#EFE7D8` |
| Lisnato zelena | `#4E7A3D` |
| Tamnozelena (naslovi, zaglavlje, podnožje) | `#2F4A2B` |
| Terakota (naglasak, brojevi, oznake) | `#E8792E` |
| Terakota — ispuna gumba | `#B85618` |
| Smeđa (tekst) | `#4A4238` |

Terakota s letka (`#E8792E`) na bijelom tekstu daje kontrast 2.8:1, što je ispod
WCAG AA praga. Zato je za **ispunu gumba** korištena tamnija varijanta `#B85618`
(4.8:1), dok se izvorna terakota koristi kao naglasak — brojevi koraka, nadnaslovi
i oznake na tamnoj podlozi, gdje kontrast prolazi.

**Pisma:** Fraunces (naslovi, serif — uz logotip) i Inter (tekst i sučelje),
oboje s Google Fontsa. Praćenje slova i prored mijenjaju se s veličinom:
veliki naslovi imaju negativan tracking i zbijen prored, mali tekst pozitivan tracking.

Sve mjere su u `rem` pa se raspored skalira zajedno s postavkom veličine teksta u pregledniku.

## Pokret

Sve što korisnik može uhvatiti prstom vođeno je **oprugama** (`Spring` u `main.js`),
a ne animacijama fiksnog trajanja:

- animacija uvijek kreće od **trenutne vrijednosti na ekranu**, pa se može prekinuti
  i preusmjeriti usred pokreta bez skoka;
- pri otpuštanju geste **preuzima se brzina prsta**, tako da nema šava između
  povlačenja i animacije;
- odredište se bira **projekcijom zamaha** (kamo bi gesta stala), ne po poziciji otpuštanja;
- na rubovima se pruža otpor koji raste (gumeni rub), umjesto tvrdog zaustavljanja.

Parametri su Appleovi: `damping 1.0` (bez odskoka) kao zadano, `damping ~0.85`
samo kad je gesti prethodio zamah.

Odziv na dodir je na `pointerdown`, ne na klik. Prozirno zaglavlje koristi
`backdrop-filter` i postaje gušće pri skrolu.

Poštuju se `prefers-reduced-motion`, `prefers-reduced-transparency` i `prefers-contrast`.
Bez JavaScripta stranica je i dalje potpuno čitljiva.

## Pristupačnost

- Preskoči-na-sadržaj link, `aria-current` na aktivnoj stavci izbornika.
- Mobilna ladica i pregled fotografije zadržavaju fokus i zatvaraju se tipkom `Esc`.
- Galerija se lista strelicama; svaka fotografija ima `alt` opis.
- Fokus je uvijek vidljiv (`:focus-visible`).

## Prije objave

Pročitati [PLACEHOLDERS.md](PLACEHOLDERS.md) — kontakt podaci, tekst „O nama”,
fotografije u galeriji i slanje obrasca još su privremeni.
