# Krav

## Bakgrund

Kanotcentralen har varje säsong ungefär 8 sommarjobbare. De har inga fasta scheman, utan passen planeras olika för olika dagar och helger. Idag saknas ett gemensamt ställe där sommarjobbarna enkelt ser sina tider, planeraren lägger schemat och löneköraren hämtar underlag.

## Roller

En användare kan ha flera roller.

| Roll | Beskrivning |
|---|---|
| Sommarjobbare | Ser sina egna pass och vilka som jobbar samma dag. |
| Planerare | Lägger och ändrar schemat, hanterar sjukdom, godkänner månaden. |
| Lön | Ser godkända månader och tar fram löneunderlag. |
| Admin | Hanterar användare, standardpass och helgdagar. |

Planerare och lönekörare är olika personer.

**Arbetsledare** är ingen egen roll. Det är en sommarjobbare med högre lön och några extra timmar för arbetsledning. De timmarna läggs in som pass av typen *arbetsledning* så att de syns separat i löneunderlaget. Lönenivån hanteras i Fortnox.

## Funktionella krav

### Schema
- K1. Planeraren lägger pass per person och dag.
- K2. Det finns ett antal **standardpass** med starttid, sluttid och standardlunch.
- K3. Ett pass kan baseras på ett standardpass och sedan få justerade tider och justerad lunch.
- K4. Lunchen kan variera per pass.
- K5. Pass kan ändras både när schemat läggs och i efterhand.
- K6. Pass kan kopieras, till exempel en dag eller vecka som grund för nästa.

### Sjukdom
- K7. Ett pass kan markeras som sjuk.
- K8. Oftast sätts en ersättare in. Ersättarens pass kopplas till det ursprungliga passet.

### Arbetad tid
- K9. Planerad tid gäller som arbetad tid. Ingen stämpling.
- K10. Avvikelser korrigeras i efterhand av planeraren.
- K11. Arbetad tid = sluttid − starttid − lunch.
- K12. Planeraren markerar för löneköraren att månadens tid är godkänd. Godkänd månad är låst för ändringar.

### Lön
- K13. Löneköraren ser arbetad tid per person och dag för godkända månader.
- K14. Underlaget ska passa hur det rapporteras i Fortnox idag: antal timmar normal tid per dag, plus samma antal timmar en gång till om det är helg. Se [fortnox.md](fortnox.md).
- K15. Sjuktimmar och arbetsledningstimmar redovisas separat.

### Sommarjobbare
- K16. Ser sina pass i mobilen, i första hand kommande pass.
- K17. Ser vilka som jobbar samma dag.
- K18. Ser summerad arbetad tid för månaden.

### Inloggning
- K19. Alla har en egen inloggning.
- K20. Inloggningen ska vara enkel för sommarjobbarna i mobilen.

## Icke-funktionella krav

- Mobilanpassat för sommarjobbare. Planerar- och lönevyerna används främst på dator.
- Körs på egen server.
- Enkelt att underhålla, eftersom verktyget främst används under en säsong per år.
- Svenska i gränssnittet. Tidszon Europe/Stockholm.

## Utanför omfattningen

- Insamling av känsliga personuppgifter (personnummer, adress, anhörig, bankuppgifter, skatt). Görs via Google Forms och manuellt i Fortnox.
- In- och utstämpling.
- Lönenivåer och lönesättning.
