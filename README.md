# MentorMatch

Web-приложение для подбора пар «наставник — наставляемый» через swipe-интерфейс с персонализированным ранжированием.

## Обзор

MentorMatch — mobile-first MVP, реализованный в рамках дипломной работы. Пользователи заполняют профиль (роль, отрасль, навыки, цели), просматривают кандидатов противоположной роли в ленте-свайпере и при взаимном лайке получают мэтч. Ранжирование кандидатов выполняется на клиенте по 5 параметрам.

## Функциональность

- Email/password авторизация (вход и регистрация на одной странице)
- 3-шаговый онбординг с сохранением черновика в localStorage
- Загрузка аватара в Supabase Storage
- Лента кандидатов: серверная фильтрация (RPC), клиентское ранжирование
- Swipe-жесты + кнопки like/pass
- Атомарное создание мэтча при взаимном like (SECURITY DEFINER RPC)
- Bottom sheet с детальным профилем кандидата в ленте
- Попап «Это мэтч!» при взаимном лайке
- Список мэтчей с переходом на профиль
- Просмотр своего профиля (`/profile/me`)
- Редактирование профиля через онбординг (повторный вход)
- Настройки: выход из аккаунта, удаление аккаунта
- Удаление аккаунта через Supabase Edge Function (JWT-верификация + admin API)

## Что не входит в MVP

- Чат и обмен сообщениями
- Push-уведомления
- Подписки и платежи
- Административная панель
- ML-модели (используется правило-ориентированный scoring)

## Технологический стек

| Слой | Технология |
|---|---|
| Frontend | React 18 + Vite |
| Анимации / Swipe | Framer Motion |
| Стили | Tailwind CSS + CSS variables |
| Backend-as-a-Service | Supabase (Auth, PostgreSQL, Storage, RPC) |
| Edge Function | Deno (Supabase Functions) |
| Хостинг | Vercel (frontend) |

## Архитектура

```
Browser
  └── React App (Vite)
        ├── AuthContext (auth session + profile gate)
        ├── PrivateRoute / ProfileRoute (route guards)
        ├── Pages: Login, Onboarding, Swipe, Matches, Profile, Settings
        └── lib/api.js (все Supabase вызовы)
              ├── RPC: api_get_feed, api_submit_swipe, api_get_profile
              └── Storage: avatars bucket

Supabase
  ├── Auth (email/password, JWT)
  ├── PostgreSQL
  │     ├── profiles (role, industry, tags, goals, format, urgency, ...)
  │     ├── swipes   (from_user_id, to_user_id, direction)
  │     └── matches  (user1_id, user2_id) — unique pair index
  ├── RLS policies (profiles/swipes/matches)
  └── Edge Function: delete-my-account
```

### Matching algorithm (`src/lib/matching.js`)

Client-side scoring по 5 параметрам с весами:

| Параметр | Вес |
|---|---|
| Совпадение отрасли | 30 |
| Jaccard similarity тегов | 25 |
| Релевантность цели (keyword matching) | 20 |
| Формат (онлайн/офлайн/любой) | 15 |
| Близость уровня | 10 |

Кандидаты из той же отрасли выводятся первыми, внутри групп — по убыванию score.

## Структура проекта

```
mentor-match/
├── src/
│   ├── App.jsx                    # Routing + layout (topbar/bottom-nav)
│   ├── main.jsx                   # Entry point
│   ├── index.css                  # Global styles + CSS variables
│   ├── context/
│   │   ├── AuthContext.jsx        # Auth state, profile gate, session cache
│   │   └── useAuth.jsx            # Context hook
│   ├── components/
│   │   ├── PrivateRoute.jsx       # Auth-only guard
│   │   └── ProfileRoute.jsx       # Auth + profileComplete guard
│   ├── lib/
│   │   ├── supabase.js            # Supabase client init
│   │   ├── api.js                 # All Supabase calls (RPC, Storage, Auth)
│   │   ├── matching.js            # Client-side scoring + ranking
│   │   ├── ui.js                  # UI helpers (initials, label resolvers)
│   │   └── contracts/
│   │       └── profileEnums.js    # Canonical enum values + normalization
│   └── pages/
│       ├── LoginPage.jsx          # Login + Register (single page)
│       ├── OnboardingPage.jsx     # 3-step onboarding + avatar upload
│       ├── SwipePage.jsx          # Feed + swipe gestures + match popup
│       ├── MatchesPage.jsx        # Matches list
│       ├── ProfilePage.jsx        # Match's profile (/profile/:id)
│       ├── MyProfilePage.jsx      # Own profile (/profile/me)
│       └── SettingsPage.jsx       # Sign out + delete account
└── supabase/
    └── functions/
        └── delete-my-account/
            ├── index.ts           # Edge Function (Deno)
            └── README.txt         # Deploy instructions
```

## Локальный запуск

### Предусловия

- Node.js 18+
- Supabase проект с настроенными таблицами, RLS и RPC (см. `docs/Настройка Supabase`)

### Установка

```bash
npm install
```

### Конфигурация

Создать файл `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ключи берутся из Supabase Dashboard → Project Settings → API.

### Запуск

```bash
npm run dev     # http://localhost:5173
npm run build   # production build → dist/
npm run lint    # ESLint check
```

## Деплой

### Frontend (Vercel)

1. Подключить репозиторий в Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Edge Function

```bash
npx supabase functions deploy delete-my-account --project-ref <project-ref>
```

В Supabase Dashboard → Edge Functions → Secrets добавить:

```
SUPABASE_SERVICE_ROLE_KEY = <service_role key>
```

Переменные `SUPABASE_URL` и `SUPABASE_ANON_KEY` предоставляются Supabase автоматически.

## База данных

Схема, RLS-политики и RPC-функции описаны в `docs/Настройка Supabase — MentorMatch.md`.

Основные таблицы:

- `profiles` — профили пользователей с `onboarding_completed boolean`
- `swipes` — действия like/pass с `UNIQUE(from_user_id, to_user_id)`
- `matches` — взаимные мэтчи с уникальным индексом пары через `LEAST/GREATEST`

Создание мэтча доступно **только** через `api_submit_swipe` (SECURITY DEFINER) — прямой insert с клиента заблокирован RLS.

## Improvements / Fixes

| Fix | Описание |
|---|---|
| P2 — availability | Убран hardcoded `availability: 0`. Добавлено поле «Часов в неделю» в шаге 2 онбординга. |
| P3 — N+1 removed | `MatchesPage` теперь загружает все профили одним батч-запросом (`getProfilesBatch`) вместо N отдельных RPC-вызовов. |
| P5 — enum UI mapping | `MatchesPage` использует `ROLE_LABELS` из `ui.js` вместо inline ternary. `format` и `urgency` отображаются через централизованный mapping-слой. |

## Известные ограничения

| Ограничение | Детали |
|---|---|
| Лента: 30 кандидатов | Первые 30 профилей по `created_at desc`. При исчерпании нет кнопки обновления — только перезагрузка страницы. |
| Нет чата | Мэтчи отображаются в виде списка с ссылкой на профиль. Общение — вне приложения. |
| Ранжирование на клиенте | При большой базе пользователей клиентский scoring требует серверного кэширования. |
| Нет автотестов | Проверка корректности — только через ручной smoke-тест сценариев. |
