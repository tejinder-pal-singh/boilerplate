import { getCurrentUser } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="container flex-1">
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            Enterprise Stack
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Production-ready full-stack TypeScript application with Next.js and NestJS
          </p>
          {user ? (
            <p className="text-lg">Welcome back, {user.name}!</p>
          ) : (
            <div className="space-x-4">
              <Link href="/auth/login" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}