# Beslut och öppna frågor

## Beslut

| Datum | Beslut |
|---|---|
| 2026-10-28 | Tjänsten heter **kcpersonal** (kc = kanotcentralen). Internt verktyg, namnet ska vara enkelt och kunna rymma mer personalrelaterat framöver. |
| 2026-10-28 | Planerad tid gäller som arbetad tid. Ingen stämpling. Avvikelser rättas i efterhand av planeraren. |
| 2026-10-28 | Planeraren godkänner månaden innan löneköraren ser den. Godkänd månad är låst. |
| 2026-10-28 | Lunch anges per pass. Standardpass har en standardlunch som kan justeras. |
| 2026-10-28 | Vid sjukdom markeras passet som sjuk och en ersättare sätts oftast in. |
| 2026-10-28 | Arbetsledare är ingen egen roll, utan arbetsledningstimmar läggs som en egen passtyp. |
| 2026-10-28 | Löneunderlaget följer dagens rutin i Fortnox: normaltid per dag, plus samma timmar igen om det är helg. |
| 2026-10-28 | Första versionen exporterar underlag. Fortnox API-koppling görs senare (kräver licensen Integration). |
| 2026-10-28 | Stack: Next.js och PostgreSQL. Körs på egen server. |
| 2026-10-28 | Inloggning med länk via e-post (Better Auth). Ingen tvåfaktor i första versionen. |
| 2026-10-28 | Känsliga personuppgifter (personnummer, adress, anhörig, bankuppgifter, skatt) hanteras **inte** i tjänsten. De samlas fortsatt in via Google Forms och matas in manuellt i Fortnox. |
| 2026-10-28 | All kod, alla identifierare, kommentarer och commit-meddelanden är på engelska. Gränssnitt och dokumentation är på svenska. Sökvägar i webbadresser är på engelska (`/shifts`, `/planning`, `/payroll`). |
| 2026-10-28 | Prototyp byggd med Drizzle ORM, Tailwind CSS och Better Auth. |
| 2026-10-28 | Inloggningslänken gäller i 15 minuter. Sessionen gäller i 120 dagar för sommarjobbare och 14 dagar för planerare, lön och admin. |
| 2026-10-28 | Röda dagar fylls i automatiskt per år från en beräkning av svenska helgdagar. Aftnar läggs till manuellt av admin om de ska ge helgtimmar. |
| 2026-10-28 | Innevarande månad kan godkännas, men inte kommande månader. Godkänd månad låser alla pass i månaden. |
| 2026-10-28 | Vid kopiering av vecka kopieras inte sjukmarkerade pass och ersättarpass. Pass som skulle överlappa eller hamna i låst månad hoppas över. |
| 2026-10-28 | CSV-exporten använder semikolon, decimalkomma och UTF-8 med BOM så att den öppnas rätt i svensk Excel. |

## Öppna frågor

1. **Vad räknas som helg?** Prototypen räknar lördag, söndag och röda dagar. Räknas även midsommarafton och andra aftnar som helg? De kan i så fall läggas till under Helgdagar.
2. **Orsakskoder i Fortnox** för normal tid, helgtillägg och sjukdom. Behövs för API-kopplingen.
3. **Exportformat:** stämmer föreslaget format med hur löneköraren arbetar i Fortnox?
4. **Arbetsledningstimmar:** ska de rapporteras på egen orsakskod i Fortnox, eller räcker det att de ingår i normaltiden?
5. **Notiser:** ska sommarjobbare få mejl när deras pass ändras redan i första versionen?
6. **Domän:** var ska tjänsten nås?
