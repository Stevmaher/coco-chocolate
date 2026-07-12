# Coco Chocolate — Backend API

REST API لسطر واحد من frontend (`index.html` + `main.js`) بدل الـ localStorage.
Express + better-sqlite3 + Zod.

## التشغيل

```bash
cd backend
npm install
cp .env.example .env     # عدّل ADMIN_PIN و ADMIN_TOKEN_SECRET
npm run seed              # يزرع الـ 7 منتجات الافتراضية (مرة واحدة بس)
npm start                 # أو npm run dev للـ auto-restart
```

السيرفر بيشتغل على `http://localhost:4000` افتراضيًا.

## متغيرات البيئة (`.env`)

| المتغير | الوصف |
|---|---|
| `PORT` | بورت السيرفر (افتراضي 4000) |
| `CORS_ORIGIN` | الدومين المسموح له يكلم الـ API (مثلاً رابط الـ frontend) |
| `ADMIN_PIN` | رمز دخول لوحة التحكم (بدّله من القيمة الافتراضية) |
| `ADMIN_TOKEN_SECRET` | مفتاح توقيع التوكن — لازم string عشوائي طويل في الإنتاج |
| `DB_PATH` | مسار ملف SQLite (افتراضي `./coco.db`) |

## المصادقة (Admin Auth)

- `POST /api/admin/login` بجسم `{ "pin": "..." }` — بيرجّع `{ token }` لو الرمز صح.
- التوكن ده HMAC-signed، صالح 8 ساعات، وبيتبعت في كل طلب admin كـ:
  `Authorization: Bearer <token>`
- كل مسارات المنتجات (إنشاء/تعديل/حذف)، والطلبات (عرض/تعديل حالة)، والإحصاءات محمية بيه.
- عرض المنتجات (`GET /api/products`) وإنشاء طلب من المتجر (`POST /api/orders`) مفتوحين للعميل بدون تسجيل دخول.
- فيه rate-limiting بسيط على `/api/admin/login` (8 محاولات كل 15 دقيقة لكل IP).

## نقاط الـ API

### Products
| Method | Path | Auth | الوصف |
|---|---|---|---|
| GET | `/api/products?search=&category=` | عام | قائمة المنتجات |
| GET | `/api/products/:id` | عام | منتج واحد |
| POST | `/api/products` | admin | إنشاء منتج |
| PATCH | `/api/products/:id` | admin | تعديل منتج |
| DELETE | `/api/products/:id` | admin | حذف منتج |

### Orders
| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/orders` | عام | إنشاء طلب (من الـ checkout) |
| GET | `/api/orders?status=&search=&date=` | admin | قائمة الطلبات (بفلاتر) |
| GET | `/api/orders/:id` | admin | طلب واحد بتفاصيله |
| PATCH | `/api/orders/:id/status` | admin | تحديث حالة الطلب (بيرجع المخزون تلقائيًا لو اتلغى) |

### Stats (كلها admin)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/stats/summary` | كروت الـ KPI |
| GET | `/api/stats/revenue-by-day?days=7\|14\|30` | بيانات شارت الإيرادات التفاعلي |
| GET | `/api/stats/revenue-by-category` | توزيع الإيرادات حسب الفئة |
| GET | `/api/stats/top-products?limit=5` | الأكثر مبيعًا |
| GET | `/api/stats/recent-activity?limit=6` | آخر الطلبات |

## الخطوة الجاية

الـ `main.js` الحالي لسه بيستخدم localStorage. الخطوة التالية الطبيعية:
استبدال دوال `api.products.*` / `api.orders.*` / `api.stats.*` بنداءات `fetch()` لنفس الـ endpoints دي،
وتخزين التوكن في متغيّر (مش localStorage) بعد تسجيل دخول الأدمن بالـ PIN.
قولّي لو عايزني أبدأ فيها.
