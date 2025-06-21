// lib/auth.js
// This file constructs the full authOptions object for server-side use in the NextAuth handler.
// It includes callbacks that have server-only dependencies (e.g., nodemailer).

import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { authOptions as baseAuthOptions } from './auth-options';

export const authOptions = {
  ...baseAuthOptions,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    ...baseAuthOptions.callbacks,
    async signIn({ user, account, profile, isNewUser }) {
      // First, run the base signIn callback if it exists
      const baseSignInResult = baseAuthOptions.callbacks.signIn ? await baseAuthOptions.callbacks.signIn({ user, account, profile, isNewUser }) : true;
      if (!baseSignInResult) return false;

      // Now, add the email sending logic
      if (account?.provider === 'google' && isNewUser) {
        try {
          const { sendWelcomeEmail } = await import("@/app/lib/email");
          await sendWelcomeEmail({
            to: user.email,
            name: user.name || profile?.name || user.email.split('@')[0],
          });
        } catch (error) {
          console.error("Error sending welcome email to OAuth user:", error);
        }
      }
      return true;
    }
  },
  events: {
    ...baseAuthOptions.events,
    createUser: async ({ user }) => {
      try {
        const { sendWelcomeEmail } = await import("@/app/lib/email");
        await sendWelcomeEmail({
          to: user.email,
          name: user.name || user.email.split('@')[0],
        });
      } catch (error) {
        console.error("Error sending welcome email:", error);
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretkey",
  debug: process.env.NODE_ENV === 'development',
};

// Helper function to check if user is authenticated
export const isAuthenticated = (session) => {
  return !!(session && session.user);
};

// Helper function to check user role
export const hasRole = (session, role) => {
  return !!(session?.user?.role === role);
};

// Helper function to check if email is verified
export const isEmailVerified = (session) => {
  return !!(session?.user?.emailVerified);
}; 
