/**
 * @swagger
 * /api/critere-evaluations/{id}:
 * get:
 * summary: Get critere-evaluations by ID
 * tags:
 * - critere-evaluations
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
