import { createInterface } from 'node:readline';

/**
 * Минимальный MCP-сервер поверх stdio (JSON-RPC 2.0, newline-delimited). Без внешних зависимостей —
 * реализует ровно тот хендшейк, что нужен Claude Desktop / Cursor / любому MCP-клиенту:
 * initialize → notifications/initialized → tools/list → tools/call. Протокольный канал — stdout;
 * любые логи — только в stderr (иначе сломаем JSON-RPC).
 */

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema объекта аргументов
  handler: (args: Record<string, unknown>) => Promise<string>;
}

type RpcId = number | string | null | undefined;

interface RpcReq {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> } & Record<string, unknown>;
}

export function runMcpServer(opts: { name: string; version: string; tools: ToolDef[] }): void {
  const { name, version, tools } = opts;
  const byName = new Map(tools.map((t) => [t.name, t] as const));
  const rl = createInterface({ input: process.stdin });

  const send = (msg: unknown): void => void process.stdout.write(JSON.stringify(msg) + '\n');
  const reply = (id: RpcId, result: unknown): void => send({ jsonrpc: '2.0', id, result });
  const replyError = (id: RpcId, code: number, message: string): void => send({ jsonrpc: '2.0', id, error: { code, message } });
  const hasId = (id: RpcId): boolean => id !== undefined && id !== null;

  async function handle(line: string): Promise<void> {
    const text = line.trim();
    if (!text) return;
    let req: RpcReq;
    try {
      req = JSON.parse(text) as RpcReq;
    } catch {
      return; // мусорная строка — игнорируем
    }
    const id = req.id;
    try {
      switch (req.method) {
        case 'initialize':
          reply(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name, version } });
          return;
        case 'notifications/initialized':
        case 'initialized':
          return; // нотификация — без ответа
        case 'ping':
          reply(id, {});
          return;
        case 'tools/list':
          reply(id, {
            tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
          });
          return;
        case 'tools/call': {
          const toolName = req.params?.name ?? '';
          const args = req.params?.arguments ?? {};
          const tool = byName.get(toolName);
          if (!tool) {
            replyError(id, -32602, `Неизвестный инструмент: ${toolName}`);
            return;
          }
          try {
            const out = await tool.handler(args);
            reply(id, { content: [{ type: 'text', text: out }] });
          } catch (e) {
            // Ошибку инструмента отдаём как isError-результат (конвенция MCP), не как протокольную ошибку.
            reply(id, { content: [{ type: 'text', text: `Ошибка: ${(e as Error).message}` }], isError: true });
          }
          return;
        }
        default:
          if (hasId(id)) replyError(id, -32601, `Метод не найден: ${req.method ?? ''}`);
      }
    } catch (e) {
      if (hasId(id)) replyError(id, -32603, (e as Error).message);
    }
  }

  rl.on('line', (line) => void handle(line));
  rl.on('close', () => process.exit(0)); // клиент отключился (stdin закрыт)
  process.stderr.write(`[roasr-mcp] ${name} v${version} готов (stdio)\n`);
}
