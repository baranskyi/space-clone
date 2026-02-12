# Proposal: Space Clone — 3D-клонирование пространств

## Цель
Mobile-first PWA, которая позволяет пользователю сделать серию фото вокруг себя, автоматически сшить их в 360° панораму и превратить в navigable 3D-мир через World Labs API (Marble). Результат можно сохранить, расшарить по ссылке и использовать для real estate, виртуальных туров и портфолио.

## Вдохновение
Teleport (iOS) — единственное iPhone-приложение для качественных 360° панорам. Мы делаем аналог для веба.

## Флоу пользователя

```
📱 Открыл PWA → 📷 Сделал 16 фото вокруг себя (guided UI)
→ 🧵 Авто-сшивка в equirectangular панораму
→ 🌐 Отправка в World Labs API → ⏳ ~5 мин генерация
→ 🏠 Готовый navigable 3D-мир → 💾 Сохранение → 🔗 Шаринг
```

## Скоп

### Входит:
- PWA с guided camera capture (подсказки куда поворачиваться)
- Сшивка фото в 360° equirectangular панораму (серверная обработка)
- Интеграция с World Labs API (Marble) для 3D-реконструкции
- Галерея сохранённых 3D-миров
- Шаринг по ссылке (публичный просмотр без авторизации)
- Встраиваемый embed-код для сайтов (iframe)
- Auth через Supabase (email/Google)
- Хранение панорам и метаданных в Supabase

### Не входит (v1):
- Нативное iOS/Android приложение
- Редактирование 3D-мира после генерации
- Мультипользовательский просмотр в реальном времени
- Монетизация / платёжная система
- AI-генерация описаний помещений

## Acceptance Criteria
- [ ] PWA открывается на мобильном, можно добавить на домашний экран
- [ ] Камера работает с guided overlay (16 позиций)
- [ ] Фото сшиваются в equirectangular панораму
- [ ] Панорама отправляется в World Labs API
- [ ] 3D-мир отображается в встроенном viewer
- [ ] Мир сохраняется в профиле пользователя
- [ ] Ссылка для шаринга работает без авторизации
- [ ] Embed-код генерируется для вставки на сайты

## Стек

| Компонент | Технология |
|-----------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| PWA | next-pwa / Serwist |
| Styling | Tailwind CSS + shadcn/ui |
| Camera | MediaDevices API (getUserMedia) |
| Stitching | Server-side: OpenCV (Python) или Hugin CLI |
| 3D API | World Labs API (Marble v1) |
| 3D Viewer | World Labs embed (marble.worldlabs.ai) + SPZ/GLB fallback |
| Auth | Supabase Auth (email + Google) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (панорамы, thumbnails) |
| Deploy | Railway |

## World Labs API — ключевые детали

- **Endpoint**: `POST /marble/v1/worlds:generate`
- **Input**: Panorama image с `is_pano: true`
- **Output**: 3D Gaussian splats (SPZ), collider mesh (GLB), panorama, thumbnail
- **Время генерации**: ~5 минут
- **Цена**: $1.00 / 1,250 credits, Standard = 1,500 credits (~$1.20/мир), Draft = 150 credits (~$0.12/мир)
- **Viewer**: `https://marble.worldlabs.ai/world/{world_id}`

## Форматы и использование 3D-панорам

### Форматы выходных данных:
- **SPZ** (3D Gaussian Splats) — полноценная 3D-сцена для навигации
- **GLB** (collider mesh) — 3D-модель для игровых движков и AR
- **Equirectangular JPEG** — 360° панорама для стандартных просмотрщиков

### Use cases:
1. **Real Estate** — виртуальные туры по объектам, embed на сайт агентства
2. **Airbnb/Booking** — 3D-презентация жилья
3. **Архитектура** — документация существующих пространств
4. **Events** — 3D-архив мероприятий
5. **Соцсети** — шаринг navigable 3D-миров по ссылке

## Архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PWA (Next.js)  │────▶│  API Routes      │────▶│  Supabase       │
│   - Camera UI    │     │  - /stitch       │     │  - Auth         │
│   - Gallery      │     │  - /generate     │     │  - Storage      │
│   - Viewer       │     │  - /worlds       │     │  - PostgreSQL   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  World Labs API   │
                    │  (Marble v1)     │
                    └──────────────────┘
```

## Ограничения
- Нет особых ограничений по бюджету или срокам

## Оценка
- **Сложность**: high (камера + stitching + 3D API + PWA)
- **Примерное количество задач**: ~25-30
- **Ключевые риски**: качество сшивки на мобильном, ожидание 5 мин генерации

## Источники
- [World Labs API Docs](https://docs.worldlabs.ai/api)
- [World Labs Pricing](https://docs.worldlabs.ai/api/pricing)
- [Announcing the World API](https://www.worldlabs.ai/blog/announcing-the-world-api)
