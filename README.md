# FMI Courses — Платформа за хостване на курсове

> Централизирана уеб платформа за хостване на учебни материали на Факултета по математика и информатика, Софийски университет „Св. Климент Охридски".

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20-green)
![React](https://img.shields.io/badge/react-18-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![Docker](https://img.shields.io/badge/docker-compose-blue)

---

## 📋 Съдържание

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Йерархия на съдържанието](#йерархия-на-съдържанието)
- [Роли и права](#роли-и-права)
- [Бързо стартиране](#бързо-стартиране)
- [Конфигурация](#конфигурация)
- [Docker настройка](#docker-настройка)
- [Деплойване на FMI сървъри](#деплойване-на-fmi-сървъри)
- [Как да добавим нов курс](#как-да-добавим-нов-курс)
- [API документация](#api-документация)
- [Разработка](#разработка)
- [Технологии](#технологии)

---

## Обзор

Платформата позволява на преподаватели да организират и публикуват учебни материали за студенти. Студентите имат **публичен достъп** без регистрация — нужни са акаунти само за администриране.

### Основни функционалности

- 📚 **Множество курсове** — всеки с уникален URL (`/courses/up-2025`)
- 👥 **Множество преподаватели** на курс (teacher + assistant роли)
- 📝 **Markdown-базирани уроци** с подсветка на код (highlight.js)
- ▶️ **Интерактивни примери** — вграден sandbox за HTML/CSS/JS код
- 📎 **Ресурси** — PDF файлове, YouTube видеа, GitHub линкове, прикачени файлове
- 🔒 **Контрол на видимост** — скриване/показване на всяко ниво от йерархията
- 🐳 **Docker деплойване** — един `docker compose up` за цялата платформа
- 🇧🇬 **Български по подразбиране** с опция за BG/EN

---

## Архитектура

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Frontend   │────▶│      Nginx       │────▶│   Backend    │
│  React/Vite  │     │  Reverse Proxy   │     │  Express.js  │
│  Port: 80    │     │  Port: 8080      │     │  Port: 3001  │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                                                      │
                                              ┌───────▼───────┐
                                              │  PostgreSQL   │
                                              │  Port: 5432   │
                                              └───────────────┘
```

### Три контейнера (Docker Compose)

| Контейнер | Образ | Описание |
|-----------|-------|----------|
| `frontend` | nginx:alpine | Статичен React build + reverse proxy |
| `backend` | node:20-alpine | Express API сървър |
| `db` | postgres:16-alpine | PostgreSQL база данни |

### Потоци на данни

- Nginx обслужва статичните файлове на фронтенда
- `/api/*` заявки се проксират до backend контейнера
- `/uploads/*` се обслужва с кеширащи хедъри (30 дни)
- Backend комуникира с PostgreSQL през Docker мрежа

---

## Йерархия на съдържанието

```
Course (Курс)
├── Module (Модул / Седмица)
│   ├── Topic (Тема)
│   │   ├── Lesson (Урок) — Markdown съдържание
│   │   │   ├── Resource (PDF)
│   │   │   ├── Resource (YouTube видео)
│   │   │   ├── Resource (GitHub линк)
│   │   │   └── Resource (Прикачен файл)
│   │   └── Lesson
│   └── Topic
└── Module
```

### URL структура (публична)

```
/                                           → Начална страница
/courses/:courseSlug                        → Страница на курс
/courses/:courseSlug/:moduleSlug            → Модул
/courses/:courseSlug/:moduleSlug/:topicSlug  → Тема
/courses/:courseSlug/:moduleSlug/:topicSlug/:lessonSlug → Урок
```

Всяко ниво поддържа:
- **Видимост** — `is_visible` флаг за скриване от студенти
- **Подредба** — `sort_order` с drag-and-drop в админ панела
- **Slug** — уникален URL идентификатор

---

## Роли и права

| Роля | Достъп | Може да |
|------|--------|---------|
| **super_admin** | Цялата платформа | Създава/трие курсове, управлява потребители, добавя преподаватели, вижда всичко |
| **admin** (teacher) | Курсове, на които е назначен | Редактира курс, управлява модули/теми/уроци/ресурси, добавя асистенти |
| **assistant** | Курсове, на които е назначен | Редактира съдържание (модули/теми/уроци/ресурси), не може да управлява екип |

> ⚠️ **Студенти не се регистрират.** Публичната част е достъпна без акаунт.

---

## Бързо стартиране

### Изисквания

- [Docker](https://docs.docker.com/install/) ≥ 20.0
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.0

### Стъпки

```bash
# 1. Клонирайте хранилището
git clone <repo-url> fmi-courses
cd fmi-courses

# 2. Създайте .env файл
cp .env.example .env

# 3. Редактирайте .env (задължително сменете паролите!)
nano .env

# 4. Стартирайте всичко
docker compose up --build -d

# 5. Проверете здравето на системата
curl http://localhost:8080/api/health
```

Платформата ще е достъпна на **http://localhost:8080**

### Вход в админ панела

Отидете на **http://localhost:8080/admin/login** и влезте с данните от `.env`:

```
Email: admin@fmi.uni-sofia.bg   (SUPER_ADMIN_EMAIL от .env)
Парола: admin123                (SUPER_ADMIN_PASSWORD от .env)
```

> ⚠️ **Сменете паролата по подразбиране веднага след първия вход!**

---

## Конфигурация

### Файл `.env`

```env
# База данни
DB_HOST=db
DB_PORT=5432
DB_NAME=fmi_courses
DB_USER=fmi_admin
DB_PASSWORD=your_secure_password_here    # ← СМЕНЕТЕ!

# JWT автентикация
JWT_SECRET=your_very_long_secret_key     # ← СМЕНЕТЕ! (минимум 32 символа)
JWT_EXPIRES_IN=7d

# Начален администратор
SUPER_ADMIN_EMAIL=admin@fmi.uni-sofia.bg
SUPER_ADMIN_PASSWORD=admin123            # ← СМЕНЕТЕ!
SUPER_ADMIN_NAME=Администратор

# Сървър
PORT=3001
NODE_ENV=production
NGINX_PORT=8080
```

### Важни променливи

| Променлива | Описание | По подразбиране |
|------------|----------|-----------------|
| `DB_PASSWORD` | Парола за PostgreSQL | — (задължителна) |
| `JWT_SECRET` | Секрет за JWT токени | — (задължителен) |
| `JWT_EXPIRES_IN` | Валидност на токена | `7d` |
| `NGINX_PORT` | Публичен порт | `8080` |
| `NODE_ENV` | Режим на работа | `production` |

---

## Docker настройка

### Структура

```
fmi-courses/
├── docker-compose.yml          # Оркестрация на контейнери
├── docker/
│   ├── nginx.conf              # Nginx конфигурация (reverse proxy)
│   └── entrypoint.sh           # Стартов скрипт за backend
├── backend/
│   ├── Dockerfile              # Node.js Alpine образ
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile              # Multi-stage: Vite build → Nginx
│   └── .dockerignore
└── .env.example                # Шаблон за конфигурация
```

### Команди

```bash
# Стартиране
docker compose up --build -d

# Спиране
docker compose down

# Спиране + изтриване на данни
docker compose down -v

# Логове (всички)
docker compose logs -f

# Логове (само backend)
docker compose logs -f backend

# Рестартиране на backend
docker compose restart backend

# Rebuild на frontend
docker compose up --build frontend -d
```

### Volumes (Данни)

| Volume | Контейнер | Описание |
|--------|-----------|----------|
| `db_data` | db | PostgreSQL данни (persist) |
| `uploads_data` | backend | Качени файлове (persist) |

### Health Checks

- PostgreSQL: `pg_isready` на всеки 10 секунди
- Backend: Чака за готовност на DB преди стартиране (30 опита × 2 секунди)

---

## Деплойване на FMI сървъри

### Подготовка

1. Свържете се към FMI сървъра чрез SSH
2. Уверете се, че Docker и Docker Compose са инсталирани
3. Клонирайте хранилището

### Стъпки за деплой

```bash
# 1. Клониране
git clone <repo-url> /opt/fmi-courses
cd /opt/fmi-courses

# 2. Продукционен .env
cat > .env << 'EOF'
DB_HOST=db
DB_PORT=5432
DB_NAME=fmi_courses
DB_USER=fmi_admin
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@fmi.uni-sofia.bg
SUPER_ADMIN_PASSWORD=$(openssl rand -base64 16)
SUPER_ADMIN_NAME=Администратор
PORT=3001
NODE_ENV=production
NGINX_PORT=80
EOF

# 3. Стартиране
docker compose up --build -d

# 4. Проверка
docker compose ps
curl http://localhost/api/health
```

### За HTTPS (зад reverse proxy)

Ако FMI сървърът е зад Apache/Nginx с SSL:

```nginx
# /etc/nginx/sites-available/courses.fmi.uni-sofia.bg
server {
    listen 443 ssl;
    server_name courses.fmi.uni-sofia.bg;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Обновяване

```bash
cd /opt/fmi-courses
git pull
docker compose up --build -d
```

### Бекъп на данни

```bash
# Бекъп на базата данни
docker compose exec db pg_dump -U fmi_admin fmi_courses > backup_$(date +%Y%m%d).sql

# Възстановяване
docker compose exec -T db psql -U fmi_admin fmi_courses < backup_20250101.sql

# Бекъп на качени файлове
tar -czf uploads_backup.tar.gz $(docker volume inspect fmi-courses_uploads_data -f '{{.Mountpoint}}')
```

---

## Как да добавим нов курс

### 1. Създайте потребители (ако нямате)

1. Влезте като **super_admin** → **Потребители**
2. Създайте потребител с роля `admin` за преподавателя
3. Създайте потребители с роля `assistant` за асистентите

### 2. Създайте курс

1. **Курсове** → **Нов курс**
2. Попълнете: заглавие, описание, учебна година, семестър
3. Езикът по подразбиране е **Български**

### 3. Назначете екип

1. Отворете курса → секция **Екип**
2. Добавете преподаватели (teacher) и асистенти (assistant)

### 4. Структурирайте съдържанието

```
Курс: "Увод в програмирането 2025/2026"
├── Модул: "Седмица 01 — Въведение"
│   └── Тема: "Основи на C++"
│       ├── Урок: "Променливи и типове данни"
│       └── Урок: "Условен оператор"
├── Модул: "Седмица 02 — Цикли"
│   └── Тема: "For и while цикли"
│       ├── Урок: "For цикъл"
│       └── Урок: "While цикъл"
```

### 5. Напишете уроци

Уроците се пишат в **Markdown** с подсветка на код:

````markdown
# Променливи в C++

Променливата е **именувано място в паметта**.

## Деклариране

```cpp
int x = 5;
double pi = 3.14;
char letter = 'A';
```

## Пример

```cpp
#include <iostream>
using namespace std;

int main() {
    int a = 10;
    int b = 20;
    cout << "Сума: " << a + b << endl;
    return 0;
}
```

## Видео

![YouTube](https://www.youtube.com/watch?v=VIDEO_ID)

## Допълнителни материали

![PDF](https://example.com/slides.pdf)
````

### 6. Добавете ресурси

Всеки урок може да има ресурси:

| Тип | Описание | Пример |
|-----|----------|--------|
| `pdf` | Слайдове/материали | Качване на PDF файл |
| `video` | YouTube видеа | URL на видеоклип |
| `github` | GitHub хранилища | Линк към repo |
| `code` | Код за изпълнение | Inline HTML/CSS/JS |
| `link` | Външни линкове | Документация и др. |
| `file` | Други файлове | Архиви, изображения |

### 7. Публикувайте

Превключете **видимостта** на курса, модулите, темите и уроците на видими, за да станат достъпни публично.

---

## API документация

### Публични endpoints (без автентикация)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/public/courses` | Списък с видими курсове |
| GET | `/api/public/courses/:slug` | Детайли за курс |
| GET | `/api/public/courses/:slug/:moduleSlug` | Модул с теми |
| GET | `/api/public/courses/:slug/:moduleSlug/:topicSlug` | Тема с уроци |
| GET | `/api/public/courses/:slug/:mSlug/:tSlug/:lSlug` | Урок с ресурси |
| GET | `/api/health` | Здраве на системата |

### Автентикация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/login` | Вход (email + password → JWT) |
| GET | `/api/auth/me` | Текущ потребител |
| POST | `/api/auth/change-password` | Смяна на парола |

### Курсове (изисква JWT)

| Метод | Endpoint | Роля | Описание |
|-------|----------|------|----------|
| GET | `/api/courses` | all | Курсове на потребителя |
| GET | `/api/courses/:id` | all | Детайли за курс |
| POST | `/api/courses` | super_admin | Създаване |
| PUT | `/api/courses/:id` | teacher+ | Редакция |
| DELETE | `/api/courses/:id` | super_admin | Изтриване |
| POST | `/api/courses/:id/staff` | teacher+ | Добавяне на член |
| DELETE | `/api/courses/:id/staff/:uid` | teacher+ | Премахване на член |

### Модули / Теми / Уроци / Ресурси

Всички CRUD endpoints следват един и същ модел:

```
GET    /api/courses/:courseId/modules
POST   /api/courses/:courseId/modules
PUT    /api/courses/:courseId/modules/:id
DELETE /api/courses/:courseId/modules/:id
PATCH  /api/courses/:courseId/modules/reorder
PATCH  /api/courses/:courseId/modules/:id/visibility

GET    /api/modules/:moduleId/topics
POST   /api/modules/:moduleId/topics
PUT    /api/modules/:moduleId/topics/:id
DELETE /api/modules/:moduleId/topics/:id
PATCH  /api/modules/:moduleId/topics/reorder

GET    /api/topics/:topicId/lessons
POST   /api/topics/:topicId/lessons
PUT    /api/topics/:topicId/lessons/:id
DELETE /api/topics/:topicId/lessons/:id
PATCH  /api/topics/:topicId/lessons/reorder

GET    /api/lessons/:lessonId/resources
POST   /api/lessons/:lessonId/resources
PUT    /api/lessons/:lessonId/resources/:id
DELETE /api/lessons/:lessonId/resources/:id
```

### Потребители (само super_admin)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/users` | Списък потребители |
| POST | `/api/users` | Създаване |
| PUT | `/api/users/:id` | Редакция |
| DELETE | `/api/users/:id` | Изтриване |
| POST | `/api/users/:id/reset-password` | Нулиране на парола |

### Автентикация

Всички защитени endpoints изискват JWT токен в хедъра:

```
Authorization: Bearer <token>
```

---

## Разработка

### Локална разработка (без Docker)

```bash
# 1. Инсталирайте PostgreSQL и създайте база данни
createdb fmi_courses

# 2. Backend
cd backend
cp ../.env.example .env  # редактирайте DB_HOST=localhost
npm install
npm run dev              # nodemon, port 3001

# 3. Frontend (нов терминал)
cd frontend
npm install
npm run dev              # Vite, port 5173 (с proxy към 3001)
```

Фронтендът ще е на **http://localhost:5173** с автоматичен proxy на API.

### Структура на проекта

```
fmi-courses/
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point, Express setup
│   │   ├── db/
│   │   │   ├── connection.js     # Sequelize connection
│   │   │   ├── migrate.js        # Schema sync
│   │   │   └── seed.js           # Super admin seed
│   │   ├── models/
│   │   │   ├── index.js          # Model associations
│   │   │   ├── User.js
│   │   │   ├── Course.js
│   │   │   ├── CourseStaff.js
│   │   │   ├── Module.js
│   │   │   ├── Topic.js
│   │   │   ├── Lesson.js
│   │   │   └── Resource.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT auth, role checks
│   │   │   ├── courseAccess.js   # Course-level access control
│   │   │   └── upload.js         # Multer file upload
│   │   └── routes/
│   │       ├── auth.js           # Login, profile
│   │       ├── courses.js        # Course CRUD + staff
│   │       ├── modules.js        # Module CRUD
│   │       ├── topics.js         # Topic CRUD
│   │       ├── lessons.js        # Lesson CRUD
│   │       ├── resources.js      # Resource CRUD + upload
│   │       ├── users.js          # User management
│   │       ├── public.js         # Public read-only API
│   │       └── health.js         # Health check
│   ├── uploads/                  # Uploaded files (persistent)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry
│   │   ├── App.jsx               # Routes definition
│   │   ├── lib/
│   │   │   ├── api.js            # Axios instance
│   │   │   └── markdown.js       # Markdown renderer
│   │   ├── stores/
│   │   │   └── authStore.js      # Zustand auth state
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx   # Public header/footer
│   │   │   └── AdminLayout.jsx   # Admin sidebar
│   │   ├── pages/
│   │   │   ├── public/           # Public pages
│   │   │   └── admin/            # Admin pages
│   │   └── index.css             # Global styles
│   ├── package.json
│   └── Dockerfile
├── docker/
│   ├── nginx.conf
│   └── entrypoint.sh
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Технологии

### Backend

| Технология | Версия | Описание |
|-----------|--------|----------|
| Node.js | 20 LTS | Рънтайм |
| Express | 4.21 | HTTP фреймуърк |
| Sequelize | 6.37 | ORM за PostgreSQL |
| PostgreSQL | 16 | Релационна база данни |
| JWT | 9.x | Автентикация |
| bcryptjs | 2.4 | Хеширане на пароли |
| multer | 1.4 | Качване на файлове |
| helmet | 8.x | HTTP security headers |
| express-rate-limit | 7.x | Rate limiting |
| express-validator | 7.x | Валидация на вход |
| sanitize-html | 2.x | XSS защита |

### Frontend

| Технология | Версия | Описание |
|-----------|--------|----------|
| React | 18.3 | UI библиотека |
| Vite | 5.4 | Build инструмент |
| React Router | 6.26 | Маршрутизация |
| Zustand | 5 | State management |
| Axios | 1.7 | HTTP клиент |
| markdown-it | 14 | Markdown → HTML |
| highlight.js | 11 | Подсветка на код |
| @dnd-kit | 6 | Drag-and-drop |
| react-hot-toast | 2.4 | Нотификации |
| react-icons | 5 | Икони (Feather) |

### Инфраструктура

| Технология | Описание |
|-----------|----------|
| Docker | Контейнеризация |
| Docker Compose | Оркестрация |
| Nginx | Reverse proxy + static serving |
| Alpine Linux | Леки Docker образи |

---

## Лиценз

MIT License — вижте [LICENSE](LICENSE) за подробности.

---

*Разработено за Факултета по математика и информатика, Софийски университет „Св. Климент Охридски"*
