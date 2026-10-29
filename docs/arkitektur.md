# Arkitektur

## Stack

| Del | Val |
|---|---|
| Ramverk | Next.js 16 (App Router), TypeScript |
| Databas | PostgreSQL 14 eller senare (servern kör Ubuntu 22.04 med version 14) |
| Databasåtkomst | Drizzle ORM, SQL-migreringar i `drizzle/` |
| Inloggning | Better Auth med plugin för magic link |
| UI | Server-renderade sidor och server actions, Tailwind CSS 4 |
| Typsnitt | Atkinson Hyperlegible (text) och Bricolage Grotesque (rubriker, tider), självhostade via Fontsource |
| Mobil | PWA-manifest och ikon så att sidan kan läggas på hemskärmen |
| Export | CSV (semikolon, decimalkomma) och Excel via `exceljs` |
| Tester | Vitest för beräkningsregler, datum och export |
| Drift | Systemd-tjänst bakom Apache på egen VPS (Virtualmin), se [drift.md](drift.md) |

All kod, alla identifierare och kommentarer är på engelska. Gränssnittet och dokumentationen är på svenska.

## Inloggning

- Inloggningslänk via e-post, skickad via SMTP. Länken gäller i 15 minuter och kan bara användas en gång. Token lagras hashad.
- Ingen självregistrering. Bara kända, aktiva e-postadresser får en länk. Svaret i webbläsaren är detsamma oavsett om adressen finns, så adresser kan inte provas fram.
- Sessionen gäller i 120 dagar för sommarjobbare.
- För planerare, lön och admin krävs ny inloggning efter 14 dagar (`src/lib/session.ts`).
- Ändrad e-post, ändrade roller eller inaktivering loggar ut personen överallt.
- Utan `SMTP_HOST` i utvecklingsläge skrivs länken till serverloggen. I produktion krävs SMTP. Mejl skickas via serverns egen Postfix på `localhost`.
- Ingen tvåfaktorsinloggning, eftersom inga känsliga personuppgifter lagras. Better Auth har ett TOTP-plugin om det behövs senare.

## Behörighet

Kontrolleras på serversidan i varje sida, server action och route med `requireRole()`, inte bara genom att dölja länkar.

| Funktion | Sommarjobbare | Planerare | Lön | Admin |
|---|---|---|---|---|
| Se egna pass | ✓ | | | |
| Se vem som jobbar en dag | ✓ | ✓ | ✓ | ✓ |
| Skapa och ändra pass | | ✓ | | |
| Godkänna månad | | ✓ | | |
| Se löneunderlag, exportera | | | ✓ | |
| Låsa upp månad | | | ✓ | |
| Personal, standardpass, helgdagar | | | | ✓ |

En person kan ha flera roller.

## Säkerhet

Utöver inloggningen och behörighetskontrollerna ovan:

- **Begränsning av inloggningsförsök:** formuläret skickar högst 3 länkar per e-postadress och tar emot högst 10 försök per IP-adress på 15 minuter (`src/lib/rate-limit.ts`). Gränsen gäller oavsett om adressen finns, så den avslöjar inget om vilka konton som finns. Räknarna ligger i minnet och nollställs när tjänsten startas om.
- **Klientens IP-adress:** bakom Apache är det den sista posten i `X-Forwarded-For` (`src/lib/client-ip.ts`). Better Auth är inställt på samma sätt. Posterna före den kommer från klienten och kan förfalskas.
- **Better Auths adresser:** bara de adresser som används är öppna (`src/app/api/auth/[...all]/route.ts`): verifiering av inloggningslänken, sessionskontroll och utloggning. Allt annat, till exempel `/update-user`, svarar 404. Ändringar av personer görs bara via admin-sidorna.
- **Säkerhetsrubriker** (`next.config.ts`): sidorna får inte bäddas in på andra webbplatser, HSTS är påslaget och `X-Powered-By` är borttagen.
- **Omdirigeringar** efter formulär tillåter bara sökvägar inom tjänsten (`src/lib/redirect.ts`).
- **CSV-exporten** sätter en apostrof före fält som börjar med `=`, `+`, `-` eller `@`, så att Excel inte kör dem som formler.
- **Formulär** skyddas mot förfalskning av Next.js kontroll av `Origin`. Det kräver `ProxyPreserveHost On` i Apache.

## Sidor

| Sökväg | Roll | Innehåll |
|---|---|---|
| `/login` | alla | Begär inloggningslänk |
| `/shifts` | sommarjobbare | Nästa pass, kommande och tidigare pass, min tid |
| `/day/[date]` | alla | Vem som jobbar en viss dag |
| `/planning` | planerare | Veckorutnät, snabbval av standardpass, kopiera vecka |
| `/planning/shifts/new`, `/planning/shifts/[id]` | planerare | Skapa och ändra pass, sjukdom, ersättare, historik |
| `/reconcile` | planerare | Månadsavstämning och godkännande |
| `/payroll`, `/payroll/[month]` | lön | Godkända månader, löneunderlag, lås upp |
| `/payroll/[month]/export?format=csv\|xlsx` | lön | Export |
| `/admin/users`, `/admin/templates`, `/admin/holidays` | admin | Grunddata |

## Kodstruktur

```
src/
  app/
    login/                 inloggning och utloggning
    api/auth/[...all]/     Better Auth
    (app)/                 inloggade sidor, gemensam meny
      shifts/  day/  planning/  reconcile/  payroll/  admin/
  components/              delade komponenter
  db/
    schema.ts              tabeller
    seed.ts                påhittad demodata
  lib/
    auth.ts                Better Auth-konfiguration
    session.ts             inloggad användare och rollkontroller
    time.ts                beräkningsregler (arbetad tid, helg, sjuk) – testad
    dates.ts               datumhjälpare – testad
    holidays.ts            svenska röda dagar – testad
    schedule.ts            databasfrågor för pass, låsning och löneunderlag
    payroll-export.ts      CSV och Excel – testad
    audit.ts               ändringslogg
    mail.ts                utskick av inloggningslänk
server.mjs                 produktionsserver (unix-socket), ersätter `next start`
drizzle/                   SQL-migreringar
scripts/
  migrate.mjs              kör migreringar
  create-admin.mjs         skapar första admin
  deploy.sh                uppdaterar på servern
deploy/
  kcpersonal.service       systemd-tjänst
  apache-proxy.conf        Apache-direktiv för vhosten
```

## Drift

Se [drift.md](drift.md). I korthet:

- Sub-server `kcpersonal.npk.nu` under npk.nu i Virtualmin.
- Node.js körs som systemd-tjänst (`deploy/kcpersonal.service`) under Virtualmin-användaren `npk.nu` och lyssnar på unix-socketen `/run/kcpersonal/kcpersonal.sock`, som bara appen och Apache kommer åt.
- Apache är proxy med HTTPS (`deploy/apache-proxy.conf`).
- PostgreSQL-databasen hör till sub-servern och ingår i Virtualmins backup.
- Uppdatering med `scripts/deploy.sh`.
