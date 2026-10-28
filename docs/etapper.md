# Etapper

Etapp 1–5 utgör en första version att köra en säsong med.

**Status 2026-10-28:** en prototyp som täcker etapp 1–5 är byggd. Den behöver provas av planerare och lönekörare innan säsongen, De öppna frågorna är besvarade, se [beslut.md](beslut.md).

## Etapp 1: Grund
- Next.js-projekt och PostgreSQL.
- Drift som systemd-tjänst bakom Apache på kcpersonal.npk.nu.
- Databasschema och migreringar.
- Better Auth med inloggningslänk via e-post.
- Roller och behörighetskontroll.
- Admin: användare, standardpass, helgdagar.

## Etapp 2: Planering
- Planerarens rutnät (personer × dagar).
- Skapa pass från standardpass, justera tider och lunch.
- Passtyp ordinarie/förtroendetid.
- Kopiera dag eller vecka.
- Kontroll av överlappande pass.

## Etapp 3: Sommarjobbarvy
- Mina pass (nästa pass, kommande, tidigare).
- Vem jobbar en viss dag.
- Min tid per månad.
- PWA-manifest.

## Etapp 4: Sjukdom och ändringslogg
- Markera pass som sjuk.
- Förslag på ersättare och kopplat ersättarpass.
- Ändringslogg för pass, synlig i redigeringsvyn.

## Etapp 5: Lön
- Månadsavstämning och *Godkänn månad* med låsning.
- Lönevy med normaltid, helgtimmar, sjuktimmar och förtroendetid per dag.
- Export till CSV och Excel.
- *Lås upp* med kommentar.
- Enhetstester för beräkningsreglerna.

## Senare
- Mejlnotis när ens pass ändras.
- Påminnelse dagen före ett pass.
- iCal-länk per sommarjobbare.
