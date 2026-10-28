# Fortnox och löneunderlag

Kanotcentralen använder Fortnox med lönemodulen.

## Så rapporteras det idag

För varje sommarjobbare och dag i lönekalendern i Fortnox:
- antal timmar normal tid
- om det är helg: samma antal timmar läggs till en gång till, så att de får extra lön för helgen

## Etapp 1: export

kcpersonal tar fram ett underlag som löneköraren för in manuellt i Fortnox, precis som idag. Ingen extra Fortnox-licens krävs.

Exportformat (CSV och Excel), en rad per person och dag med tid:

| Kolumn | Exempel |
|---|---|
| Anställningsnummer | 12 |
| Namn | Anna Andersson |
| Datum | 2027-07-03 |
| Veckodag | lör |
| Normaltid (h) | 7,50 |
| Helgtimmar (h) | 7,50 |
| Sjuk (h) | 0,00 |
| varav arbetsledning (h) | 0,00 |

Plus summering per person. Decimalkomma används i Excel-exporten.

## Senare etapp: API-koppling

Fortnox API har endpoints för närvarotransaktioner (attendance transactions), som motsvarar timmarna i lönekalendern, och för frånvarotransaktioner (absence transactions), som sjukdom.

Förutsättningar:
- Tilläggslicensen **Integration** i Fortnox (189 kr/mån enligt prislistan i oktober 2026, obegränsat antal integrationer).
- Registrering som utvecklare på apps.fortnox.se/developer och en egen integration med OAuth 2.0.
- Anställningsnummer i Fortnox sparat på varje användare (`fortnox_employee_id`).

Tänkt flöde: knappen *Skicka till Fortnox* i lönevyn för en godkänd månad.
- Normaltid → närvarotransaktion med orsakskod för normal tid.
- Helgtimmar → närvarotransaktion med orsakskod för helgtillägg.
- Sjuktimmar → frånvarotransaktion för sjukdom.
- Det som skickats markeras, så att samma månad inte skickas två gånger.

Vilka orsakskoder som används hos er behöver bekräftas av löneköraren (se [beslut.md](beslut.md)).

## Sjuktimmar

Sjukdom på ett inplanerat pass ger rätt till sjuklön även för timanställda, med karensavdrag. kcpersonal redovisar därför sjuktimmarna separat som underlag. Hur de hanteras i lönekörningen avgörs av löneköraren.
