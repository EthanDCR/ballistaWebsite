import { Link } from "react-router-dom";
import { ChevronLeft, PhoneCall } from "lucide-react";
import "./TrainingApp.css";
import "./Terms.css";

export const TERMS_LAST_UPDATED = "September 24, 2026";

export default function Terms() {
  return (
    <div className="app-shell terms-page">
      <header className="terms-header">
        <Link to="/login" className="terms-back">
          <ChevronLeft size={18} /> Back to sign in
        </Link>
        <span className="terms-brand">
          <span className="brand-mark">
            <PhoneCall size={20} strokeWidth={2.6} />
          </span>
          <strong>CALL-STARS</strong>
        </span>
      </header>

      <article className="terms-doc">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p className="terms-updated">Last Updated: {TERMS_LAST_UPDATED}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account, accessing, or using this platform ("Service"), you agree to be
          bound by these Terms of Service ("Terms"). If you are accepting these Terms on behalf of
          an organization, company, or entity, you represent and warrant that you have full
          authority to bind that organization to these Terms.
        </p>

        <h2>2. Account Access &amp; Restrictions</h2>
        <h3>2.1 Authorized Organization Use Only</h3>
        <p>
          <strong>Non-Transferable Access:</strong> Your login credentials (username and password)
          are strictly personal to you and/or designated personnel within your registered
          organization.
        </p>
        <p>
          <strong>Prohibition on External Sharing:</strong> You are strictly prohibited from
          sharing, transferring, selling, or disclosing your login credentials or account access to
          any third party, individual, or entity outside of your registered organization.
        </p>
        <p>
          <strong>Security &amp; Responsibility:</strong> You are solely responsible for maintaining
          the confidentiality of your credentials and for all activities conducted through your
          account. Any unauthorized access or suspected breach must be reported to us immediately.
        </p>

        <h2>3. Intellectual Property &amp; Content Protection</h2>
        <h3>3.1 Ownership</h3>
        <p>
          All training materials, videos, graphics, text, modules, documentation, and underlying
          technology available on the Service ("Platform Content") are the exclusive intellectual
          property of the platform or its licensors.
        </p>
        <h3>3.2 Strict Prohibition on Copying &amp; Screen Capture</h3>
        <p>
          You are granted a limited, non-exclusive, non-transferable, and revocable license to
          access and view Platform Content solely for internal training purposes within your
          organization.
        </p>
        <p>You explicitly agree NOT to:</p>
        <ul>
          <li>
            <strong>Capture Content:</strong> Take screenshots, screen recordings, photographs, or
            audio recordings of any Platform Content.
          </li>
          <li>
            <strong>Reproduce or Duplicate:</strong> Download, copy, duplicate, replicate, scrape,
            or extract any materials or code from the Service except where an explicit "Download"
            option is provided by the platform.
          </li>
          <li>
            <strong>Distribute or Modify:</strong> Modify, distribute, display, perform, publish,
            sell, license, or create derivative works from any Platform Content without express
            prior written consent.
          </li>
        </ul>

        <h2>4. Enforcement &amp; Account Termination</h2>
        <p>
          <strong>Monitoring:</strong> We reserve the right to deploy technical measures (including
          anti-piracy tools, session tracking, and watermarking) to monitor compliance with these
          Terms.
        </p>
        <p>
          <strong>Suspension &amp; Termination:</strong> Any violation of these Terms—including
          unauthorized credential sharing, unauthorized recording, or copying of content—will result
          in immediate suspension or termination of your account and organization's access without
          prior notice or refund.
        </p>
        <p>
          <strong>Legal Remedies:</strong> We reserve all rights to pursue legal action, including
          seeking injunctive relief and damages, for any intentional infringement of our
          intellectual property or unauthorized distribution of our content.
        </p>

        <h2>5. Disclaimer of Warranties &amp; Limitation of Liability</h2>
        <p>
          <strong>"As-Is" Service:</strong> The Service is provided on an "as is" and "as available"
          basis without warranties of any kind, express or implied.
        </p>
        <p>
          <strong>Limitation of Liability:</strong> To the maximum extent permitted by applicable
          law, the platform shall not be liable for any indirect, incidental, special, or
          consequential damages arising out of your use of or inability to use the Service.
        </p>

        <h2>6. Modifications &amp; Contact</h2>
        <p>
          We reserve the right to update or modify these Terms at any time. Continued use of the
          Service after changes are posted constitutes acceptance of the modified Terms.
        </p>
        <p>
          If you have questions regarding these Terms, please contact support at{" "}
          <a href="mailto:support@theballista.com">support@theballista.com</a>.
        </p>
      </article>
    </div>
  );
}
