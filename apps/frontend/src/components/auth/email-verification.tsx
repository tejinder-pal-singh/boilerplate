'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { api } from '@/lib/api/api-client';

export function EmailVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const token = searchParams.get('token');

  React.useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        toast({
          title: 'Error',
          description: 'Invalid verification token',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', { token });

        if (response.error) {
          toast({
            title: 'Error',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Success',
          description: 'Your email has been verified. You can now log in.',
        });
        
        router.push('/auth/login');
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    verifyEmail();
  }, [token, router, toast]);

  return (
    <div className="flex flex-col items-center gap-4">
      {isLoading ? (
        <Icons.spinner className="h-8 w-8 animate-spin" />
      ) : (
        <Button onClick={() => router.push('/auth/login')}>
          Return to Login
        </Button>
      )}
    </div>
  );
}