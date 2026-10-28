# Arkitektur

## Stack

| Del | Val |
|---|---|
| Ramverk | Next.js (App Router), TypeScript |
| Databas | PostgreSQL |
| Databasåtkomst | Drizzle ORM eller Prisma, med migreringar i repot |
| Inloggning | Better Auth, plugin för magic link |
| UI | Server-renderade sidor och server actions. Enkel komponentbas, t.ex. Tailwind |
| Mobil | PWA (manifest och ikon) så att sidan kan läggas på hemskärmen |
| Export | CSV direkt, Excel via t.ex. `exceljs` |
| Drift | Docker Compose på egen VPS bakom befintlig reverse proxy |

## Inloggning

- Inloggningslänk via e-post (magic link), skickad via egen mailserver (SMTP).
- Ingen självregistrering. Admin skapar konton och endast kända, aktiva e-postadresser får en länk.
- Lång session för sommarjobbare (i storleksordningen en säsong) så att de sällan behöver logga in.
- Kortare session för planerare, lön och admin.
- Ingen tvåfaktorsinloggning i första versionen, eftersom inga känsliga personuppgifter lagras. Better Auth har ett TOTP-plugin om det behövs senare.

## Behörighet

Kontrolleras på serversidan i varje server action och route, inte bara genom att dölja knappar.

| Funktion | Sommarjobbare | Planerare | Lön | Admin |
|---|---|---|---|---|
| Se egna pass | ✓ | ✓ | ✓ | ✓ |
| Se vem som jobbar en dag | ✓ | ✓ | ✓ | ✓ |
| Skapa och ändra pass | | ✓ | | |
| Godkänna månad | | ✓ | | |
| Se löneunderlag, exportera | | | ✓ | |
| Låsa upp månad | | | ✓ | |
| Användare, standardpass, helgdagar | | | | ✓ |

## Föreslagen mappstruktur

```
src/
  app/
    (auth)/login/          inloggning
    mina-pass/             sommarjobbare
    dag/[datum]/           vem jobbar
    planering/             rutnät, sjukdom, månadsavstämning
    lon/                   löneunderlag och export
    admin/                 användare, standardpass, helgdagar
  lib/
    auth.ts                Better Auth-konfiguration
    db/                    schema och migreringar
    time.ts                beräkningsregler (arbetad tid, helg, sjuk)
    permissions.ts         rollkontroller
docs/
```

Beräkningsreglerna i `lib/time.ts` ska ha enhetstester, eftersom löneunderlaget bygger på dem.

## Drift

- `docker-compose.yml` med app och PostgreSQL.
- Miljövariabler: databas-URL, hemlighet för Better Auth, SMTP-inställningar, publik URL.
- Nattlig `pg_dump` till backup.
- HTTPS via befintlig reverse proxy.
