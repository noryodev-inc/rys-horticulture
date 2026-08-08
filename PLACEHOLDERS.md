# Što još treba zamijeniti

Sve niže navedeno je privremeni sadržaj. U HTML-u je svako mjesto označeno komentarom
`<!-- PLACEHOLDER: … -->` pa se lako pronađe pretragom:

```bash
grep -rn "PLACEHOLDER" /Users/nino/Desktop/clients/rysHorticulture/web
```

---

> **Važno:** stranica više ne prikazuje upozorenja o privremenom sadržaju posjetitelju.
> Sve što još nije potvrđeno navedeno je ovdje i označeno `<!-- PLACEHOLDER: … -->`
> komentarima u kodu. Ovaj popis je jedini trag, pa ga treba proći prije objave.

## 0. Prije objave, ukratko

- [ ] Granice zona dolaska u kalkulatoru (odjeljak 1)
- [ ] Priča tvrtke na *O nama* (odjeljak 3)
- [ ] Odgovori na 5 pitanja o uslugama (odjeljak 4)
- [ ] Preostale dodatne usluge s letka (odjeljak 4)
- [ ] Radno vrijeme i točno područje rada
- [ ] Fotografije za galeriju, 5 praznih mjesta (odjeljak 5)

## 1. Cijene u kalkulatoru

Cijene su **stvarne** (klijentov cjenik). Sve su na jednom mjestu — u
`assets/js/main.js`, blok označen s `CJENIK`. Placeholder su ostale **samo
granice zona dolaska**.

### Kako se računa

Pojasevi za travnjak obračunavaju se **progresivno**, kao porezni razredi: prvih
1000 m² po 0,25 €, sljedećih 1000 m² po 0,20 € i tako dalje — ne cijela površina
po jednoj cijeni.

To je namjerno. Kod ravnog obračuna po pojasu veći vrt ispada jeftiniji
(1000 m² = 250 €, a 1001 m² = 200 €), pa bi u kalkulatoru povlačenje klizača
udesno smanjivalo cijenu i izgledalo kao kvar. Progresivno: 1000 m² → 250 €,
2000 m² → 450 €, 3000 m² → 600 €, 4000 m² → 700 €.

Ukupno = `travnjak × (2 ako je kosi teren)` + `duljina živice × cijena za visinu`
+ `dolazak za zonu`. Dolazak se naplaćuje jednom, bez obzira na broj usluga.

### Što je još privremeno

Granice zona — klijent je dao samo raspon **20 do 50 € po dolasku**. Postavljene
su četiri zone koje pogađaju oba kraja raspona; nazivi i udaljenosti su
pretpostavka:

```js
zone: [
  { naziv: 'Zagreb (grad)',              dolazak: 20 },
  { naziv: 'Okolica Zagreba, do 15 km',  dolazak: 30 },
  { naziv: '15 do 30 km od Zagreba',     dolazak: 40 },
  { naziv: 'Više od 30 km',              dolazak: 50 }
]
```

Ako se mijenjaju **nazivi ili broj zona**, treba uskladiti tri mjesta:
`CJENIK.zone` u `main.js`, `<select id="zona">` u `izracun-cijene.html`
(redoslijed `<option value="0,1,2…">` mora odgovarati polju `zone`) i rečenicu
o dolasku u tablici cjenika na dnu te stranice.

Isto vrijedi ako se mijenjaju cijene: tablica cjenika u `izracun-cijene.html`
je ručno napisana i **ne čita se iz `CJENIK`** — treba je ažurirati zajedno.

Napomena „ovo je okvirna procjena, a ne ponuda" neka **ostane** — štiti vas ako se
stvarna cijena razlikuje od izračuna.

### Odluke koje treba potvrditi s klijentom

- **Nagib ×2** primjenjuje se samo na travnjak, ne na živicu (u cjeniku stoji uz
  cijene po m², prije odjeljka o živici).
- **Nema minimalne naknade.** Ranija verzija imala je izmišljenih 40 €; obrisano
  jer je u klijentovom cjeniku nema, a dolazak od 20 € ionako čini donju granicu.
- **PDV se nigdje ne spominje** dok se ne potvrdi porezni status tvrtke.

## 2. Kontakt podaci

Telefon, WhatsApp i e-mail su **stvarni**. Ostalo treba provjeriti:

| Podatak | Vrijednost | Status |
| --- | --- | --- |
| Telefon / WhatsApp | `+385 99 410 5644`, `wa.me/385994105644` | **stvarno** |
| E-mail | `stipe@ryshorticulture.com` | **stvarno** |
| Područje rada | „Zagreb i okolica” | provjeriti |
| Radno vrijeme | „Pon – Sub, 08:00 – 18:00” | provjeriti |

Domena je `ryshorticulture.com` i upisana je u `robots.txt` te `sitemap.xml`
(bez `www`). Ako se na Netlifyju kao glavna postavi `www.ryshorticulture.com`,
uskladiti i te dvije datoteke, inače sitemap pokazuje na adrese koje se
preusmjeravaju.

## 3. O nama (`o-nama.html`)

- **Priča tvrtke** — tri odlomka pod „Počelo je s jednim zapuštenim travnjakom” su
  općeniti (vidi odjeljak 9). Treba: godina osnutka, tko vodi, kako je počelo.
- **Područje rada** — potvrditi popis mjesta koja se pokrivaju.

## 4. Usluge (`usluge.html`)

Opisi usluga preuzeti su s letka i točni su. Popisi natuknica ispod svake usluge dijelom su
pretpostavka — treba potvrditi:

- **Održavanje travnjaka** — radi li se gnojidba, aeracija, sjetva?
- **Košnja okućnice** — radi li se na kosim terenima? Odvozi li se zeleni otpad?
- **Sadnja** — nabavlja li tvrtka sadnice ili ih osigurava klijent?
- **Orezivanje** — rade li se visoka stabla i rušenje?
- **Dizajn vrta** — radi li se 2D/3D vizualizacija, popločavanje, rasvjeta?
- **Dodatne usluge** — s letka je čitljivo samo „SERVIS TRIMERA…”. Dvije prazne kartice
  su obrisane; kad se sazna ostatak ponude, dodati ih natrag u `<ul class="info-list">`.

## 5. Galerija (`galerija.html`)

Trenutno su tu tri stvarne fotografije i pet polja „Fotografija uskoro”.

Dodavanje nove fotografije — zamijeni jedan `<div class="shot shot--empty">` ovime:

```html
<button class="shot" type="button" data-reveal
        data-full="assets/img/NAZIV.jpg"
        data-caption="Opis koji se vidi u pregledu">
  <img src="assets/img/NAZIV.jpg" alt="Opis fotografije za čitače ekrana" loading="lazy" width="1600" height="900">
  <span class="shot__tag">Kategorija</span>
</button>
```

Fotografije prije stavljanja smanjiti (dulja stranica ~1600 px, JPEG kvaliteta ~60):

```bash
sips -s format jpeg -s formatOptions 58 -Z 1600 IZVOR.jpg --out web/assets/img/NAZIV.jpg
```

## 6. Kontakt obrazac (`kontakt.html`)

Obrazac **ne šalje e-mail sa servera** — otvara korisnikov program za e-poštu s već
ispunjenom porukom. To radi bez ikakvog backenda, ali korisnik mora sam kliknuti „pošalji”.

Za pravo slanje treba servis za obrasce (Formspree, Web3Forms, Netlify Forms…):
zamijeniti `<form class="form" data-mail-form="…">` s `<form action="URL_SERVISA" method="POST">`
i obrisati atribut `data-mail-form` (time se isključuje i JS koji priprema `mailto:`).

## 7. Ostalo

- **Domena i godina** — u podnožju piše `© 2026`; ažurirati po potrebi.
- **OG slika** — `assets/img/hero-vrt-sm.jpg` koristi se za pregled pri dijeljenju linka.
  Ako se želi vlastita slika za dijeljenje, dodati `assets/img/og.jpg` (1200×630) i promijeniti
  `<meta property="og:image">` u `index.html`.
- **Video zapisi** iz mape klijenta (`0707.mov`, `20260718_103911.mp4`, DJI snimka) nisu upotrijebljeni
  — predveliki su za web u izvornom obliku. Ako se žele koristiti, prvo ih treba komprimirati.


## 8. SEO i tehničke datoteke

- **`robots.txt` i `sitemap.xml`** koriste `https://ryshorticulture.com` (bez `www`).
  Provjeriti da to odgovara glavnoj domeni postavljenoj na Netlifyju.
- **Strukturirani podaci** (`application/ld+json` u `index.html`) sadrže naziv,
  telefon, e-mail i područje rada. **Adresa nije unutra** jer nije potvrđena; kad
  bude poznata, dodati `address` u taj blok.
- **`404.html`** radi automatski na Netlifyju i Cloudflare Pages. Na Apache hostingu
  treba `.htaccess` s `ErrorDocument 404 /404.html`, na nginxu `error_page 404 /404.html;`.
- **Slike** imaju `srcset` s malom i velikom varijantom. Ako dodajete nove fotografije,
  napravite i malu verziju (`sips -s format jpeg -s formatOptions 50 -Z 1100 …`) i
  navedite obje u `srcset`, inače mobitel skida punu veličinu.

## 9. Neutralan tekst koji treba zamijeniti stvarnim

Ovo su mjesta gdje sada stoji uvjerljiv, ali općenit tekst. Nije netočan, ali nije
ni specifičan za tvrtku:

- **`o-nama.html`, „Naša priča"** — tri odlomka o pristupu poslu. Zamijeniti stvarnom
  pričom: godina osnutka, tko vodi, kako je počelo.
- **`o-nama.html`, vrijednosti** — tri kartice (Pouzdanost, Prava oprema, Osobni pristup)
  su općenite. Mogu ostati, ali dobivaju na težini uz konkretan primjer.
