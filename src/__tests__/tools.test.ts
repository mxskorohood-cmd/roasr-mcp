import { describe, it, expect } from 'vitest';
import { buildTools } from '../tools.js';
import type { RoasrClient } from '../client.js';

// Фейковый клиент: записывает пути вызовов, не ходит в сеть.
function fakeClient(): { client: RoasrClient; calls: string[] } {
  const calls: string[] = [];
  const client = {
    get: async (path: string) => {
      calls.push(path);
      return { ok: true, path };
    },
    post: async () => ({}),
  } as unknown as RoasrClient;
  return { client, calls };
}

describe('buildTools — MCP-инструменты RoASr', () => {
  it('выставляет все 6 инструментов, включая разведку spy_search + vision_analyze', () => {
    const { client } = fakeClient();
    const names = buildTools(client).map((t) => t.name);
    expect(names).toEqual([
      'roasr_list_findings',
      'roasr_metrics_summary',
      'roasr_list_clients',
      'roasr_spy_tag_leaderboard',
      'roasr_spy_search',
      'roasr_vision_analyze',
    ]);
  });

  it('spy_search строит /v1/spy/search с q и limit', async () => {
    const { client, calls } = fakeClient();
    const tool = buildTools(client).find((t) => t.name === 'roasr_spy_search')!;
    await tool.handler({ query: 'serum', limit: 5 });
    expect(calls).toEqual(['/v1/spy/search?q=serum&limit=5']);
  });

  it('spy_search без аргументов — без query-строки', async () => {
    const { client, calls } = fakeClient();
    const tool = buildTools(client).find((t) => t.name === 'roasr_spy_search')!;
    await tool.handler({});
    expect(calls).toEqual(['/v1/spy/search']);
  });

  it('spy_search по бренду (+ query) строит q & brand', async () => {
    const { client, calls } = fakeClient();
    const tool = buildTools(client).find((t) => t.name === 'roasr_spy_search')!;
    await tool.handler({ query: 'serum', brand: 'CeraVe' });
    expect(calls).toEqual(['/v1/spy/search?q=serum&brand=CeraVe']);
  });

  it('vision_analyze требует adArchiveId (fail-loud, без сетевого вызова)', async () => {
    const { client, calls } = fakeClient();
    const tool = buildTools(client).find((t) => t.name === 'roasr_vision_analyze')!;
    const out = await tool.handler({});
    expect(out).toContain('adArchiveId');
    expect(calls).toEqual([]);
  });

  it('vision_analyze строит /v1/vision/analyze?adArchiveId= с экранированием', async () => {
    const { client, calls } = fakeClient();
    const tool = buildTools(client).find((t) => t.name === 'roasr_vision_analyze')!;
    await tool.handler({ adArchiveId: '123 45' });
    expect(calls).toEqual(['/v1/vision/analyze?adArchiveId=123%2045']);
  });
});
