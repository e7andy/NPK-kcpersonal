# Drift

kcpersonal körs på den egna VPS:en (Ubuntu 22.04) som en sub-server under **npk.nu** i Virtualmin, på adressen **https://kcpersonal.npk.nu**. Ingen Docker används.

```
Webbläsare ──HTTPS──▶ Apache (kcpersonal.npk.nu, Virtualmin)
                         │ proxy via unix-socket
                         ▼
                      Node.js, systemd-tjänsten kcpersonal
                      /run/kcpersonal/kcpersonal.sock
                         │
                         ▼
                      PostgreSQL (databas för sub-servern)
```

- Appen körs som Virtualmin-användaren `npk.nu`. Kunderna på servern förblir isolerade från varandra.
- Appen lyssnar på en unix-socket i stället för en port. Bara appen och Apache kommer åt socketen. Andra användare på servern kan varken ansluta till den eller ta över den, och inga portar behöver hållas reda på.
- Databasen hör till sub-servern och kommer med i Virtualmins backup.
- Inloggningslänkar skickas via den lokala Postfix-servern.

Appen ligger i `/home/npk.nu/domains/kcpersonal.npk.nu/app`.

## Engångsinstallation (med sudo)

### 1. Node.js 22

Kontrollera med `node -v`. Ubuntu 22.04 har bara Node 12 i sina egna paket, så installera Node 22 från NodeSource:

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install nodejs
```

Systemd-tjänsten förutsätter att `node` finns i `/usr/bin/node`.

### 2. PostgreSQL

```sh
sudo apt install postgresql
```

På Ubuntu 22.04 ger det PostgreSQL 14, vilket räcker.

Aktivera sedan PostgreSQL i Virtualmin under *System Settings → Features and Plugins*, så att sub-servrar kan få PostgreSQL-databaser.

### 3. Apache-moduler

```sh
sudo a2enmod proxy proxy_http headers
sudo systemctl reload apache2
```

## Sub-server och databas (Virtualmin)

1. Skapa en sub-server **kcpersonal.npk.nu** under npk.nu med funktionerna webbplats, SSL och PostgreSQL-databas.
2. Lägg till ett DNS-A-record för `kcpersonal.npk.nu` om DNS för npk.nu inte hanteras av Virtualmin, till exempel om den ligger på Cloudflare.
3. Begär ett Let's Encrypt-certifikat för sub-servern.
4. Ställ in att HTTP omdirigeras till HTTPS.
5. Skapa en PostgreSQL-databas för sub-servern, till exempel `kcpersonal`. Notera vilken databasanvändare och vilket lösenord Virtualmin anger.

## Installera appen (som användaren `npk.nu`)

Virtualmin-användare har skalet `nologin`, så `su - npk.nu` fungerar inte. Låt det vara så och starta i stället ett skal som användaren med sudo:

```sh
sudo -u npk.nu -H bash
```

`-H` gör att `~` och npm-cachen hamnar i `/home/npk.nu`.

Lägg appen **utanför** `public_html`, annars kan Apache servera `.env` och källkoden.

```sh
cd ~/domains/kcpersonal.npk.nu
git clone https://github.com/e7andy/NPK-kcpersonal.git app
cd app
cp .env.example .env
chmod 600 .env
```

Fyll i `.env`:

| Variabel | Värde |
|---|---|
| `DATABASE_URL` | `postgresql://ANVÄNDARE:LÖSENORD@127.0.0.1:5432/kcpersonal` |
| `BETTER_AUTH_SECRET` | Resultatet av `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://kcpersonal.npk.nu` |
| `SMTP_HOST` | `localhost` |
| `SMTP_PORT` | `25` |
| `SMTP_FROM` | `"kcpersonal <noreply@npk.nu>"` |

Innehåller lösenordet specialtecken som `@`, `:` eller `/` måste de URL-kodas i `DATABASE_URL`.

Lämna `SMTP_USER` och `SMTP_PASSWORD` tomma. Postfix tar emot mejl från servern själv utan inloggning. Mot `localhost` hoppar appen över STARTTLS, eftersom certifikatet gäller serverns publika namn. Trafiken lämnar aldrig maskinen. Se till att npk.nu har DKIM så att mejlen inte hamnar i skräpposten.

Bygg och förbered databasen:

```sh
npm ci
npm run build
npm run db:migrate
npm run create-admin -- du@example.se "Ditt Namn"
```

`npm run build` behöver kortvarigt 1–1,5 GB minne.

## Systemd-tjänst (med sudo)

```sh
sudo cp /home/npk.nu/domains/kcpersonal.npk.nu/app/deploy/kcpersonal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kcpersonal
sudo systemctl status kcpersonal
```

systemd varnar att `npk.nu` inte följer de strikta reglerna för användarnamn. Varningen är ofarlig.

Tjänsten gör följande:
- Den lyssnar på `/run/kcpersonal/kcpersonal.sock`. Katalogen skapas av systemd vid start, ägs av `npk.nu` och har gruppen `www-data`. Bara appen och Apache kommer in i den. Katalogen tas bort när tjänsten stoppas.
- Minnet begränsas till 512 MB.
- Appen kan bara skriva till sin egen `.next`-katalog.

Låt användaren starta om tjänsten vid uppdatering, utan att få andra root-rättigheter:

```sh
echo 'npk.nu ALL=(root) NOPASSWD: /usr/bin/systemctl restart kcpersonal' | sudo tee /etc/sudoers.d/kcpersonal
sudo chmod 440 /etc/sudoers.d/kcpersonal
sudo visudo -c
```

## Apache

Lägg in innehållet i [`deploy/apache-proxy.conf`](../deploy/apache-proxy.conf) i sub-serverns HTTPS-vhost. I Virtualmin görs det under *Web Configuration → Configure SSL Website → Edit Directives*. Kör sedan `sudo systemctl reload apache2`.

- `ProxyPreserveHost On` krävs. Utan den avvisar Next.js formulären (server actions) eftersom värdnamnet inte stämmer.
- Let's Encrypt-förnyelser undantas från proxyn.

Ligger npk.nu bakom Cloudflares proxy (orange moln) ser Apache Cloudflares adresser i stället för besökarnas. Då delar alla besökare via samma Cloudflare-nod på gränsen för inloggningsförsök. Aktivera i så fall `mod_remoteip` med Cloudflares adressintervall, eller låt DNS-posten för `kcpersonal.npk.nu` gå direkt till servern (grått moln).

Öppna https://kcpersonal.npk.nu och logga in med admin-adressen. Under *Helgdagar* lägger du till årets röda dagar. Sedan lägger du in standardpass och personal.

## Uppdatera

```sh
sudo -u npk.nu -H /home/npk.nu/domains/kcpersonal.npk.nu/app/scripts/deploy.sh
```

Skriptet gör följande:
1. hämtar senaste koden
2. installerar beroenden och bygger
3. kör migreringar
4. startar om tjänsten
5. kontrollerar att appen svarar på socketen

Under bygget kan sidan svara med fel en kort stund.

## Rensa databasen

Till exempel för att ta bort testdata innan säsongen. Det går inte att ångra, så ta en backup först om något kan behöva sparas.

Öppna databasen som `npk.nu` med uppgifterna från `.env`:

```sh
sudo -u npk.nu -H bash
cd ~/domains/kcpersonal.npk.nu/app
set -a; . ./.env; set +a
psql "$DATABASE_URL"
```

Välj ett av alternativen nedan i `psql` och avsluta med `\q`.

### Alternativ 1: Rensa allt

Tar bort personal, pass, godkända månader, ändringshistorik, inloggningar, standardpass och helgdagar.

```sql
TRUNCATE "user", session, account, verification, shifts, shift_templates,
         month_approvals, holidays, audit_log RESTART IDENTITY CASCADE;
```

### Alternativ 2: Rensa allt utom standardpass och helgdagar

Bra om standardpass och helgdagar redan är inlagda som de ska vara.

```sql
TRUNCATE "user", session, account, verification, shifts,
         month_approvals, audit_log RESTART IDENTITY CASCADE;
```

### Efteråt

Skapa en admin igen:

```sh
npm run create-admin -- du@example.se "Ditt Namn"
```

- Alla blir utloggade, eftersom inloggningarna också tas bort.
- Har du rensat allt lägger du in helgdagarna igen under *Helgdagar* med *Lägg till helgdagar* för varje år, och standardpassen under *Standardpass*.
- Migreringstabellen ligger i ett eget schema och påverkas inte, så `deploy.sh` fungerar som vanligt efteråt.

## Loggar och felsökning

| Vad | Kommando |
|---|---|
| Appens logg | `sudo journalctl -u kcpersonal -f` |
| Status | `systemctl status kcpersonal` |
| Svarar appen? | `sudo curl -I --unix-socket /run/kcpersonal/kcpersonal.sock http://localhost/login` |
| Apache | `/var/log/virtualmin/kcpersonal.npk.nu_error_log` |

### Om inloggningsmejlen inte kommer fram

Kontrollera Postfix med `sudo tail -f /var/log/mail.log` medan du begär en länk. Under tiden kan du skriva ut en engångslänk direkt på servern:

```sh
sudo -u npk.nu -H bash -c 'cd ~/domains/kcpersonal.npk.nu/app && npm run -s login-link -- du@example.se'
```

Länken fungerar som den i mejlet: den gäller i 15 minuter och kan bara användas en gång. Den fungerar bara för aktiva personer som finns i tjänsten. Den som kan köra kommandot kan logga in som vem som helst, men det kan den som har tillgång till servern ändå.

Svarar Apache med 503 men appen svarar på socketen, kontrollera att `/run/kcpersonal` har gruppen `www-data` (`ls -ld /run/kcpersonal`).

## Teknisk not: egen startfil

`next start` kan bara lyssna på en TCP-port, så appen startas med `server.mjs`. Filen gör två saker:
- Den lyssnar på socketen som anges i `SOCKET_PATH`. Utan `SOCKET_PATH` lyssnar den på `127.0.0.1:PORT`.
- Den styr Next.js interna anrop till sig själv till samma socket. När ett formulär omdirigerar hämtar Next.js målsidan från sin egen server och skickar med besökarens cookies. Annars skulle Next.js anropa `127.0.0.1:3000`, där en annan kunds app kan lyssna.

Det här bygger på en intern inställning i Next.js (`__NEXT_PRIVATE_ORIGIN`). Gör så här efter uppgradering av Next.js: skicka ett formulär, till exempel inloggningen, och kontrollera att `sudo journalctl -u kcpersonal` inte visar `failed to get redirect response`.

## Backup

Virtualmins schemalagda backup av npk.nu tar med sub-serverns PostgreSQL-databas och hemkatalogen, inklusive `.env`. Kontrollera att PostgreSQL-databaser ingår i backupinställningarna.
