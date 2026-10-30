/**
 * @swagger
 * /api/periode-evaluations:
 * get:
 * summary: Retrieve all periode-evaluations
 * description: Returns list of periode-evaluations for admin dashboards
 * tags:
 * - periode-evaluations
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new periode-evaluations
 * tags:
 * - periode-evaluations
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
