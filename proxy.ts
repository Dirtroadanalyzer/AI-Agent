import { NextRequest,NextResponse } from "next/server";

export async function proxy(request:NextRequest){
  if(process.env.AUTH_REQUIRED!=="true")return NextResponse.next();const path=request.nextUrl.pathname;if(path.startsWith("/api/auth/")||path==="/api/health")return NextResponse.next();const token=request.cookies.get("dr_session")?.value;if(!token)return NextResponse.json({ok:false,error:"Sign in is required."},{status:401});const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return NextResponse.json({ok:false,error:"Authentication is not configured."},{status:503});
  try{const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`},cache:"no-store"});if(!response.ok)return NextResponse.json({ok:false,error:"Your session expired. Sign in again."},{status:401});return NextResponse.next()}catch{return NextResponse.json({ok:false,error:"Authentication verification failed."},{status:503})}
}
export const config={matcher:["/api/:path*"]};
