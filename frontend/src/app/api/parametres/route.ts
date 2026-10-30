/**
 * @swagger
 * /api/parametres:
 * get:
 * summary: Retrieve all parametres
 * description: Returns list of parametres for admin dashboards
 * tags:
 * - parametres
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new parametres
 * tags:
 * - parametres
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
