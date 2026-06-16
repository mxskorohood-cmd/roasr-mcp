import type { ToolDef } from './protocol.js';
import type { RoasrClient } from './client.js';

const pretty = (v: unknown): string => JSON.stringify(v, null, 2);

/**
 * Инструменты, которые RoASr выставляет наружу через MCP. Это и есть отстройка: чужой ИИ получает
 * не «просто метрики», а находки аудита, контекст клиентов и (далее) разведку конкурентов + Vision.
 * Сейчас выставлены ридонли-инструменты поверх публичных `/v1`-эндпоинтов с реальными scope.
 */
export function buildTools(client: RoasrClient): ToolDef[] {
  return [
    {
      name: 'roasr_list_findings',
      description:
        'Находки AI-аудита рекламного кабинета Meta: проблемы, ранжированные по приоритету (severity high/med/low) со стабильным статусом. Можно ограничить клиентом.',
      inputSchema: {
        type: 'object',
        properties: { clientId: { type: 'string', description: 'UUID клиента (необязательно; без него — весь воркспейс)' } },
      },
      handler: async (a) => {
        const clientId = a.clientId ? `?clientId=${encodeURIComponent(String(a.clientId))}` : '';
        return pretty(await client.get(`/v1/findings${clientId}`));
      },
    },
    {
      name: 'roasr_metrics_summary',
      description: 'Сводка KPI рекламы воркспейса (например, суммарный спенд). Числа — сырые, формат на стороне клиента.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => pretty(await client.get('/v1/metrics/summary')),
    },
    {
      name: 'roasr_list_clients',
      description: 'Список клиентов воркспейса с контекстом (имя, ниша, маржа, статус) — для разбора в разрезе конкретного клиента.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => pretty(await client.get('/v1/clients')),
    },
    {
      name: 'roasr_spy_tag_leaderboard',
      description:
        'Лидерборд тегов крео конкурентов из Meta Ad Library: какие форматы/углы/офферы чаще всего используют и дольше всего живут (days_live — прокси выигрышности). Это разведка, которой нет у обычных метрик-инструментов.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'сколько тегов вернуть (1–100, по умолчанию 20)' } },
      },
      handler: async (a) => {
        const limit = typeof a.limit === 'number' ? `?limit=${Math.trunc(a.limit)}` : '';
        return pretty(await client.get(`/v1/spy/tags${limit}`));
      },
    },
    {
      name: 'roasr_spy_search',
      description:
        'Поиск по сохранённым крео конкурентов из Meta Ad Library: по ключу (query, по хуку/заголовку/тегам) и/или по бренду (brand — точечный фильтр по имени страницы). Пусто — топ по days_live. Возвращает хук, заголовок, формат, теги, страну и ad_archive_id для дальнейшего Vision-разбора. days_live — прокси выигрышности.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'ключевое слово/фраза (необязательно)' },
          brand: { type: 'string', description: 'имя бренда / страницы конкурента (необязательно; точечный фильтр)' },
          limit: { type: 'number', description: 'сколько крео вернуть (1–100, по умолчанию 20)' },
        },
      },
      handler: async (a) => {
        const p = new URLSearchParams();
        if (a.query) p.set('q', String(a.query));
        if (a.brand) p.set('brand', String(a.brand));
        if (typeof a.limit === 'number') p.set('limit', String(Math.trunc(a.limit)));
        const qs = p.toString();
        return pretty(await client.get(`/v1/spy/search${qs ? `?${qs}` : ''}`));
      },
    },
    {
      name: 'roasr_vision_analyze',
      description:
        'Vision-разбор конкретного крео конкурента по ad_archive_id: хук, угол, формат, сильные стороны и риски + транскрипция видео (если есть). Разбор, которого нет у обычных метрик-инструментов. Сначала найди крео через roasr_spy_search; если крео ещё не разобрано — запусти разбор в приложении.',
      inputSchema: {
        type: 'object',
        properties: { adArchiveId: { type: 'string', description: 'ad_archive_id крео (из roasr_spy_search)' } },
        required: ['adArchiveId'],
      },
      handler: async (a) => {
        const id = String(a.adArchiveId ?? '').trim();
        if (!id) return 'Ошибка: adArchiveId обязателен — возьми его из roasr_spy_search.';
        return pretty(await client.get(`/v1/vision/analyze?adArchiveId=${encodeURIComponent(id)}`));
      },
    },
  ];
}
