# Beslut och öppna frågor

## Beslut

| Datum | Beslut |
|---|---|
| 2026-10-28 | Tjänsten heter **kcpersonal** (kc = kanotcentralen). Internt verktyg, namnet ska vara enkelt och kunna rymma mer personalrelaterat framöver. |
| 2026-10-28 | Planerad tid gäller som arbetad tid. Ingen stämpling. Avvikelser rättas i efterhand av planeraren. |
| 2026-10-28 | Planeraren godkänner månaden innan löneköraren ser den. Godkänd månad är låst. |
| 2026-10-28 | Lunch anges per pass. Standardpass har en standardlunch som kan justeras. |
| 2026-10-28 | Vid sjukdom markeras passet som sjuk och en ersättare sätts oftast in. |
| 2026-10-28 | Arbetsledare är ingen egen roll. Arbetsledningstimmar läggs som förtroendetid, se nedan. |
| 2026-10-28 | Löneunderlaget följer dagens rutin i Fortnox: normaltid per dag, plus samma timmar igen om det är helg. |
| 2026-10-28 | Ingen koppling till Fortnox. Löneunderlaget exporteras och förs in manuellt. |
| 2026-10-28 | Stack: Next.js och PostgreSQL. Körs på egen server. |
| 2026-10-28 | Inloggning med länk via e-post (Better Auth). Ingen tvåfaktor i första versionen. |
| 2026-10-28 | Känsliga personuppgifter (personnummer, adress, anhörig, bankuppgifter, skatt) hanteras **inte** i tjänsten. De samlas fortsatt in via Google Forms och matas in manuellt i Fortnox. |
| 2026-10-28 | All kod, alla identifierare, kommentarer och commit-meddelanden är på engelska. Gränssnitt och dokumentation är på svenska. Sökvägar i webbadresser är på engelska (`/shifts`, `/planning`, `/payroll`). |
| 2026-10-28 | Prototyp byggd med Drizzle ORM, Tailwind CSS och Better Auth. |
| 2026-10-28 | Inloggningslänken gäller i 15 minuter. Sessionen gäller i 120 dagar för sommarjobbare och 14 dagar för planerare, lön och admin. |
| 2026-10-28 | Helgdagar fylls i automatiskt per år: svenska röda dagar plus midsommarafton. Andra dagar kan läggas till av admin. |
| 2026-10-28 | Innevarande månad kan godkännas, men inte kommande månader. Godkänd månad låser alla pass i månaden. |
| 2026-10-28 | Vid kopiering av vecka kopieras inte sjukmarkerade pass och ersättarpass. Pass som skulle överlappa eller hamna i låst månad hoppas över. |
| 2026-10-28 | CSV-exporten använder semikolon, decimalkomma och UTF-8 med BOM så att den öppnas rätt i svensk Excel. |
| 2026-10-28 | Ingen Docker. Servern delas av flera kunder som är isolerade via Virtualmin, och vanlig Docker kräver root-liknande rättigheter. Appen körs i stället som systemd-tjänst under Virtualmin-användaren bakom Apache. |
| 2026-10-28 | Tjänsten nås på `kcpersonal.npk.nu`, en sub-server under npk.nu. Databasen är sub-serverns PostgreSQL-databas och ingår i Virtualmins backup. |
| 2026-10-28 | Inloggningsmejl skickas via serverns egen Postfix på `localhost`, från en adress på npk.nu. |
| 2026-10-28 | Appen lyssnar på en unix-socket i stället för en TCP-port. På en server med flera kunder kan andra användare nå och kapa loopback-portar, men inte en socket i en katalog som bara appen och Apache kommer in i. Det kräver en egen startfil (`server.mjs`) eftersom `next start` bara stöder portar. |
| 2026-10-28 | Appen körs som Virtualmin-användaren `npk.nu` från `/home/npk.nu/domains/kcpersonal.npk.nu/app`. |
| 2026-10-28 | Midsommarafton räknas som helgdag och ger helgtimmar, även om centralen brukar ha stängt då. |
| 2026-10-28 | Exportformatet (CSV och Excel) är godkänt. |
| 2026-10-28 | Förtroendetid är en egen passtyp för tid helt utanför normal arbetstid, till exempel arbetsledning och offboarding. Den ingår inte i normaltiden, ger inga helgtimmar och redovisas i en egen kolumn. Ett pass med förtroendetid som markeras sjuk ger ingen tid. |
| 2026-10-28 | Inga notiser till sommarjobbarna i första versionen. |
| 2026-10-29 | Personallistan visar bara aktiva personer. Inaktiva visas på en egen lista och kan aktiveras igen. |
| 2026-10-29 | Inaktiva personers kommande pass ligger kvar men ger varningar till admin och planerare, eftersom de inte syns i schemat men räknas i löneunderlaget. Tidigare pass är historik och ger ingen varning. |
| 2026-10-29 | Säkerhetsgenomgång: begränsning av inloggningsförsök (3 per adress, 10 per IP-adress, 15 minuter), bara nödvändiga Better Auth-adresser öppna, säkerhetsrubriker, skydd mot omdirigering till andra webbplatser, skydd mot formler i CSV-exporten, och IP-adress från Apache som betrodd proxy. Se `docs/arkitektur.md`. |
| 2026-10-29 | Ett befintligt pass kan rättas, sjukmarkeras eller tas bort även om personen har blivit inaktiv, till exempel vid månadsavstämningen. Nya pass, flyttade pass och ersättare kan bara ges till aktiva sommarjobbare. |
| 2026-10-29 | Radera tar bort personen och alla pass, även i godkända månader, så att gamla löneunderlag ändras. Ändringshistorik med personens uppgifter och pass tas också bort. Kvar finns bara en rad om att en radering gjorts, utan personuppgifter. Där personen står som den som skapat, ändrat eller godkänt något töms fältet. Ersättarpass för andra finns kvar men förlorar kopplingen. |
| 2026-10-30 | Varje sommarjobbare kan skapa en personlig kalenderlänk (iCal) med sina egna pass. Länken fungerar utan inloggning och skyddas av en slumpad nyckel som kan bytas. Sjukmarkerade pass visas inte. Tider skrivs i UTC så att alla kalendrar visar rätt tid. Inaktivering stänger av länken, och den som kommer tillbaka skapar en ny. |

## Öppna frågor

Inga just nu.
