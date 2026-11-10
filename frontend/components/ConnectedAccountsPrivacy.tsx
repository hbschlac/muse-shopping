'use client';

import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { api } from '@/lib/api/client';

// Lets a shopper remove a connected Instagram or Gmail account. Removing it
// deletes the stored access and what Muse saved from it right away
// (src/services/privacyDeletion.js), as the privacy policy promises.

type Account = { key: 'instagram' | 'facebook' | 'gmail'; label: string; detail?: string };

type SocialResponse = { data?: { connections?: { provider: string; username?: string }[] } };
type EmailResponse = { data?: { emailAddress?: string } };

const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook' };

export default function ConnectedAccountsPrivacy() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: Account[] = [];
      try {
        const social = await api.get<SocialResponse>('/social/connections', { requiresAuth: true });
        for (const c of social?.data?.connections || []) {
          if (c.provider === 'instagram' || c.provider === 'facebook') {
            found.push({ key: c.provider, label: SOCIAL_LABELS[c.provider], detail: c.username ? `@${c.username}` : undefined });
          }
        }
      } catch {
        // signed out or none connected
      }
      try {
        const email = await api.get<EmailResponse>('/email/status', { requiresAuth: true });
        if (email?.data?.emailAddress) {
          found.push({ key: 'gmail', label: 'Gmail', detail: email.data.emailAddress });
        }
      } catch {
        // signed out or none connected
      }
      if (!cancelled) setAccounts(found);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (account: Account) => {
    setBusy(account.key);
    setNote(null);
    try {
      const path = account.key === 'gmail' ? '/email/disconnect' : `/social/${account.key}/disconnect`;
      await api.delete(path, { requiresAuth: true });
      setAccounts((prev) => prev.filter((a) => a.key !== account.key));
      setNote(`${account.label} removed. What Muse saved from it is deleted.`);
    } catch {
      setNote(`Could not remove ${account.label}. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  if (accounts.length === 0 && !note) return null;

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <Link2 className="mt-1 h-5 w-5 text-gray-400" />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Connected Accounts</h3>
          <p className="mt-1 text-sm text-gray-600">
            Removing an account deletes Muse&rsquo;s access to it and everything Muse saved from it.
          </p>
          <ul className="mt-3 space-y-2">
            {accounts.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-gray-800">
                  {a.label}
                  {a.detail ? <span className="text-gray-500"> · {a.detail}</span> : null}
                </span>
                <button
                  onClick={() => remove(a)}
                  disabled={busy === a.key}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy === a.key ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
          {note ? <p className="mt-3 text-sm text-gray-600">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}
