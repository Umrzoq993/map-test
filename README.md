## Agro Map frontend

Leaflet + React (Vite) asosidagi geo / inshoot boshqaruv interfeysi.

### Stack

- React 18 + Vite
- Leaflet, react-leaflet-draw
- Axios (token refresh + interceptorlar)
- rc-tree (tashkilot daraxti)
- react-toastify (bildirishnomalar)
- SCSS modul & tematik o'zgaruvchilar

### Tez boshlash

```bash
cp .env.example .env   # kerakli qiymatlarni sozlang
npm install
npm run dev
```

Brauzer: http://localhost:5173 (yoki Vite chiqargan port)

### Muhim environment o'zgaruvchilar

| O'zgaruvchi                            | Ma'no                                     |
| -------------------------------------- | ----------------------------------------- |
| VITE_API_BASE                          | Backend root (mas: http://localhost:8080) |
| VITE_IDLE_MINUTES                      | Sessiya bo'sh turish daqiqalari           |
| VITE_TOKEN_REFRESH_LEEWAY_SEC          | Refresh tampon (sekund)                   |
| VITE_TILE_HYBRID / VITE_TILE_SATELLITE | Keshlangan plitalar URL shablonlari       |
| VITE_TILE_TMS                          | TMS yoqilgan (true/false)                 |

### Build (production)

```bash
npm run build
```

Natija `dist/` papkada. Static server (nginx, caddy, serve) orqali tarqating:

```bash
npm run preview   # lokal ishlab ko‘rish
```

Nginx misol config bo'lagi:

```
location / {
	root   /var/www/agro-map/dist;
	try_files $uri /index.html;
}
location /api/ {
	proxy_pass http://localhost:8080/api/; # backend
}
```

### Lint

```bash
npm run lint
```

### Debug yordamchi

Konsol loglarini yoqish:

```js
localStorage.setItem("debug", "1");
```

O‘chirish:

```js
localStorage.removeItem("debug");
```

### Sessiya ogohlantirish

`session:expiring` hodisasi (60s oldin) — `AppShell` toast ko‘rsatadi. Zarur bo‘lsa qo'shimcha tinglovchilar qo‘shing.

### Xavfsizlik

Popup va dinamik HTML `sanitizeHTML` orqali tozalanadi. Har qanday innerHTML kiritishdan avval shu utilni ishlating.

### Cluster / Performance

`ClusteredFacilityMarkers.jsx` tajriba komponenti. Katta datasetlarda marker klasterlardan foydalaning.

---

© 2025 Agro Map

---

## Production xavfsizlik sarlavhalari (NGINX misoli)

Eslatma: Frontend ichidagi `<meta http-equiv="Content-Security-Policy">` faqat dev uchun yumshoq. Prod’da CSP va boshqa headerlarni **server** darajasida qo‘ying va **real tile server domenlarini** qo‘shing (VESAT, OSM.UZ, va h.k.).

```
# Static
server {
    listen 443 ssl;
    server_name map.example.uz;

    root /var/www/agro-map/dist;
    index index.html;

    # === Security headers ===
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
    # NOTE: frame-ancestors faqat server headerida ishlaydi
    add_header Content-Security-Policy "default-src 'self'; \
      script-src 'self'; \
      style-src 'self' 'unsafe-inline'; \
      img-src 'self' data: blob: https: http:; \
      font-src 'self' data:; \
      connect-src 'self' https: http: wss: ws: data: https://vesat-map.uz https://osm.uz; \
      frame-src 'self' https://challenges.cloudflare.com; \
      object-src 'none'; base-uri 'self'; form-action 'self'; \
      frame-ancestors 'none'" always;

    location / {
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- connect-src/img-src ichiga o‘zingizning real tile server(lar) domennarini qo‘shing: masalan `https://vesat.uz`, `http://10.25.1.90`, `https://osm.uz`.
- Agar saytni iframe’da ko‘rsatish kerak bo‘lsa, `frame-ancestors`ni tegishli domen(lar)ga sozlang.

## 403 UX

`/forbidden` sahifasi qo‘shildi. Admin-only marshrutlar (AdminRoute) uchun admin bo‘lmasa ushbu sahifaga yo‘naltiriladi. 401/expired uchun `/login` saqlanib qoladi.
