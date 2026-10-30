import { getApiDocs } from '@/lib/swagger';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getApiDocs());
}
