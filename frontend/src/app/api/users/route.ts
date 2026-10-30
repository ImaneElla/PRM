/**
 * @swagger
 * /api/users:
 * get:
 * summary: Retrieve all users
 * description: Returns list of users for admin dashboards
 * tags:
 * - users
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new users
 * tags:
 * - users
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
