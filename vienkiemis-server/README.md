# Vienkiemis Online

Realaus laiko daugelio žaidėjų (multiplayer) versija žaidimo "Vienkiemis Sandbox" - Node.js +
Express + Socket.IO + PostgreSQL backend'as, su vienu statiniu HTML/React klientu
(`public/index.html`). Kelis žaidėjus vienu metu galintis priimti bendras pasaulis: visi mato
vieni kitus lauko scenoje, kartu kaunasi su tais pačiais zombiais/kritteriais/bosu, renka tą
patį grobį ir gali kurti bendrus laužus.

## Architektūra trumpai

- **Backend**: `src/` - Express REST API (registracija/prisijungimas/herojaus išsaugojimas/admin)
  + Socket.IO realaus laiko sluoksnis (žaidėjų buvimas, bendras lauko pasaulis - zombiai/grobis/
  laužai serverio pusėje simuliuojami ir transliuojami visiems).
- **Duomenų bazė**: PostgreSQL (`db/` - schema + migracija + užklausų funkcijos). Saugo paskyras
  ir kiekvieno žaidėjo herojaus būseną (ištekliai, ginklai, XP, pozicija ir t.t.).
- **Klientas**: `public/index.html` - vienas savarankiškas failas (React 18 + Babel Standalone,
  transpiliuojama tiesiogiai naršyklėje, be atskiro "build" žingsnio). Prisijungia prie TO PATIES
  serverio per REST (autentikacija, herojaus išsaugojimas) ir WebSocket (Socket.IO - realaus laiko
  žaidėjų/zombių/grobio sinchronizacija).

### Kas yra BENDRA (matoma/veikia visiems žaidėjams kartu), o kas - PRIVATU (tik jums)

| Bendra (serverio autoritetas)                          | Privatu (kiekvieno žaidėjo kompiuteryje) |
|----------------------------------------------------------|-------------------------------------------|
| Kitų žaidėjų pozicijos/animacija lauko scenoje            | Butų/daugiabučių VIDUS (kiekvienam žaidėjui - savas, privatus egzempliorius) |
| Lauko zombiai/šunys/vištos/briedžiai/bosas (pozicija, HP)  | Medžių kirtimas ir mediena                |
| Lauko grobio kritiniai (loot drops) ir jų paėmimas         | Fiksuoti vienkartiniai daiktai (degtukai/peilis/kirvis žemėlapyje) |
| Laužų kūrimas lauke                                        | Alkis/troškulys/HP regeneracija prie laužo |
| Admin žemėlapio redaktoriaus pakeitimai (NPC/namukų pozicijos, medžiai) | XP/lygis/nužudymų skaičius (skaičiuojama kliento pusėje, net ir už bendrus nužudymus) |

Tai sąmoningas apimties sprendimas: pilnai sinchronizuoti VISKĄ (įskaitant butų vidų ir kiekvieną
medžio kirtimą) būtų gerokai didesnis darbas be realios žaidimo vertės - draugams žaidžiant kartu
svarbiausia matyti vieni kitus ir kartu kautis lauke, o ne konkuruoti dėl kiekvieno medžio.

## Vietinis paleidimas (testavimui)

Reikalinga: Node.js 20+, prieinama PostgreSQL duomenų bazė.

```bash
npm install
cp .env.example .env   # tada įrašykite savo DATABASE_URL ir sugeneruokite JWT_SECRET
npm start               # paleidžia migraciją (idempotentiška) ir tada patį serverį
```

Atidarykite `http://localhost:8080` (arba `.env` nurodytą PORT). Numatytoji administratoriaus
paskyra: **vartotojo vardas `admin`, slaptažodis `admin123`** - **BŪTINAI pakeiskite šį
slaptažodį prieš viešai paleisdami serverį** (kol nėra atskiro "keisti slaptažodį" mygtuko admin
panelėje, paprasčiausias būdas - prisijungti prie DB ir atnaujinti `password_hash` naudojant
pgcrypto: `UPDATE users SET password_hash = crypt('naujas_slaptazodis', gen_salt('bf')) WHERE
username = 'admin';`).

## Diegimas į Railway (rekomenduojama, paprasčiausia)

[Railway](https://railway.com) pasirinktas kaip paprasčiausia platforma - turi nemokamą pradinį
kreditą, automatiškai paleidžia PostgreSQL, ir supranta `Dockerfile` be papildomos konfigūracijos.
Žingsniai 1 ir 4-8 tinka abiem būdams žemiau - skiriasi tik pats kodo įkėlimas (2-3 žingsniai).

1. **Susikurkite Railway paskyrą** (railway.com, galima per GitHub, bet tai NEBŪTINA - žr. B
   variantą žemiau, jei nenorite naudoti GitHub apskritai).

### A. Per GitHub (automatinis persideploy'inimas su kiekvienu `git push`)

2. **Įkelkite šį projektą į GitHub** (jei dar nepadaryta): `git init && git add -A && git commit
   -m "Vienkiemis Online" ` tada sukurkite tuščią repo GitHub'e ir `git push`.
3. Railway panelėje: **New Project → Deploy from GitHub repo** → pasirinkite šį repo.

### B. Per Railway CLI (be GitHub - tiesiai iš savo kompiuterio)

2. Įsidiekite CLI ir prisijunkite:
   ```bash
   npm install -g @railway/cli
   railway login
   ```
3. Šiame projekto kataloge (`vienkiemis-server/`) susiekite arba sukurkite Railway projektą ir
   įkelkite kodą:
   ```bash
   railway init          # arba `railway link`, jei projektą jau sukūrėte per railway.com panelę
   railway up
   ```
   `railway up` suspaudžia ir įkelia jūsų lokalius failus, tada sudaro konteinerį pagal
   `Dockerfile` - lygiai taip pat, kaip ir per GitHub, tik be automatinio persideploy'inimo:
   norėdami atnaujinti serverį vėliau, tiesiog paleiskite `railway up` iš naujo po bet kokių
   kodo pakeitimų. (Yra ir `railway up -d` - įkelia ir grąžina valdymą iš karto, nelaukiant, kol
   baigsis build'as - žurnalus tada galite stebėti per `railway logs`.)

   Alternatyva CLI - jei jau turite paruoštą Docker image'ą (pvz. įkeltą į Docker Hub ar GitHub
   Container Registry), Railway servisą galima sukurti tiesiogiai iš to image'o (nurodius jo
   kelią kūrimo metu, panelėje) - taip pat visiškai be GitHub, bet tam reikia patiems pasistatyti
   ir įkelti image'ą į registrą, tad paprastam atvejui CLI variantas patogesnis.

### Toliau - abiem būdams vienodai

4. Tame pačiame projekte: **New → Database → Add PostgreSQL** - Railway automatiškai sukurs
   duomenų bazę ir jos prisijungimo kintamuosius.
5. Grįžkite prie savo serviso (backend'o) nustatymų → **Variables** skiltis:
   - `DATABASE_URL` - paspauskite "New Variable" → "Add Reference" → pasirinkite PostgreSQL
     serviso `DATABASE_URL` (Railway leidžia tiesiogiai susieti kintamąjį tarp servisų, jums
     nereikia rankiniu būdu kopijuoti prisijungimo eilutės).
   - `JWT_SECRET` - įrašykite ilgą atsitiktinę reikšmę (sugeneruokite lokaliai: `node -e
     "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - `PORT` Railway nustato automatiškai - jo pridėti nereikia.
6. Railway aptiks `Dockerfile` ir automatiškai sudarys bei paleis konteinerį. Pirmo deploy'aus
   metu `npm start` automatiškai paleis DB migraciją (sukurs lenteles ir admin paskyrą).
7. **Settings → Networking → Generate Domain** - gausite viešą `https://...up.railway.app` adresą,
   kurį galite siųsti draugams.
8. Prisijunkite prie `admin`/`admin123` ir IŠKART pasikeiskite slaptažodį (žr. aukščiau).

### Alternatyvos

Bet kuri platforma, palaikanti Docker konteinerius ir turinti PostgreSQL (Render, Fly.io, savo
VPS su `docker run`) veiks lygiai taip pat - tereikia nustatyti tuos pačius aplinkos kintamuosius
(`DATABASE_URL`, `JWT_SECRET`, `PORT`). VPS atveju galite paleisti tiesiogiai be Docker:
`npm install --omit=dev && npm start` už reverse proxy (nginx/caddy) su HTTPS.

## Aplinkos kintamieji

Žr. `.env.example` - pilnas sąrašas su komentarais.

## Žinomi apribojimai / tolimesni žingsniai

- Nėra griežto anti-cheat - serveris tikrina tik pagrindinius dalykus (ar taikinys pakankamai
  arti, ar nepažeistas ginklo perkrovimo laikas). Tinka mažam, patikimam žaidėjų ratui (draugams),
  bet nesustabdys techniškai išprususio žaidėjo, norinčio sukčiauti.
- Laužų/grobio atsiradimas lauko scenoje turi ~180ms vėlavimą (ateina per sekantį tinklo
  "snapshot'ą"), nes serveris transliuoja pasaulio būseną periodiškai, o ne kiekvieno veiksmo metu.
- Užblokuotas žaidėjas, jau esantis prisijungęs (aktyvi sesija), nebus automatiškai atjungtas -
  blokavimas sustabdo TIK naujus prisijungimus.
- Admin panelės slaptažodžio keitimo mygtuko dar nėra (žr. instrukciją aukščiau, kaip pakeisti
  per DB tiesiogiai).

## Projekto struktūra

```
vienkiemis-server/
├── Dockerfile, railway.toml, .dockerignore   - diegimo konfigūracija
├── .env.example                              - aplinkos kintamųjų šablonas
├── package.json
├── db/
│   ├── schema.sql        - PostgreSQL schema (idempotentiška)
│   ├── migrate.js         - migracijos skriptas (npm run db:migrate)
│   ├── pool.js, users.js, heroes.js, mapOverrides.js  - DB užklausos
├── src/
│   ├── index.js           - įėjimo taškas (Express + Socket.IO + statiniai failai)
│   ├── auth.js             - JWT / slaptažodžių hash'inimas
│   ├── authRoutes.js       - /api/register, /api/login, /api/hero
│   ├── adminRoutes.js      - /api/admin/*
│   ├── publicRoutes.js     - /api/map-overrides, /api/health
│   ├── terrain.js          - deterministinis reljefo generavimas (identiškas klientui)
│   ├── gameConstants.js    - žaidimo balanso konstantos (identiškos klientui)
│   ├── worldState.js       - bendro pasaulio simuliacija (zombiai/grobis/laužai)
│   └── gameServer.js       - Socket.IO protokolas (žr. failo viršuje esantį komentarą)
└── public/
    └── index.html          - visas klientas (React + Babel, be build žingsnio)
```
