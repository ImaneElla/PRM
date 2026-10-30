/**
 * @swagger
 * /api/responsables:
 * get:
 * summary: Retrieve all responsables
 * description: Returns list of responsables for admin dashboards
 * tags:
 * - responsables
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new responsables
 * tags:
 * - responsables
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
