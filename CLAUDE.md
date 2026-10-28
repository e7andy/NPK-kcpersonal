# kcpersonal

Internt schema- och tidsverktyg för kanotcentralens sommarjobbare. Läs `README.md` och `docs/` innan du ändrar något.

- Gränssnitt och dokumentation på svenska. Kod, identifierare och commit-meddelanden får vara på engelska.
- Stack: Next.js (App Router, TypeScript), PostgreSQL, Better Auth (magic link). Körs i Docker på egen server.
- Tidszon Europe/Stockholm. Pass lagras som datum + start/slut-klockslag, inte över midnatt.
- Arbetad tid lagras aldrig, den räknas fram (se `docs/datamodell.md`). Beräkningsreglerna ska ha enhetstester.
- Behörighet kontrolleras på serversidan.
- Lagra inga känsliga personuppgifter (personnummer, bankuppgifter, adress, anhörig, skatt). Det är ett uttalat beslut, se `docs/beslut.md`.
- Nya beslut läggs till i `docs/beslut.md`.
- Repot kan vara publikt. Hemligheter ligger bara i `.env` på servern; nya miljövariabler läggs till i `.env.example` utan riktiga värden. Seed-data och testdata ska vara påhittade, aldrig riktiga personers namn, e-post eller telefon.
