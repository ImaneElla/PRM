/**
 * @openapi
 * /api/salaries:
 *   get:
 *     summary: Retrieve all salaries
 *     description: Returns list of salaries for admin dashboards
 *     tags:
 *       - salaries
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create a new salary
 *     tags:
 *       - salaries
 *     responses:
 *       201:
 *         description: Created
 */
export async function GET() {
  return Response.json({ data: [] });
}

export async function POST(req: Request) {
  return Response.json({ ok: true }, { status: 201 });
}