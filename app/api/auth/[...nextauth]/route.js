import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import { sendWelcomeEmail } from "@/app/lib/email";
import { prisma } from "@/app/lib/db";

export const authOptions = {
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
        token.emailVerified = user.emailVerified;
        
        // For Google provider, always consider them verified
        if (account?.provider === 'google') {
          token.emailVerified = new Date();
          token.isOAuthUser = true;
        } else {
          token.isOAuthUser = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role || 'user';
        session.user.emailVerified = token.emailVerified;
        session.user.isOAuthUser = token.isOAuthUser || false;

        // Update lastSeen in the background
        if (token.id) {
          prisma.user.update({
            where: { id: token.id },
            data: { lastSeen: new Date() }
          }).catch(console.error);
        }
      }
      return session;
    },
    async signIn({ user, account, profile, isNewUser }) {
      // Check if this is a new OAuth user (first time login)
      if (account?.provider === 'google' && isNewUser) {
        try {
          console.log("New OAuth user signed in, sending welcome email:", user.email);
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
    createUser: async ({ user }) => {
      try {
        console.log("New user created, sending welcome email:", user.email);
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 