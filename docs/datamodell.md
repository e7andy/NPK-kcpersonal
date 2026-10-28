# Datamodell

PostgreSQL. Tider lagras som lokal tid (Europe/Stockholm) med separata kolumner för datum och klockslag, eftersom pass alltid tillhör en arbetsdag och inte går över midnatt. Lunch och beräknade tider hanteras i hela minuter.

Schemat finns i `src/db/schema.ts` och migreringarna i `drizzle/`. Id:n är UUID:er lagrade som text.

## Tabeller

### `user`
Tabellen delas med Better Auth, som också använder `session`, `account` och `verification`. Kolumnerna nedan utöver Better Auths egna hanteras av appen.

| Kolumn | Typ | Kommentar |
|---|---|---|
| id | text | |
| name | text | |
| email | text, unik | Används för inloggning |
| phone | text, null | |
| email_verified, image | | Better Auth |
| roles | text[] | `worker`, `planner`, `payroll`, `admin` |
| fortnox_employee_id | text, null | Anställningsnummer i Fortnox |
| active | boolean | Inaktiva kan inte logga in och visas inte i schemat |
| created_at, updated_at | timestamptz | |

Inga känsliga personuppgifter lagras.

### `shift_templates` (standardpass)
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | text | |
| name | text | t.ex. "Förmiddag" |
| start_time | time | |
| end_time | time | |
| lunch_minutes | integer | Standardlunch |
| sort_order | integer | |
| active | boolean | |

### `shifts` (pass)
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | text | |
| user_id | text → user | |
| date | date | |
| start_time | time | |
| end_time | time | `end_time > start_time` |
| lunch_minutes | integer | `>= 0` och mindre än passets längd |
| type | text | `regular` eller `supervision` (arbetsledning) |
| status | text | `planned` eller `sick` |
| template_id | text → shift_templates, null | Vilket standardpass passet utgick från |
| replaces_shift_id | text → shifts, null | Satt på ersättarens pass |
| note | text, null | |
| created_by, updated_by | text → user | |
| created_at, updated_at | timestamptz | |

Index på `(date)` och `(user_id, date)`.

Databasen kontrollerar att sluttid är efter starttid, att lunch inte är negativ och att typ och status har giltiga värden. Överlappande pass för samma person och att lunchen är kortare än passet kontrolleras i applikationen.

### `month_approvals`
| Kolumn | Typ | Kommentar |
|---|---|---|
| month | date, PK | Första dagen i månaden |
| status | text | `approved` eller `unlocked` |
| approved_by | text → user | |
| approved_at | timestamptz | |
| unlocked_by | text → user, null | Satt när löneköraren skickat tillbaka månaden |
| unlocked_at | timestamptz, null | |
| unlock_comment | text, null | Vad som behöver rättas |

En månad är låst när status är `approved`. Saknas rad är månaden öppen. Hela historiken över godkännanden och upplåsningar finns i `audit_log`.

### `holidays`
| Kolumn | Typ | Kommentar |
|---|---|---|
| date | date, PK | |
| name | text | t.ex. "Midsommardagen" |

### `audit_log`
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | bigserial | |
| entity | text | `shift`, `month`, `user`, `template`, `holiday` |
| entity_id | text | |
| action | text | `create`, `update`, `delete`, `sick`, `unsick`, `replace`, `approve`, `unlock` |
| before | jsonb, null | |
| after | jsonb, null | |
| user_id | text → user | |
| created_at | timestamptz | |

## Beräkningsregler

Arbetad tid lagras aldrig, den räknas alltid fram.

```
passlängd   = end_time − start_time
arbetad tid = passlängd − lunch_minutes        (om status = planned)
sjuktid     = passlängd − lunch_minutes        (om status = sick)
```

Per person och dag:

| Fält | Regel |
|---|---|
| normaltid | Summa arbetad tid för pass med `status = planned` (både ordinarie och arbetsledning) |
| arbetsledning | Del av normaltid från pass med `type = supervision` |
| helgtimmar | Lika med normaltid om dagen är helg, annars 0 |
| sjuktimmar | Summa sjuktid för pass med `status = sick` |

**Helg** = lördag, söndag eller datum i `holidays`. Se öppen fråga i [beslut.md](beslut.md).

Timmar redovisas med två decimaler (minuter / 60).

## Låsning

När en månad är godkänd kan pass i den månaden inte skapas, ändras eller tas bort. Kontrolleras på serversidan för varje skrivning.
