# Datamodell

PostgreSQL. Tider lagras som lokal tid (Europe/Stockholm) med separata kolumner för datum och klockslag, eftersom pass alltid tillhör en arbetsdag och inte går över midnatt. Lunch och beräknade tider hanteras i hela minuter.

Tabeller för inloggning och sessioner hanteras av Better Auth och beskrivs inte här.

## Tabeller

### `users`
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | uuid | |
| name | text | |
| email | text, unik | Används för inloggning |
| phone | text, null | |
| roles | text[] | `worker`, `planner`, `payroll`, `admin` |
| fortnox_employee_id | text, null | Anställningsnummer i Fortnox |
| active | boolean | Inaktiva kan inte logga in och visas inte i schemat |
| created_at, updated_at | timestamptz | |

Inga känsliga personuppgifter lagras.

### `shift_templates` (standardpass)
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | uuid | |
| name | text | t.ex. "Förmiddag" |
| start_time | time | |
| end_time | time | |
| lunch_minutes | integer | Standardlunch |
| sort_order | integer | |
| active | boolean | |

### `shifts` (pass)
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | uuid | |
| user_id | uuid → users | |
| date | date | |
| start_time | time | |
| end_time | time | `end_time > start_time` |
| lunch_minutes | integer | `>= 0` och mindre än passets längd |
| type | text | `regular` eller `supervision` (arbetsledning) |
| status | text | `planned` eller `sick` |
| template_id | uuid → shift_templates, null | Vilket standardpass passet utgick från |
| replaces_shift_id | uuid → shifts, null | Satt på ersättarens pass |
| note | text, null | |
| created_by, updated_by | uuid → users | |
| created_at, updated_at | timestamptz | |

Index på `(date)` och `(user_id, date)`.

Överlappande pass för samma person tillåts inte (kontrolleras i applikationen).

### `month_approvals`
| Kolumn | Typ | Kommentar |
|---|---|---|
| month | date, PK | Första dagen i månaden |
| status | text | `approved` |
| approved_by | uuid → users | |
| approved_at | timestamptz | |
| unlocked_by | uuid → users, null | Satt om löneköraren skickat tillbaka |
| unlocked_at | timestamptz, null | |
| unlock_comment | text, null | |

En månad utan rad, eller med senaste händelse *upplåst*, är öppen för ändringar. Historiken över godkännanden kan alternativt läggas i `audit_log`.

### `holidays`
| Kolumn | Typ | Kommentar |
|---|---|---|
| date | date, PK | |
| name | text | t.ex. "Midsommardagen" |

### `audit_log`
| Kolumn | Typ | Kommentar |
|---|---|---|
| id | bigserial | |
| entity | text | t.ex. `shift`, `month_approval` |
| entity_id | text | |
| action | text | `create`, `update`, `delete`, `approve`, `unlock` |
| before | jsonb, null | |
| after | jsonb, null | |
| user_id | uuid → users | |
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
