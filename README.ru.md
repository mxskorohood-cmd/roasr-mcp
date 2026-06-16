# roasr-mcp

**[English](README.md) · Русский**

**MCP-сервер для [RoASr](https://roasr.com)** — подключи Claude, Cursor или любой MCP-клиент к своему воркспейсу аналитики рекламы RoASr: **находки AI-аудита, сводки KPI, шпион конкурентов и Vision-разбор креативов** (Meta/Google). Тонкий клиент **без зависимостей** поверх публичного REST `/v1`.

> Авторизация — твой ключ `pg_live_…`; изоляция воркспейса и scope держатся на стороне API. Сервер read-only и без состояния.

---

## Быстрый старт

### 1. Получи API-ключ
Войди на **https://roasr.com → Настройки → API-ключи** → создай ключ `pg_live_…` с нужными scope (показывается один раз).

### 2. Подключись — на выбор

**A. Remote-коннектор — без установки** (Claude.ai веб, ChatGPT, любой HTTP MCP-клиент):

```
URL:  https://roasr.com/api/mcp
Auth: Bearer pg_live_…
```

**B. Локально через npx** (Claude Desktop, Cursor, Claude Code) — добавь в MCP-конфиг:

```json
{
  "mcpServers": {
    "roasr": {
      "command": "npx",
      "args": ["-y", "roasr-mcp"],
      "env": {
        "ROASR_API_KEY": "pg_live_…",
        "ROASR_BASE_URL": "https://roasr.com"
      }
    }
  }
}
```

> Пока пакет не опубликован в npm — используй `"args": ["-y", "github:mxskorohood-cmd/roasr-mcp"]`.

**C. Из исходников:**

```bash
git clone https://github.com/mxskorohood-cmd/roasr-mcp && cd roasr-mcp
npm install && npm run build
ROASR_API_KEY=pg_live_… node dist/index.js
```

---

## Инструменты

| Инструмент | Что делает | Эндпоинт · scope |
|---|---|---|
| `roasr_list_findings` | находки AI-аудита по приоритету (опц. по клиенту) | `GET /v1/findings` · `findings:read` |
| `roasr_metrics_summary` | сводка KPI рекламы | `GET /v1/metrics/summary` · `metrics:read` |
| `roasr_list_clients` | клиенты воркспейса с контекстом | `GET /v1/clients` · `clients:read` |
| `roasr_spy_tag_leaderboard` | лидерборд тегов крео конкурентов (days_live ≈ winner) | `GET /v1/spy/tags` · `spy:read` |
| `roasr_spy_search` | поиск по сохранённым крео конкурентов (хук/заголовок/теги/бренд) | `GET /v1/spy/search` · `spy:read` |
| `roasr_vision_analyze` | Vision-разбор крео по `ad_archive_id` (хук/угол/риски + транскрипт) | `GET /v1/vision/analyze` · `spy:read` |

> Разведка (`spy_search` + `vision_analyze`) — и есть отстройка: чужой ИИ получает данные, которых нет больше нигде. Сами сканы Ad Library и Vision-разбор (LLM/кредиты) запускаются **в приложении**; сервер отдаёт уже сохранённый результат.

---

## Конфигурация

| Env | Обязателен | По умолчанию |
|---|---|---|
| `ROASR_API_KEY` | ✅ | — (без него сервер падает с понятной ошибкой) |
| `ROASR_BASE_URL` | — | `https://roasr.com` |

---

## Разработка

```bash
npm install      # ставит devDeps + собирает dist/ (хук prepare)
npm run build    # tsc → dist/index.js (исполняемый bin, shebang)
npm test         # vitest — юнит-тесты с фейковым клиентом (без сети)
npm run dev      # tsx src/index.ts
```

Структура: `src/index.ts` (точка входа, валидация ENV, fail-loud) · `src/protocol.ts` (JSON-RPC 2.0 stdio без зависимостей + `runMcpServer`/`ToolDef`) · `src/client.ts` (`RoasrClient`, Bearer-авторизация, разворот конверта ошибок) · `src/tools.ts` (`buildTools` → 6 инструментов). `SKILL.md` — навигатор-скилл для ИИ-агентов.

> Внутри монорепо RoASr пакет собирается через `pnpm --filter roasr-mcp build`.

---

## Гочи / инварианты

- **stdout — только протокол** — все логи в `stderr` (лишний `console.log` ломает JSON-RPC).
- **Fail-loud** — нет `ROASR_API_KEY` → понятная ошибка в stderr + `exit(1)`.
- **Ошибки инструментов** — через `{ isError: true }` (конвенция MCP), чтобы клиент мог обработать.
- **Read-only**; scope держит API по ключу.
- **Vision / сканы Ad Library — pre-computed** в приложении; `vision_analyze` отдаёт сохранённый разбор.

---

## Лицензия

[MIT](LICENSE) © 2026 SmartFlow LLC — [roasr.com](https://roasr.com)
