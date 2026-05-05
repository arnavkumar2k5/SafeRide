import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: any){
    const token = await getToken({req});

    if(!token){
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/parent/:path*", "/driver/:path*", "/admin/:path*"],
};