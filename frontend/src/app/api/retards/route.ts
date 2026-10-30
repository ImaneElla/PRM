/**
 * @swagger
 * /api/retards:
 * get:
 * summary: Retrieve all retards
 * description: Returns list of retards for admin dashboards
 * tags:
 * - retards
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new retards
 * tags:
 * - retards
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
