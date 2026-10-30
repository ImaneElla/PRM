/**
 * @swagger
 * /api/periode-evaluations/{id}:
 * get:
 * summary: Get periode-evaluations by ID
 * tags:
 * - periode-evaluations
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
