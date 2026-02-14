'use client';

import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

export default function LanguageSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FEFDFB] pb-24">
      <PageHeader title="Language & Region" showBack onBack={() => router.push('/profile/settings')} />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E5DF] p-6">
          <p className="text-[#6B625C] text-center py-12">
            Language and region settings coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
