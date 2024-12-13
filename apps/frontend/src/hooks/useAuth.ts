import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (
    email: string,
    password: string,
    mfaCode?: string,
  ): Promise<void> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const socialLogin = async (provider: 'google' | 'github'): Promise<void> => {
    await signIn(provider, { callbackUrl: '/dashboard' });
  };

  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    login,
    logout,
    socialLogin,
  };
}
