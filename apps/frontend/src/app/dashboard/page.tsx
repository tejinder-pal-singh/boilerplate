import { getCurrentUser } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Welcome, {user?.name}!</h2>
        <p className="text-sm text-muted-foreground">
          This is your personal dashboard.
        </p>
      </div>
    </div>
  );
}