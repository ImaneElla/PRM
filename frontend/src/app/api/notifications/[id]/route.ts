/**
 * @swagger
 * /api/notifications/{id}:
 * get:
 * summary: Get notifications by ID
 * tags:
 * - notifications
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
