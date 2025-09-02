import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const LegalDisclosureEnPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>Legal Disclosure (Japan Specified Commercial Transactions Act) | BeatNexus</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content="Legal disclosure required by the Japanese Specified Commercial Transactions Act" />
      </Helmet>

      <h1 className="text-3xl font-bold mb-6">Legal Disclosure (Specified Commercial Transactions Act)</h1>

      <div className="space-y-6 text-sm leading-7">
        <section>
          <h2 className="font-semibold">Business Operator</h2>
          <p>Individual (not a corporation)</p>
        </section>

        <section>
          <h2 className="font-semibold">Representative</h2>
          <p>Rikuji Ogino</p>
        </section>

        <section>
          <h2 className="font-semibold">Business Address</h2>
          <p>The address will be disclosed without delay upon request. Please contact us via the email above.</p>
        </section>

        <section>
          <h2 className="font-semibold">Contact</h2>
          <p>
            <a className="text-blue-600 hover:underline" href="mailto:beatnexus.app@gmail.com">beatnexus.app@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Price</h2>
          <p>
            Prices are shown on each screen (tax included). Any additional fees are disclosed on the payment screen when applicable.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Payment Timing and Methods</h2>
          <p>
            Payments are processed via Stripe using credit cards and other methods enabled in our Stripe Dashboard. The debit timing follows your card issuer's rules.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Delivery/Provision Timing</h2>
          <p>
            Super Tips (digital support) are considered delivered immediately after successful payment. No physical goods are shipped.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Returns/Cancellations</h2>
          <p>
            Due to the digital nature of the service, we do not accept returns or cancellations after payment.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">System Requirements / Service Form</h2>
          <p>
            Provided as a digital/online service. We recommend using a modern web browser.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Business Hours / Inquiry Response Time</h2>
          <p>Weekdays 10:00–18:00 (JST), we generally respond within 3 business days.</p>
        </section>

        <section>
          <h2 className="font-semibold">Notes on Payment Flow and Beneficiaries</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Payment flow: Stripe Connect (Express) with Destination charges</li>
            <li>Beneficiaries: Creators (connected accounts / battle participants)</li>
            <li>Platform fee: 15% by default (subject to change by configuration)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">Related Policies</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Link className="text-blue-600 hover:underline" to="/terms">Terms of Service</Link>
            </li>
            <li>
              <Link className="text-blue-600 hover:underline" to="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default LegalDisclosureEnPage;
