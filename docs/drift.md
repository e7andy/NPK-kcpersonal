# Drift

kcpersonal körs på den egna VPS:en som en sub-server under **npk.nu** i Virtualmin, på adressen **https://kcpersonal.npk.nu**. Ingen Docker används.

```
Webbläsare ──HTTPS──▶ Apache (kcpersonal.npk.nu, Virtualmin)
                         │ proxy
                         ▼
                      Node.js, systemd-tjänsten kcpersonal (127.0.0.1:3010)
                         │
                         ▼
                      PostgreSQL (databas för sub-servern)
```

- Appen körs som Virtualmin-användaren för npk.nu. Kunderna på servern förblir isolerade från varandra.
- Databasen hör till sub-servern och kommer med i Virtualmins backup.
- Inloggningslänkar skickas via den lokala Postfix-servern.

Exemplen nedan utgår från att Virtualmin-användaren för npk.nu heter `npk` och att appen ligger i `/home/npk/domains/kcpersonal.npk.nu/app`. Byt ut namnet om det skiljer sig.

## Engångsinstallation (som root)

### 1. Node.js 22

Kontrollera med `node -v`. Saknas Node 22 eller senare, installera från NodeSource:

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install nodejs
```

Systemd-tjänsten förutsätter att `node` finns i `/usr/bin/node`.

### 2. PostgreSQL

```sh
apt install postgresql
```

Aktivera sedan PostgreSQL i Virtualmin under *System Settings → Features and Plugins*, så att sub-servrar kan få PostgreSQL-databaser.

### 3. Apache-moduler

```sh
a2enmod proxy proxy_http headers
systemctl reload apache2
```

## Sub-server och databas (Virtualmin)

1. Skapa en sub-server **kcpersonal.npk.nu** under npk.nu med funktionerna webbplats, SSL och PostgreSQL-databas.
2. Lägg till ett DNS-A-record för `kcpersonal.npk.nu` om DNS för npk.nu inte hanteras av Virtualmin, till exempel om den ligger på Cloudflare.
3. Begär ett Let's Encrypt-certifikat för sub-servern.
4. Ställ in att HTTP omdirigeras till HTTPS.
5. Skapa en PostgreSQL-databas för sub-servern, till exempel `kcpersonal`. Inloggningen är Virtualmin-användaren och dess lösenord, om du inte skapar en separat databasanvändare.

## Installera appen (som användaren `npk`)

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
| `DATABASE_URL` | `postgresql://npk:LÖSENORD@127.0.0.1:5432/kcpersonal` |
| `BETTER_AUTH_SECRET` | Resultatet av `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://kcpersonal.npk.nu` |
| `SMTP_HOST` | `localhost` |
| `SMTP_PORT` | `25` |
| `SMTP_FROM` | `"kcpersonal <noreply@npk.nu>"` |

Lämna `SMTP_USER` och `SMTP_PASSWORD` tomma. Postfix tar emot mejl från servern själv utan inloggning. Mot `localhost` hoppar appen över STARTTLS, eftersom certifikatet gäller serverns publika namn. Trafiken lämnar aldrig maskinen. Se till att npk.nu har DKIM så att mejlen inte hamnar i skräpposten.

Bygg och förbered databasen:

```sh
npm ci
npm run build
npm run db:migrate
npm run create-admin -- du@example.se "Ditt Namn"
```

`npm run build` behöver kortvarigt 1–1,5 GB minne.

## Systemd-tjänst (som root)

```sh
cp /home/npk/domains/kcpersonal.npk.nu/app/deploy/kcpersonal.service /etc/systemd/system/
# Justera User, Group och sökvägar om användaren inte heter npk.
systemctl daemon-reload
systemctl enable --now kcpersonal
systemctl status kcpersonal
```

Tjänsten lyssnar bara på `127.0.0.1:3010` och begränsas till 512 MB minne. Den kan bara skriva till appens `.next`-katalog. Välj en annan port i tjänstefilen och Apache-konfigurationen om 3010 redan används (`ss -ltn | grep 3010`).

Låt användaren starta om tjänsten vid uppdatering, utan att få andra root-rättigheter:

```sh
echo 'npk ALL=(root) NOPASSWD: /usr/bin/systemctl restart kcpersonal' > /etc/sudoers.d/kcpersonal
chmod 440 /etc/sudoers.d/kcpersonal
visudo -c
```

## Apache

Lägg in innehållet i [`deploy/apache-proxy.conf`](../deploy/apache-proxy.conf) i sub-serverns HTTPS-vhost. I Virtualmin görs det under *Web Configuration → Configure SSL Website → Edit Directives*. Kör sedan `systemctl reload apache2`.

`ProxyPreserveHost On` krävs. Utan den avvisar Next.js formulären (server actions) eftersom värdnamnet inte stämmer. Let's Encrypt-förnyelser undantas från proxyn.

Öppna https://kcpersonal.npk.nu och logga in med admin-adressen. Under *Helgdagar* lägger du till årets röda dagar. Sedan lägger du in standardpass och personal.

## Uppdatera

Som användaren `npk`:

```sh
~/domains/kcpersonal.npk.nu/app/scripts/deploy.sh
```

Skriptet hämtar senaste koden, installerar beroenden, bygger, kör migreringar och startar om tjänsten. Under bygget kan sidan svara med fel en kort stund.

## Loggar och felsökning

| Vad | Kommando |
|---|---|
| Appens logg | `journalctl -u kcpersonal -f` |
| Status | `systemctl status kcpersonal` |
| Svarar appen lokalt? | `curl -I http://127.0.0.1:3010/login` |
| Apache | `/var/log/virtualmin/kcpersonal.npk.nu_error_log` |

## Backup

Virtualmins schemalagda backup av npk.nu tar med sub-serverns PostgreSQL-databas och hemkatalogen, inklusive `.env`. Kontrollera att PostgreSQL-databaser ingår i backupinställningarna.
