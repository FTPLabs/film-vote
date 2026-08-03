# Голосовалка фильмов

Сайт анонимного голосования за фильмы на русском языке. Пользователи оценивают уровень ожидания каждого фильма по шкале 1–10, видят % ожидания по каждому фильму и общую статистику.

## Run & Operate

- `pnpm --filter @workspace/film-vote run dev` — фронтенд (Vite / React)
- `pnpm --filter @workspace/api-server run dev` — API сервер (Express, порт 8080)
- `pnpm run typecheck` — полная проверка типов
- `pnpm --filter @workspace/api-spec run codegen` — регенерация API хуков и Zod-схем из OpenAPI-спека
- `pnpm --filter @workspace/db run push` — применить изменения схемы БД (только dev)
- Обязательные env: `DATABASE_URL` — строка подключения к PostgreSQL
- Опциональные env: `ADMIN_PASSWORD` — пароль для админ-панели (по умолчанию `admin123`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Wouter + TanStack Query + Tailwind CSS v4 + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod v3, drizzle-zod
- API codegen: Orval (из OpenAPI-спека)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI-контракт (источник истины для API)
- `lib/db/src/schema/` — схема БД (movies.ts, votes.ts)
- `artifacts/api-server/src/routes/` — маршруты API (movies.ts, stats.ts, admin.ts)
- `artifacts/api-server/src/lib/auth.ts` — проверка токена для admin-эндпоинтов
- `artifacts/film-vote/src/` — фронтенд React-приложения

## Architecture decisions

- IP-ограничение реализовано на уровне сервера: один голос на IP-адрес и фильм, но голос можно изменить (upsert по паре movie_id + ip_address).
- Авторизация админки: простой токен на основе ADMIN_PASSWORD, хранится в localStorage клиента.
- OpenAPI `integer` поля используют тип `number` вместо `integer` из-за совместимости с Orval + Zod v3 (`zod.int()` — это Zod v4 API).
- Статистика (% ожидания) вычисляется на сервере: среднее значение голосов / 10 × 100.

## Product

- Главная (`/`) — сетка карточек фильмов с постерами, % ожидания и кнопкой голосования
- Страница фильма (`/film/:id`) — подробная информация, слайдер оценки 1–10
- Топ ожиданий (`/top`) — рейтинг фильмов по % ожидания
- Admin (`/admin`) — вход по паролю
- Admin Dashboard (`/admin/dashboard`) — управление списком фильмов (добавить/редактировать/удалить)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Не использовать `zod.int()` в OpenAPI-спеке (тип `integer`): Orval генерирует Zod v4 код, несовместимый с Zod v3 в workspace. Использовать тип `number`.
- Admin-токен хранится в `localStorage` под ключом `admin_token`. Все запросы к admin-эндпоинтам добавляют `Authorization: Bearer <token>`.
- IP-адрес берётся из `X-Forwarded-For` заголовка (или `req.socket.remoteAddress`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
