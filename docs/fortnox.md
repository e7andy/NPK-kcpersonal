# Löneunderlag och Fortnox

Kanotcentralen använder Fortnox med lönemodulen. kcpersonal har ingen koppling till Fortnox. Löneköraren exporterar underlaget och för in timmarna manuellt, som idag.

## Så rapporteras det i Fortnox

För varje sommarjobbare och dag i lönekalendern:
- antal timmar normal tid
- om det är helg eller helgdag: samma antal timmar läggs till en gång till, så att de får extra lön för helgen

Förtroendetid rapporteras separat. Den ligger helt utanför normal arbetstid.

## Export

Exportformatet är godkänt av löneköraren. CSV och Excel har en rad per person och dag med tid, plus en summeringsrad per person:

| Kolumn | Exempel |
|---|---|
| Anställningsnummer | 12 |
| Namn | Anna Andersson |
| Datum | 2027-07-03 |
| Veckodag | lör |
| Normaltid (h) | 7,50 |
| Helgtimmar (h) | 7,50 |
| Sjuk (h) | 0,00 |
| Förtroendetid (h) | 1,00 |

- Anställningsnumret är numret i Fortnox och anges per person under *Personal*.
- Excel-filen har talformat med två decimaler.
- CSV-filen använder semikolon och decimalkomma så att den öppnas rätt i svensk Excel.

## Helg

Helgtimmar ges för ordinarie arbetstid på:
- lördagar och söndagar
- röda dagar
- midsommarafton, som räknas som helgdag även om centralen brukar ha stängt
- andra dagar som admin lägger till under *Helgdagar*

Förtroendetid ger inga helgtimmar.

## Förtroendetid

Förtroendetid är extra tid utanför normal arbetstid, till exempel arbetsledning och offboarding. Den läggs som pass av typen *Förtroendetid*. Den ingår inte i normaltiden och redovisas i en egen kolumn.

## Sjuktimmar

Sjukdom på ett inplanerat ordinarie pass ger rätt till sjuklön även för timanställda, med karensavdrag. kcpersonal redovisar därför sjuktimmarna separat som underlag. Hur de hanteras i lönekörningen avgörs av löneköraren.

Ett pass med förtroendetid som markeras som sjuk ger varken förtroendetid eller sjuktid.
