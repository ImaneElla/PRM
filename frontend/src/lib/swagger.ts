import fs from 'fs';
import path from 'path';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

function findRoutes(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRoutes(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

export function getApiDocs() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const file of findRoutes(API_DIR)) {
    const segments = path
      .relative(API_DIR, path.dirname(file))
      .split(path.sep)
      .filter(Boolean);

    if (segments[0] === 'doc') continue; // ma ndiroch /api/doc f l-doc

    // [id] ➜ {id}
    const url =
      '/api/' + segments.map((s) => s.replace(/^\[(.+)\]$/, '{$1}')).join('/');
    const cleanUrl = url.replace(/\/$/, '');

    const pathParams = [...cleanUrl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const source = fs.readFileSync(file, 'utf8');

    for (const method of METHODS) {
      const exported = new RegExp(
        `export\\s+(async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`
      );
      if (!exported.test(source)) continue;

      const operation: Record<string, unknown> = {
        summary: `${method} ${cleanUrl}`,
        tags: [segments[0] ?? 'api'],
        parameters: pathParams.map((name) => ({
          in: 'path',
          name,
          required: true,
          schema: { type: 'string' },
        })),
        responses: { '200': { description: 'OK' } },
      };

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        operation.requestBody = {
          content: { 'application/json': { schema: { type: 'object' } } },
        };
      }

      paths[cleanUrl] = { ...paths[cleanUrl], [method.toLowerCase()]: operation };
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'Premium Essai Manager API',
      version: '1.0.0',
      description: 'API gestion periodes essai',
    },
    servers: [{ url: '/' }],
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
  };
}