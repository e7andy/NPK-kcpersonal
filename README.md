# kcpersonal

Internt verktyg för kanotcentralen (kc) för att planera sommarjobbarnas arbetspass, visa dem i mobilen och ta fram underlag till lönekörningen i Fortnox.

## Vad tjänsten gör

- **Sommarjobbare** ser sina pass i mobilen, och vem som jobbar samma dag.
- **Planerare** lägger schemat med standardpass eller justerade tider, hanterar sjukdom med ersättare, rättar avvikelser i efterhand och godkänner månaden.
- **Lönekörare** ser godkända månader med arbetad tid per person och dag, med lunch avdragen och helgtimmar uppdelade, och exporterar underlag till Fortnox.
- **Admin** hanterar personal, standardpass och helgdagar.

## Vad tjänsten inte gör

- Den samlar **inte** in känsliga personuppgifter (personnummer, bankuppgifter, adress, anhörig, skatt). Det görs fortsatt via Google Forms och matas in manuellt i Fortnox.
- Ingen in- och utstämpling. Planerad tid gäller som arbetad tid.

## Kom igång lokalt

Kräver Node.js 22 och PostgreSQL 16.

```sh
npm install
cp .env.example .env            # fyll i DATABASE_URL och BETTER_AUTH_SECRET
npm run db:migrate
npm run db:seed                 # påhittad demodata, raderar befintliga pass
npm run dev
```

Öppna http://localhost:3000 och logga in med någon av demoadresserna nedan. Utan `SMTP_HOST` skrivs inloggningslänken till terminalen där `npm run dev` körs.

| E-post | Roll |
|---|---|
| `admin@example.com` | Admin |
| `planerare@example.com` | Planerare |
| `lon@example.com` | Lön |
| `alva@example.com` (och `elis@`, `freja@`, `hugo@` …) | Sommarjobbare |

Föregående månad är godkänd i demodatan så att lönevyn har innehåll.

### Kommandon

| Kommando | Gör |
|---|---|
| `npm run dev` | Utvecklingsserver |
| `npm test` | Enhetstester (beräkningsregler, datum, helgdagar, export) |
| `npm run lint` | Typkontroll |
| `npm run db:generate` | Skapar migrering efter ändring i `src/db/schema.ts` |
| `npm run db:migrate` | Kör migreringar |
| `npm run db:seed` | Laddar påhittad demodata |
| `npm run create-admin -- e-post "Namn"` | Skapar en admin, eller ger en befintlig person admin-rollen |

## Driftsättning

1. Kopiera `.env.example` till `.env` på servern och fyll i alla värden, inklusive SMTP. Generera `BETTER_AUTH_SECRET` med `openssl rand -base64 32`. `BETTER_AUTH_URL` ska vara den publika adressen.
2. Starta:
   ```sh
   docker compose up -d --build
   ```
   Migreringarna körs automatiskt när appen startar.
3. Skapa första admin:
   ```sh
   docker compose exec app node scripts/create-admin.mjs du@example.se "Ditt Namn"
   ```
4. Peka reverse proxyn (HTTPS) mot `127.0.0.1:3000`.
5. Logga in som admin, lägg till röda dagar för året under Helgdagar, skapa standardpass och lägg till personal.

### Backup

```sh
docker compose exec -T db pg_dump -U kcpersonal kcpersonal | gzip > backups/kcpersonal-$(date +%F).sql.gz
```

Lägg kommandot i cron för en nattlig backup.

## Dokumentation

| Dokument | Innehåll |
|---|---|
| [docs/krav.md](docs/krav.md) | Bakgrund, roller och krav |
| [docs/vyer.md](docs/vyer.md) | Vyer och flöden per roll |
| [docs/datamodell.md](docs/datamodell.md) | Tabeller och beräkningsregler |
| [docs/fortnox.md](docs/fortnox.md) | Löneunderlag, export och framtida API-koppling |
| [docs/arkitektur.md](docs/arkitektur.md) | Teknikstack, inloggning, sidor, kodstruktur och drift |
| [docs/etapper.md](docs/etapper.md) | Utvecklingsplan i etapper |
| [docs/beslut.md](docs/beslut.md) | Beslutslogg och öppna frågor |

## Teknik i korthet

Next.js 16 (TypeScript), PostgreSQL med Drizzle ORM, Better Auth med inloggningslänk via e-post, Tailwind CSS. Körs i Docker på egen server.
