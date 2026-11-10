import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Muse's public privacy policy, served at www.muse.shopping/privacy.
// /api/v1/privacy (the URL given to Meta and Google) redirects here.
//
// Keep this page true to what the code does. If you add a tracker, a new
// connected account, a new kind of data, or a new company that receives data,
// update the matching section and LAST_UPDATED in the same pull request.

const LAST_UPDATED = 'November 10, 2026';
const CONTACT_EMAIL = 'hannah@muse.shopping';

export const metadata: Metadata = {
  title: 'Privacy Policy · Muse',
  description: 'What Muse collects, why, who sees it, and how to get it deleted.',
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2">{children}</ul>;
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--color-coral)] hover:underline">
      {CONTACT_EMAIL}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Last updated: {LAST_UPDATED}</p>

        <div className="bg-white rounded-[16px] p-5 sm:p-8 shadow-sm">
          <div className="mb-8 rounded-[12px] bg-[var(--color-ecru)] p-4 sm:p-5">
            <p className="font-medium text-gray-900 mb-2">The short version</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-gray-700">
              <li>Muse does not sell or rent your information, and does not share it for advertising.</li>
              <li>Muse has no ad trackers, no Meta Pixel and no third-party analytics.</li>
              <li>Muse never stores your card number.</li>
              <li>Connecting Instagram or Gmail is optional, and you can disconnect at any time.</li>
              <li>
                Email <Mail /> to get a copy of your data or have it deleted.
              </li>
            </ul>
          </div>

          <Section id="who" title="1. Who runs Muse">
            <p>
              Muse (www.muse.shopping) is an independent shopping project based in California. It is run by its
              founder and is not a company yet. In this policy, &ldquo;Muse,&rdquo; &ldquo;we&rdquo; and
              &ldquo;us&rdquo; mean that project. If Muse becomes a company, we will update this policy and tell
              account holders before anything changes for you.
            </p>
            <p>
              This policy covers the Muse website, the Muse app you can add to your home screen, and the emails
              and alerts Muse sends.
            </p>
          </Section>

          <Section id="collect" title="2. What we collect">
            <p className="font-medium text-gray-900">What you give us</p>
            <List>
              <li>
                <strong>Account details:</strong> your email address and name. If you set a password, we store
                only a one-way hash of it, never the password itself. If you sign in with Google or Apple, we get
                your email address and an account ID from them.
              </li>
              <li>
                <strong>Preferences:</strong> the stores, brands, sizes and styles you tell us you like.
              </li>
              <li>
                <strong>Saves, alerts and cart:</strong> items you save, the price and restock alerts you turn
                on, and what is in your cart.
              </li>
              <li>
                <strong>Shipping details:</strong> if you add them, so Muse can fill in a store&rsquo;s checkout
                for you.
              </li>
              <li>
                <strong>Messages:</strong> your email if you join the waitlist, and anything you send us as
                feedback or a support request.
              </li>
            </List>

            <p className="font-medium text-gray-900 pt-2">What Muse records while you use it</p>
            <List>
              <li>
                <strong>Activity in Muse:</strong> items you view, search for, save or add to your cart. We use this
                to pick what shows up in your feed. It stays in Muse&rsquo;s own database.
              </li>
              <li>
                <strong>Alerts:</strong> if you turn on alerts, your browser gives us a delivery address for that
                device. We keep a history of which alerts we sent and whether you opened them.
              </li>
              <li>
                <strong>Shopping agent log:</strong> a record of each step Muse takes for you, such as checking a
                price, updating your cart or starting a checkout, and why it took that step. This lets us trace
                mistakes and spot fraud.
              </li>
              <li>
                <strong>Technical details:</strong> your IP address and browser or device type, which appear in
                server logs and are saved with your privacy choices.
              </li>
            </List>

            <p className="font-medium text-gray-900 pt-2">From accounts you choose to connect</p>
            <List>
              <li>
                <strong>Instagram</strong> (through Meta&rsquo;s login): your basic profile and your posts, which
                Muse uses to learn your style. Muse never posts, comments or sends messages for you.
              </li>
              <li>
                <strong>Gmail:</strong> read-only access. Muse looks only for order confirmations and shipping
                emails from stores, so it can show what you have bought and suggest things that go with it. Muse
                cannot send, delete or change your email. See section 7 for the rules Muse follows with Google
                data.
              </li>
            </List>

            <p className="font-medium text-gray-900 pt-2">Payments</p>
            <p>
              Muse never stores your card number. Today, when you check out, you pay on the store&rsquo;s own
              checkout and the store handles your card. If Muse later lets you pay inside Muse, your card will be
              handled by the card network or payment company, and Muse will keep only the card brand and last
              four digits. We will update this policy before that starts.
            </p>
          </Section>

          <Section id="use" title="3. How we use it">
            <List>
              <li>To run your account and keep you signed in.</li>
              <li>To show you new arrivals, prices and items that match what you like.</li>
              <li>To send the alerts and emails you asked for, like price drops, restocks and account emails.</li>
              <li>To fill in a store&rsquo;s checkout with your shipping details when you ask us to.</li>
              <li>To keep Muse secure, prevent fraud and fix bugs.</li>
              <li>To follow the law.</li>
            </List>
            <p>We do not sell your information, and we do not use it to show you ads from other companies.</p>
          </Section>

          <Section id="cookies" title="4. Cookies and browser storage">
            <p>
              Muse does not use advertising cookies, the Meta Pixel, Google Analytics or any other third-party
              tracker. To keep you signed in and remember your privacy choices, Muse saves a few small items in
              your browser&rsquo;s storage on your device. Clearing your browser&rsquo;s data for Muse signs you
              out and resets those choices.
            </p>
            <p>
              Product photos load from the stores&rsquo; own websites. Like any website, those servers can see
              your IP address and browser type when the photo loads. When you leave Muse for a store, that
              store&rsquo;s cookies and privacy policy apply.
            </p>
          </Section>

          <Section id="affiliate" title="5. Affiliate links">
            <p>
              Some links to stores go through affiliate networks, such as CJ Affiliate and Rakuten Advertising. If
              you click one and buy something, the network and the store use their own cookies to credit Muse
              with a small commission. It does not change your price. Muse does not send these networks your name
              or email address. The reports Muse gets back show the order amount and commission, not who you are.
            </p>
          </Section>

          <Section id="share" title="6. Who we share it with">
            <List>
              <li>
                <strong>Companies that run Muse for us:</strong> website hosting (Vercel), database hosting, email
                delivery, and the push service built into your browser or phone (for example Apple or Google),
                which delivers alerts to your device. They handle data only so that Muse works.
              </li>
              <li>
                <strong>Stores, when you check out:</strong> Muse sends the store your cart and, if you ask Muse
                to fill in checkout, your shipping details. The store&rsquo;s privacy policy then covers your
                order.
              </li>
              <li>
                <strong>Google, Apple and Meta:</strong> when you sign in with them or connect an account, as
                described above.
              </li>
              <li>
                <strong>When the law requires it,</strong> or to protect you, other shoppers or Muse from fraud
                or harm.
              </li>
              <li>
                <strong>If Muse becomes a company or is sold,</strong> your information moves with it under this
                policy. We will tell you first.
              </li>
            </List>
            <p>
              Muse does not sell your personal information, and does not &ldquo;share&rdquo; it for targeted
              advertising as California law defines those terms.
            </p>
          </Section>

          <Section id="google" title="7. Google user data">
            <p>
              Muse&rsquo;s use and transfer of information received from Google APIs follows the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-[var(--color-coral)] hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Gmail data is used only to show your orders and
              recommendations inside Muse. It is not used for ads, not sold, not used to train general AI models,
              and not read by a person unless you ask us to help with a problem, it is needed for security, or the
              law requires it.
            </p>
          </Section>

          <Section id="keep" title="8. How long we keep it">
            <List>
              <li>We keep your account information while your account is open.</li>
              <li>
                If you delete your account, or email us to ask, we delete or anonymize your information within 30
                days. We may keep the shopping agent log and order records longer when we need them to handle
                fraud, disputes or legal duties, and only for that purpose.
              </li>
              <li>
                If you disconnect Instagram or Gmail, Muse stops reading it right away. Email us and we will delete
                what Muse saved from that account within 30 days.
              </li>
              <li>Server logs are kept for a short time and then deleted automatically.</li>
            </List>
          </Section>

          <Section id="choices" title="9. Your choices and rights">
            <List>
              <li>
                <strong>See or download your data:</strong> from{' '}
                <Link href="/profile/privacy" className="text-[var(--color-coral)] hover:underline">
                  Profile &rsaquo; Privacy
                </Link>
                , or by email.
              </li>
              <li>
                <strong>Correct it:</strong> edit your profile, or email us.
              </li>
              <li>
                <strong>Delete it:</strong> from Profile &rsaquo; Privacy, or by email.
              </li>
              <li>
                <strong>Disconnect Instagram:</strong> remove Muse in Instagram under Settings &rsaquo; Apps and
                websites. Meta then sends Muse a deletion request, and we delete what Muse saved from Instagram
                within 30 days.
              </li>
              <li>
                <strong>Disconnect Gmail:</strong> remove Muse at{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  className="text-[var(--color-coral)] hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  myaccount.google.com/permissions
                </a>
                .
              </li>
              <li>
                <strong>Alerts and email:</strong> turn alerts off in Profile &rsaquo; Notifications or in your
                phone&rsquo;s settings. To stop emails, use the link at the bottom of any Muse email or email us.
              </li>
            </List>
            <p>
              Wherever you live, you can ask to see, correct or delete your information, and we will answer within
              30 days. California residents have these rights under the CCPA, plus the right not to be treated
              differently for using them. Muse does not sell personal information, so there is nothing to opt out
              of. You can also ask someone you authorize to make a request for you.
            </p>
          </Section>

          <Section id="security" title="10. How we protect it">
            <p>
              Muse uses encrypted connections (HTTPS), stores passwords only as one-way hashes, keeps its signing
              keys in a managed key service rather than in code, and limits access to Muse&rsquo;s data to the
              founder. No system is perfectly secure. If a breach affects your information, we will tell you as
              the law requires.
            </p>
          </Section>

          <Section id="children" title="11. Children">
            <p>
              Muse is not meant for children under 13, and we do not knowingly collect information from them. If
              you think a child has given us information, email us and we will delete it.
            </p>
          </Section>

          <Section id="changes" title="12. Changes to this policy">
            <p>
              When this policy changes, we update the date at the top. If a change affects how we use information
              you already gave us, we will email account holders before it takes effect.
            </p>
          </Section>

          <Section id="contact" title="13. Contact">
            <p>
              Questions or requests about your privacy: <Mail />.
            </p>
          </Section>
        </div>

        <div className="text-center mt-8 text-sm text-gray-600 space-x-4">
          <Link href="/terms" className="hover:text-gray-900">
            Terms
          </Link>
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
