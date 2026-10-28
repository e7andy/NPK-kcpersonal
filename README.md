# kcpersonal

Internt verktyg för kanotcentralen (kc) för att planera sommarjobbarnas arbetspass, visa dem i mobilen och ta fram underlag till lönekörningen i Fortnox.

## Vad tjänsten gör

- **Sommarjobbare** ser sina pass i mobilen, och vem som jobbar samma dag.
- **Planerare** lägger schemat med standardpass eller justerade tider, hanterar sjukdom med ersättare, rättar avvikelser i efterhand och godkänner månaden.
- **Lönekörare** ser godkända månader med arbetad tid per person och dag, med lunch avdragen och helgtimmar uppdelade, och exporterar underlag till Fortnox.

## Vad tjänsten inte gör

- Den samlar **inte** in känsliga personuppgifter (personnummer, bankuppgifter, adress, anhörig, skatt). Det görs fortsatt via Google Forms och matas in manuellt i Fortnox.
- Ingen in- och utstämpling. Planerad tid gäller som arbetad tid.

## Dokumentation

| Dokument | Innehåll |
|---|---|
| [docs/krav.md](docs/krav.md) | Bakgrund, roller och krav |
| [docs/vyer.md](docs/vyer.md) | Vyer och flöden per roll |
| [docs/datamodell.md](docs/datamodell.md) | Tabeller och beräkningsregler |
| [docs/fortnox.md](docs/fortnox.md) | Löneunderlag, export och framtida API-koppling |
| [docs/arkitektur.md](docs/arkitektur.md) | Teknikstack, inloggning och drift |
| [docs/etapper.md](docs/etapper.md) | Utvecklingsplan i etapper |
| [docs/beslut.md](docs/beslut.md) | Beslutslogg och öppna frågor |

## Teknik i korthet

Next.js (TypeScript), PostgreSQL, Better Auth med inloggningslänk via e-post. Körs i Docker på egen server.
