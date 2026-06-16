#!/usr/bin/env node
import { runMcpServer } from './protocol.js';
import { RoasrClient } from './client.js';
import { buildTools } from './tools.js';

/**
 * Точка входа MCP-сервера RoASr. Запускается клиентом ИИ (Claude Desktop / Cursor) по stdio.
 * Конфиг через ENV:
 *   ROASR_API_KEY  — ключ pg_live_… / pg_test_… из настроек RoASr (обязателен)
 *   ROASR_BASE_URL — базовый URL API (по умолчанию https://roasr.com)
 */
const apiKey = process.env.ROASR_API_KEY;
const baseUrl = process.env.ROASR_BASE_URL ?? 'https://roasr.com';

if (!apiKey) {
  process.stderr.write(
    '[roasr-mcp] ОШИБКА: задайте ROASR_API_KEY. Зарегистрируйся бесплатно на https://roasr.com → Настройки → API-ключи, создай ключ pg_live_… и подставь его.\n',
  );
  process.exit(1);
}

const client = new RoasrClient({ baseUrl, apiKey });
runMcpServer({ name: 'roasr', version: '0.1.0', tools: buildTools(client) });
