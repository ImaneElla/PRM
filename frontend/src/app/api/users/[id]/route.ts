/**
 * @swagger
 * /api/users/{id}:
 * get:
 * summary: Get users by ID
 * tags:
 * - users
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
