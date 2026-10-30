/**
 * @swagger
 * /api/salaries/{id}:
 * get:
 * summary: Get salaries by ID
 * tags:
 * - salaries
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: OK
 */
export async function GET(req:Request,{params}:{params: Promise<{ id: string }>}){return Response.json({id:(await params).id})}
