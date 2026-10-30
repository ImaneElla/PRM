/**
 * @swagger
 * /api/directions:
 * get:
 * summary: Retrieve all directions
 * description: Returns list of directions for admin dashboards
 * tags:
 * - directions
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new directions
 * tags:
 * - directions
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
