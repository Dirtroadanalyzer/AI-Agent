export async function POST(){const response=Response.json({ok:true});response.headers.append("Set-Cookie","dr_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");return response}
