import fs from 'fs';
import path from 'path';

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name === 'route.ts' && full.includes('[') ? [full] : [];
  });
}

const files = walk(API_DIR);
console.log('routes [id] l9ito:', files.length);

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    // params: { id: string }  ➜  params: Promise<{ id: string }>
    .replace(/params\s*:\s*\{\s*id\s*:\s*string\s*;?\s*\}/g, 'params: Promise<{ id: string }>')
    // const { id } = params;  ➜  const { id } = await params;
    .replace(/=\s*params\s*;/g, '= await params;')
    // params.id  ➜  (await params).id
    .replace(/(?<![\w.])params\.id\b/g, '(await params).id');

  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log('Mis à jour :', path.relative(process.cwd(), file));
  } else {
    console.log('Rien à faire :', path.relative(process.cwd(), file));
  }
}