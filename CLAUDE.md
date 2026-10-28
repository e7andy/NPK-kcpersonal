# kcpersonal

Internt schema- och tidsverktyg för kanotcentralens sommarjobbare. Läs `README.md` och `docs/` innan du ändrar något. Kodstrukturen beskrivs i `docs/arkitektur.md`.

- Gränssnitt och dokumentation på svenska. All kod, identifierare, kommentarer och commit-meddelanden ska vara på engelska.
- Stack: Next.js (App Router, TypeScript), PostgreSQL, Better Auth (magic link). Körs som systemd-tjänst bakom Apache på egen server (Virtualmin, kcpersonal.npk.nu), ingen Docker. Se `docs/drift.md`.
- Tidszon Europe/Stockholm. Pass lagras som datum + start/slut-klockslag, inte över midnatt.
- Arbetad tid lagras aldrig, den räknas fram (se `docs/datamodell.md`). Beräkningsreglerna ska ha enhetstester.
- Behörighet kontrolleras på serversidan.
- Lagra inga känsliga personuppgifter (personnummer, bankuppgifter, adress, anhörig, skatt). Det är ett uttalat beslut, se `docs/beslut.md`.
- Nya beslut läggs till i `docs/beslut.md`.
- Repot kan vara publikt. Hemligheter ligger bara i `.env` på servern; nya miljövariabler läggs till i `.env.example` utan riktiga värden. Seed-data och testdata ska vara påhittade, aldrig riktiga personers namn, e-post eller telefon.
- Kör `npm test` och `npm run lint` före commit. Ändras schemat: `npm run db:generate` och checka in migreringen.
