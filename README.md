# roasr-mcp (`@pg/mcp`) — MCP-сервер RoASr

Подключи свой ИИ (Claude Desktop, Cursor, любой MCP-клиент) к данным своего воркспейса RoASr.
Сервер — тонкий клиент публичного `/v1` API: авторизация по ключу `pg_live_…`, изоляция воркспейса
держится на стороне API (scope + workspace-скоупинг). Без внешних зависимостей.

---

## Назначение

`roasr-mcp` выставляет 6 MCP-инструментов поверх публичного REST `/v1` roasr.com.
Транспорт — stdio, JSON-RPC 2.0 (newline-delimited); MCP-хендшейк реализован без внешних пакетов.
Пакет публикуется отдельно на npm (`roasr-mcp`, `publishConfig.access=public`) и запускается через
`npx -y roasr-mcp` — без клонирования монорепо.

Параллельно существует удалённая точка входа: `apps/web/app/api/mcp/route.ts` — тот же набор
инструментов через Streamable HTTP (для Claude.ai web / ChatGPT без установки).

---

## Что экспортирует / ключевые модули

- **`src/index.ts`** — точка входа (`bin: roasr-mcp`); читает `ROASR_API_KEY` и `ROASR_BASE_URL`,
  падает с ошибкой в stderr, если ключ не задан (fail-loud), создаёт `RoasrClient` и запускает
  `runMcpServer`.
- **`src/protocol.ts`** — `runMcpServer()` и интерфейс `ToolDef`; минимальный MCP-хендшейк
  (`initialize → notifications/initialized → tools/list → tools/call`). stdout — только протокол,
  любые логи — только в stderr.
- **`src/client.ts`** — `RoasrClient`; авторизация Bearer, разворачивает конверт ошибок
  `{ error: { code, message } }` в `Error` с понятным текстом, включая onboarding-подсказку
  при 401.
- **`src/tools.ts`** — `buildTools(client)` возвращает массив из 6 `ToolDef`:

| Инструмент | Что делает | Эндпоинт · scope |
|---|---|---|
| `roasr_list_findings` | находки AI-аудита по приоритету (опц. по клиенту) | `GET /v1/findings` · `findings:read` |
| `roasr_metrics_summary` | сводка KPI рекламы | `GET /v1/metrics/summary` · `metrics:read` |
| `roasr_list_clients` | клиенты воркспейса с контекстом | `GET /v1/clients` · `clients:read` |
| `roasr_spy_tag_leaderboard` | лидерборд тегов крео конкурентов (days_live ≈ winner) | `GET /v1/spy/tags` · `spy:read` |
| `roasr_spy_search` | поиск по сохранённым крео конкурентов (хук/заголовок/теги/бренд) | `GET /v1/spy/search` · `spy:read` |
| `roasr_vision_analyze` | Vision-разбор крео по `ad_archive_id` (хук/угол/риски + транскрипт) | `GET /v1/vision/analyze` · `spy:read` |

> Разведка (`spy_search` + `vision_analyze`) — и есть отстройка: чужой ИИ получает данные, которых
> нет больше нигде. Сами сканы Ad Library и Vision-разбор (LLM/кредиты) запускаются в приложении;
> сервер отдаёт уже сохранённый результат.

---

## Как используется

**npx-клиент (для внешних пользователей)** — без монорепо:

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

Добавить в `claude_desktop_config.json` (Claude Desktop) или в настройки MCP Cursor.

**Remote-коннектор по URL** — Claude.ai (веб) и ChatGPT, без установки и npx:

```
URL:  https://roasr.com/api/mcp
Auth: Bearer pg_live_…   (твой ключ как Bearer-токен в кастомном коннекторе)
```

Эндпоинт `apps/web/app/api/mcp/route.ts` — тонкий адаптер Streamable HTTP над тем же `/v1`.

**Локальный запуск из монорепо** (для отладки):

```bash
ROASR_API_KEY=pg_live_… ROASR_BASE_URL=http://localhost:3000 pnpm --filter roasr-mcp start
```

### Получение ключа

Зарегистрируйся / войди на https://roasr.com → **Настройки → API-ключи** → создай ключ `pg_live_…`
с нужными scope. Токен показывается один раз.

---

## Ключевые файлы

```
packages/mcp/
  src/
    index.ts          — точка входа, ENV-валидация (fail-loud), запуск сервера
    protocol.ts       — runMcpServer(), ToolDef, JSON-RPC 2.0 stdio без зависимостей
    client.ts         — RoasrClient: Bearer-авторизация, разворот конверта ошибок
    tools.ts          — buildTools(): 6 MCP-инструментов поверх /v1
    __tests__/
      tools.test.ts   — юнит-тесты с фейковым клиентом (no network)
  SKILL.md            — промпт-навигатор для ИИ-агентов (onboarding, workflow, notes)
  package.json        — bin: roasr-mcp, publishConfig.access=public, engines: node>=18
  tsconfig.build.json — отдельный tsconfig для сборки в dist/
```

---

## Гочи / инварианты

- **stdout — только протокол.** Любой `console.log` или лишний `process.stdout.write` ломает
  JSON-RPC. Все логи идут строго в `stderr`.
- **Fail-loud при отсутствии ключа.** Если `ROASR_API_KEY` не задан, сервер пишет в stderr
  actionable-инструкцию и завершается с `process.exit(1)`. Белый экран / тихий запуск запрещены.
- **Ошибки инструментов — через `isError: true`, не через протокольную ошибку.** По конвенции MCP
  сбой внутри `tools/call` возвращается как `{ content: [...], isError: true }`, а не `error`.
  Это позволяет ИИ-клиенту обработать и переформулировать ответ.
- **401 — онбординг-подсказка.** `RoasrClient` расширяет сообщение об ошибке ссылкой на регистрацию
  и инструкцией создать ключ, чтобы агент мог помочь пользователю без дополнительного контекста.
- **Данные read-only, scope на стороне API.** Сам MCP-сервер не хранит состояние и не проверяет
  права — это делает публичный `/v1`. Scope задаётся при создании ключа.
- **Vision и сканы Ad Library — pre-computed.** `roasr_vision_analyze` отдаёт уже сохранённый
  разбор. Если крео ещё не разобрано — нужно запустить разбор в приложении.

---

## Тесты

```bash
# Запустить юнит-тесты пакета (фейковый клиент, без сети):
pnpm --filter roasr-mcp vitest run

# Или из корня монорепо (через turbo):
pnpm test
```

Тесты (`src/__tests__/tools.test.ts`) проверяют: список из 6 инструментов, корректную сборку
query-строк для `spy_search` (с `query`, `brand`, `limit`, без аргументов), fail-loud для
`vision_analyze` при отсутствии `adArchiveId`, URL-экранирование.

---

## Сборка и публикация

```bash
pnpm --filter roasr-mcp build   # tsc → dist/index.js (с shebang, исполняемый bin)
npm publish                     # из packages/mcp; publishConfig.access=public
```

После публикации конфиг выше (`npx -y roasr-mcp`) работает у любого пользователя без склонированного репозитория.
