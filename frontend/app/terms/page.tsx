import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <div className="pt-12 pb-4 px-4">
        <h1 className="text-lg font-semibold text-gray-900">Terms of Service</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-[16px] p-6 md:p-8 shadow-sm">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-500 mb-6">
              Last Updated: February 8, 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Muse Shopping ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Muse Shopping provides a unified shopping platform that aggregates products from multiple retailers, allowing users to shop from their favorite stores with a single checkout experience.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To access certain features of the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Purchases and Payments</h2>
              <p className="text-gray-700 mb-4">
                When you make a purchase through our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>All purchases are subject to product availability</li>
                <li>Prices and availability are subject to change without notice</li>
                <li>We reserve the right to refuse or cancel orders</li>
                <li>Payment information is processed securely through third-party payment processors</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Returns and Refunds</h2>
              <p className="text-gray-700 mb-4">
                Returns and refunds are subject to the policies of individual retailers from which products were purchased. We facilitate the return process but do not control individual retailer policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                All content, features, and functionality of the Service are owned by Muse Shopping and are protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. User Conduct</h2>
              <p className="text-gray-700 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Impersonate any person or entity</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is also governed by our{' '}
                <Link href="/profile/privacy" className="text-[var(--color-coral)] hover:underline">
                  Privacy Policy
                </Link>
                , which describes how we collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Muse Shopping shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-700">
                <strong>Email:</strong> legal@muse.shopping
              </p>
            </section>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
