import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/app/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password,
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, we handle user lookup/creation in the jwt callback
      // No extra DB call needed here
      if (account?.provider === "google") {
        // Just let it through — jwt callback will handle DB upsert
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "USER";
        token.emailVerified = user.emailVerified;

        if (account?.provider === "google") {
          token.emailVerified = new Date();
          token.isOAuthUser = true;

          // Single upsert handles both new and existing Google users
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            },
            create: {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              role: "USER",
            },
            select: { id: true, role: true },
          });
          token.id = dbUser.id;
          token.role = dbUser.role;
        } else {
          token.isOAuthUser = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role || "USER";
        session.user.emailVerified = token.emailVerified;
        session.user.isOAuthUser = token.isOAuthUser || false;

        // Update last seen at most once every 5 minutes (fire-and-forget, non-blocking)
        // This was previously running on EVERY getServerSession call, causing DB write on every page load
        if (token.id) {
          const now = Date.now();
          const lastUpdate = token._lastSeenUpdate || 0;
          if (now - lastUpdate > 5 * 60 * 1000) {
            token._lastSeenUpdate = now;
            prisma.user
              .update({
                where: { id: token.id },
                data: { lastSeen: new Date() },
              })
              .catch(() => {});
          }
        }
      }
      return session;
    },
  },
  // events object is removed
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretkey",
  debug: process.env.NODE_ENV === "development",
};

// Helper functions can stay here as they are client-safe
export const isAuthenticated = (session) => {
  return !!(session && session.user);
};

export const hasRole = (session, role) => {
  return !!(session?.user?.role === role);
};

export const isEmailVerified = (session) => {
  return !!session?.user?.emailVerified;
};
