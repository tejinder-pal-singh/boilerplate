import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { SettingsForm } from '@/components/dashboard/settings-form';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings',
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Update your account settings and preferences.
        </p>
      </div>
      <div className="divide-y divide-border rounded-md border">
        <div className="p-4 sm:p-6">
          <SettingsForm user={user} />
        </div>
      </div>
    </div>
  );
}