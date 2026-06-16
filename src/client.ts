/**
 * HTTP-клиент публичного `/v1` RoASr. Авторизация — Bearer `pg_live_…`/`pg_test_…`-ключ воркспейса.
 * Ошибки приходят в конверте `{ error: { code, message, ... } }` — разворачиваем в Error с понятным текстом.
 */

export interface RoasrClientOpts {
  baseUrl: string;
  apiKey: string;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

export class RoasrClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts: RoasrClientOpts) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
  }

  private async req(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    const raw = await res.text();
    let body: unknown = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    if (!res.ok) {
      const err = (body as ErrorEnvelope | null)?.error;
      let msg = err ? `${err.code ?? res.status}: ${err.message ?? ''}` : `HTTP ${res.status}`;
      // 401 — у пользователя нет валидного ключа: даём агенту actionable-инструкцию (онбординг).
      if (res.status === 401) {
        msg += ' — нет валидного API-ключа. Зарегистрируйся бесплатно на https://roasr.com → Настройки → API-ключи, создай ключ и задай его в ROASR_API_KEY.';
      }
      throw new Error(msg);
    }
    return body;
  }

  get(path: string): Promise<unknown> {
    return this.req(path);
  }

  post(path: string, json: unknown): Promise<unknown> {
    return this.req(path, { method: 'POST', body: JSON.stringify(json) });
  }
}
