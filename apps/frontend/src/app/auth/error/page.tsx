import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Authentication Error',
  description: 'Something went wrong during authentication',
};

export default function AuthErrorPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong during authentication. Please try again.
          </p>
        </div>
        <Button asChild>
          <Link href="/auth/login">
            Return to Login
          </Link>
        </Button>
      </div>
    </div>
  );
}