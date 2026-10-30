/**
 * @swagger
 * /api/critere-evaluations:
 * get:
 * summary: Retrieve all critere-evaluations
 * description: Returns list of critere-evaluations for admin dashboards
 * tags:
 * - critere-evaluations
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new critere-evaluations
 * tags:
 * - critere-evaluations
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
