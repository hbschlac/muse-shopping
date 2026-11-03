'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api/auth';

/**
 * /signout: revoke the refresh token, clear local auth state, then send the
 * user to the welcome screen. Linked from Profile → Sign Out.
 */
export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      router.replace('/welcome');
    };
    // Don't let a slow or failing API call strand the user here.
    const timer = setTimeout(finish, 3000);
    logout()
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-gray-600">Signing you out…</p>
    </div>
  );
}
