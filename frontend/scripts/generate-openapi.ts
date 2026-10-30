import fs from 'fs';
import path from 'path';
import { getApiDocs } from '../src/lib/swagger';

const out = path.join(process.cwd(), 'public', 'openapi.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(getApiDocs(), null, 2));
console.log('openapi.json genere:', out);