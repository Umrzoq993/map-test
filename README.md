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
