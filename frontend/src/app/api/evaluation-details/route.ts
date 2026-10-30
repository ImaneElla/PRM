/**
 * @swagger
 * /api/evaluation-details:
 * get:
 * summary: Retrieve all evaluation-details
 * description: Returns list of evaluation-details for admin dashboards
 * tags:
 * - evaluation-details
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new evaluation-details
 * tags:
 * - evaluation-details
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
