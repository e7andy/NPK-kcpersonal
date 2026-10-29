# Vyer och flöden

Efter inloggning landar användaren i vyn för sin huvudroll. Har man flera roller finns en växlare i menyn.

## Sommarjobbare (mobil först)

**Mina pass**
- Överst: nästa pass, stort och tydligt (datum, tid, lunch, typ).
- Därunder: kommande pass i en lista, grupperade per vecka.
- Tidigare pass under en egen flik.

**Idag / dag**
- Vilka som jobbar en viss dag och deras tider. Går att bläddra mellan dagar.

**Min tid**
- Summerad arbetad tid för innevarande och föregående månad.

**Kalenderlänk (senare etapp)**
- Personlig iCal-länk som kan prenumereras på i telefonens kalender.

Sommarjobbare kan inte ändra pass. Ändringar görs av planeraren.

## Planerare

**Schema (rutnät)**
- Personer på rader, dagar på kolumner. Visning en eller två veckor, bläddra framåt och bakåt.
- Klick i tom cell: välj standardpass. Passet skapas direkt.
- Klick på pass: redigera start, slut, lunch och typ (ordinarie/förtroendetid), eller ta bort.
- Summering per person och vecka.
- Kopiera dag eller vecka till annat datum.
- Helgdagar och helger markeras visuellt.
- Inaktiva personer syns inte som rader. Har de kommande pass under veckan visas en varning med länkar till passen, så att planeraren kan ta bort eller flytta dem.

**Sjukdom och ersättare**
1. Planeraren öppnar passet och väljer *Sjuk*.
2. Passet markeras som sjuk och räknas som sjuktimmar, inte arbetad tid.
3. Systemet listar möjliga ersättare: de som inte redan har pass som överlappar.
4. Planeraren väljer ersättare. Ett nytt pass skapas med samma tider och kopplas till det sjukmarkerade passet.
5. Tiderna på ersättarens pass kan justeras.

**Månadsavstämning**
- Lista över månadens pass per person, med summeringar.
- Här rättas avvikelser i efterhand.
- Knappen *Godkänn månad* låser månaden och gör den synlig för löneköraren.

## Lön

**Månadsöversikt**
- Lista över månader och status: ej godkänd / godkänd.
- Endast godkända månader kan öppnas.

**Löneunderlag för månad**
- Tabell per person med en rad per dag och kolumnerna:
  - normaltid (timmar)
  - helgtimmar
  - sjuktimmar
  - förtroendetid
- Summa per person.
- Export (CSV och Excel). Se [fortnox.md](fortnox.md).
- *Lås upp* skickar tillbaka månaden till planeraren om något är fel. Kommentar krävs.

## Admin

- Användare: namn, e-post, telefon, roller, anställningsnummer i Fortnox, aktiv/inaktiv.
  - Listan visar bara aktiva personer. *Visa inaktiva* tar fram de inaktiva, som kan aktiveras igen när de kommer tillbaka.
  - Har en inaktiv person kommande pass varnar tjänsten: när personen sparas som inaktiv, på personens sida och i listan över inaktiva, som visar antal kommande pass.
  - *Radera* tar bort personen permanent via en bekräftelsesida där personens namn måste skrivas in. Sidan visar hur många pass som försvinner och varnar om några ligger i godkända månader. Admin kan inte radera sig själv.
- Standardpass: namn, start, slut, standardlunch, sortering, aktiv/inaktiv.
- Helgdagar: datum och namn.

## Ändringshistorik

Alla ändringar av pass loggas. Historiken för ett pass visas i redigeringsvyn och i månadsavstämningen.
