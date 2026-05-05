import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt"

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
             name: "Credentials",
             credentials: {
                email: {},
                password: {},
             },
             async authorize(credentials){
                const {email, password} = credentials as {
                    email: string,
                    password: string,
                };

                const result = await pool.query(
                    "SELECT * FROM users WHERE email=$1", [email]
                );

                if(result.rows.length === 0) return null;

                const user = result.rows[0];

                const isMatch = await bcrypt.compare(password, user.password);
                if(!isMatch) return null;

                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                };

                console.log("Entered password:", password);
console.log("Stored hash:", user.password);
console.log("Match:", isMatch);
             },
        }),

        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],

    session: {
        strategy: "jwt",
    },

    callbacks: {
        async jwt({token, user}) {
            if(user){
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },

        async session({session, token}){
            session.user.id = token.id as string;
            session.user.role = token.role as string;
            return session;
        },

        async signIn({user}){
            const result = await pool.query(
                "SELECT * FROM users WHERE email=$1", [user.email]
            );
            return result.rows.length > 0;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};