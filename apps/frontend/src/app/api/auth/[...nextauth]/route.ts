import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import { api } from '@/lib/api/api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const response = await api.post('/auth/login', {
            email: credentials?.email,
            password: credentials?.password,
            mfaCode: credentials?.mfaCode,
          });

          const { accessToken, refreshToken } = response.data;
          
          // Fetch user profile
          const userResponse = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          return {
            ...userResponse.data,
            accessToken,
            refreshToken,
          };
        } catch (error) {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        // Initial sign in
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          roles: user.roles,
        };
      }

      // On subsequent calls, check if access token needs refresh
      const tokenExp = token.exp as number;
      if (Date.now() < tokenExp * 1000) {
        return token;
      }

      try {
        const response = await api.post('/auth/refresh', {
          refreshToken: token.refreshToken,
        });

        const { accessToken, refreshToken } = response.data;
        return {
          ...token,
          accessToken,
          refreshToken,
        };
      } catch {
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        roles: token.roles,
      };
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
