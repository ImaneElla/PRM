/**
 * @swagger
 * /api/notifications:
 * get:
 * summary: Retrieve all notifications
 * description: Returns list of notifications for admin dashboards
 * tags:
 * - notifications
 * responses:
 * 200:
 * description: OK
 * post:
 * summary: Create a new notifications
 * tags:
 * - notifications
 * responses:
 * 201:
 * description: Created
 */
export async function GET(){return Response.json({data:[]})}
export async function POST(req:Request){return Response.json({ok:true},{status:201})}
