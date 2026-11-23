# cute.syl.red 💗

A private, single-file-database health tracker for food, drinks, water, weight, height and BMI.
Plain PHP 8.3 + SQLite on the server, plain JavaScript in the browser: no frameworks, no build step,
no third-party code or CDNs (fonts are self-hosted, so no outside requests at all).

## What's in the box

```
cute/
├── public/              ← the ONLY folder nginx serves
│   ├── index.php        front controller: app shell + JSON API
│   └── assets/          app.css, app.js, fonts/, img/
├── src/                 PHP classes (Auth, Days, Foods, Stats, Backup, …)
├── bin/cute-user.php    create / manage login accounts (there is no sign-up page)
├── deploy/              nginx server block + security header snippet
└── config.example.php   copy to config.php
```

## Install on your server

Requirements: PHP 8.3+ with `pdo_sqlite` (Debian/Ubuntu: `apt install php8.3-fpm php8.3-sqlite3`), nginx.
For restoring big backups, allow larger request bodies in `/etc/php/8.3/fpm/php.ini`: `post_max_size = 25M` (then `systemctl reload php8.3-fpm`).

Additional requirement: `php8.5-mbstring`.

```bash
# 1. Code goes next to your other subdomains (only public/ will be served, see step 5)
sudo mkdir -p /var/www/html/syl.red/nav/cute
sudo cp -r cute/. /var/www/html/syl.red/nav/cute/
cd /var/www/html/syl.red/nav/cute
sudo rm -rf data                          # the data folder lives in /var/lib/cute instead

# 2. Private data folder OUTSIDE the web root, only php-fpm (www-data) can enter it
sudo mkdir -p /var/lib/cute
sudo chown www-data:www-data /var/lib/cute
sudo chmod 700 /var/lib/cute

# 3. Config (no secrets in it, just paths and settings)
sudo cp config.example.php config.php
sudo nano config.php                      # check timezone; db_path/session_path point to /var/lib/cute

# 4. Create your login (asks for the password twice, minimum 12 characters)
sudo -u www-data php bin/cute-user.php add xxx

# 5. nginx: paste the server block from deploy/nginx-cute.syl.red.conf into
#    /etc/nginx/sites-available/syl.red.conf, add the /nav/cute redirect (top of that file)
#    to the main syl.red block, and add cute.syl.red to the port-80 redirect block. Then:
echo 'limit_req_zone $binary_remote_addr zone=cute_login:10m rate=10r/m;' | sudo tee /etc/nginx/conf.d/cute-ratelimit.conf
sudo nginx -t && sudo systemctl reload nginx

# 6. Check the redirect protects the code folder (both should say 301 to cute.syl.red):
curl -sI https://syl.red/nav/cute/config.php | head -3
curl -sI https://syl.red/nav/cute/bin/cute-user.php | head -3
```

Then open https://cute.syl.red and log in.

> The block reuses `/etc/nginx/snippets/syl.red-common.conf` (TLS, PHP, dotfiles, security headers, AI block list).
> Behind Cloudflare, set up real client IPs (see below) so login throttling sees your IP, not Cloudflare's.

### Behind Cloudflare
Without this, PHP and nginx only see Cloudflare's IP addresses, so the per-IP login limits would apply to
everyone sharing that Cloudflare edge. Run once (and again now and then, Cloudflare's list changes rarely):

```bash
{ curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; echo; } \
  | sed '/^$/d; s/.*/set_real_ip_from &;/' | sudo tee /etc/nginx/conf.d/cloudflare-realip.conf
echo 'real_ip_header CF-Connecting-IP;' | sudo tee -a /etc/nginx/conf.d/cloudflare-realip.conf
sudo nginx -t && sudo systemctl reload nginx
```

Also in Cloudflare: add a proxied DNS record for `cute`, and keep Rocket Loader off for this hostname
(it injects scripts that the Content-Security-Policy blocks).

## Managing accounts

```bash
sudo -u www-data php bin/cute-user.php add <name>       # new account
sudo -u www-data php bin/cute-user.php passwd <name>    # change password
sudo -u www-data php bin/cute-user.php unlock <name>    # clear a login lockout
sudo -u www-data php bin/cute-user.php list
sudo -u www-data php bin/cute-user.php remove <name>    # deletes the account AND its data
```

## Backups

* **In the app:** Settings › Export backup gives a `.json` with your settings, every day, your foods
  and meals. Settings › Restore backup shows a preview first, then lets you **Merge** (the backup wins
  where both have the same day/food/meal, everything else is kept) or **Replace** (wipe, then restore).
* **On the server:** the whole database is `/var/lib/cute/cute.sqlite`. A safe copy while the app is running:
  ```bash
  sudo sqlite3 /var/lib/cute/cute.sqlite ".backup '/root/backups/cute-$(date +%F).sqlite'"
  ```

## Security, in short

| Threat | What protects you |
|---|---|
| Guessing the password | Argon2id hashes; 5 wrong tries per user / 10 per IP in 15 min → locked; nginx also limits `/api/login` to 10/min; same response time for wrong user and wrong password |
| Someone registering | There is no registration endpoint. Accounts only via `bin/cute-user.php` on the server |
| Stolen session cookie | Cookie is `HttpOnly` (JS can't read it), `Secure` (HTTPS only), `SameSite=Strict`; session id regenerated at login; 30-day absolute expiry |
| Cross-site request forgery | Every change needs a per-session CSRF token header, JSON bodies only, and the `Origin` header must match |
| XSS (script injection) | The UI never uses `innerHTML`; strict Content-Security-Policy allows only this site's own JS/CSS |
| SQL injection | Every query is a prepared statement |
| Reading your files over the web | nginx serves only `public/`; database and sessions live in `/var/lib/cute`; syl.red redirects everything under `/nav/cute/` |
| Malicious backup file | Imports are size-limited, fully validated, and run in one transaction (all or nothing) |

## How "days" work

* A day stays **open** until you press **End day** or **Skip day**. Skip closes it with no data.
* *Today* always shows the **oldest open day**. When nothing is open, the next calendar day is opened
  (never a future day) and your last weight and height are copied in.
* Missed a few days? The Today page offers **Catch up to today**: every empty open/missing day is
  marked skipped. Days with food or water logged are never skipped automatically.
* Past days can be edited from **History** at any time, and closed days can be reopened.
* Logged items keep a snapshot of their nutrients, so editing a food later never changes old days.

## Running it locally

```bash
cp config.example.php config.php     # for local use: 'secure_cookies' => false and db/session paths in a local folder
php bin/cute-user.php add syl
php -S 127.0.0.1:8080 -t public bin/dev-router.php
```

## API (for the curious)

All JSON. Writes need the `X-CSRF-Token` header from `GET /api/session`.

`POST /api/login` · `POST /api/logout` · `GET /api/session` · `GET /api/today` · `POST /api/days/catch-up` ·
`GET|PATCH /api/days/{date}` · `POST /api/days/{date}/close|skip|reopen` · `POST /api/days/{date}/entries` ·
`PATCH|DELETE /api/entries/{id}` · `GET /api/calendar/{yyyy-mm}` · `GET|POST /api/foods` · `PUT|DELETE /api/foods/{id}` ·
`POST /api/meals` · `PUT|DELETE /api/meals/{id}` · `GET|PUT /api/settings` · `GET /api/stats?from=&to=` ·
`GET /api/export` · `POST /api/import/preview` · `POST /api/import/merge|replace`

Fonts: Nunito and Playfair Display, SIL Open Font License (see `public/assets/fonts/`).
