export default function PrivacyPolicyView() {
  return (
    <div className="glass-panel" style={{ maxWidth: 760, margin: '2rem auto', padding: '2.5rem', lineHeight: 1.75 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted, #888)', marginBottom: '2rem' }}>
        Last updated: September 2026
      </p>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. What We Collect</h2>
        <p>When you use CalorieAI we collect only what is needed to provide the service:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Account info</strong> – email address and hashed password (never stored in plain text).</li>
          <li><strong>Meal logs</strong> – food names, portion sizes, calorie and macro values you enter or that are detected by the AI scanner.</li>
          <li><strong>Food photos</strong> – images you optionally upload for AI analysis. Photos are processed by Azure OpenAI and then stored securely in your account.</li>
          <li><strong>Nutrition profile</strong> – age, weight, height, dietary goals you set.</li>
          <li><strong>Usage data</strong> – anonymous request logs (no IP addresses are retained).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>2. How We Use Your Data</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>To show you your personal calorie dashboard, meal history, and analytics.</li>
          <li>To run AI-powered food recognition (photos are sent to Azure OpenAI and are not used to train models).</li>
          <li>To generate personalised meal plans and nutrition coaching responses.</li>
          <li>We <strong>never</strong> sell your data to third parties.</li>
          <li>We <strong>never</strong> use your data for advertising.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>3. Data Storage & Security</h2>
        <p>
          All data is stored in Microsoft Azure SQL (encrypted at rest) hosted in a secure Azure data centre.
          Passwords are hashed using bcrypt before storage. All traffic is encrypted via HTTPS/TLS.
        </p>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>4. Third-Party Services</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Azure OpenAI</strong> – used for food photo analysis and nutrition coaching. Governed by <a href="https://azure.microsoft.com/en-us/support/legal/" target="_blank" rel="noreferrer">Microsoft's privacy terms</a>.</li>
          <li><strong>Google Fonts</strong> – font files loaded from Google's CDN. No personal data is shared.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>5. Your Rights</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Access</strong> – you can view all data stored in your account at any time from within the app.</li>
          <li><strong>Deletion</strong> – you can delete individual meals, your nutrition profile, or your entire account.</li>
          <li><strong>Export</strong> – contact us to request a full export of your data.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>6. Children</h2>
        <p>CalorieAI is not directed at children under 13. We do not knowingly collect data from children under 13.</p>
      </section>

      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>7. Changes to This Policy</h2>
        <p>
          We may update this policy. When we do, the "Last updated" date above will change.
          Continued use of the app after changes constitutes acceptance of the new policy.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>8. Contact</h2>
        <p>
          Questions or requests? Email us at{' '}
          <a href="mailto:privacy@calorieai.app">privacy@calorieai.app</a>.
        </p>
      </section>
    </div>
  );
}
