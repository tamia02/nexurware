export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <div className="prose">
                <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                <p className="mb-4">
                    At Nexusware, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
                <p className="mb-4">
                    We collect information you provide directly to us, such as when you create an account, connect your mailbox, or upload leads.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
                <p className="mb-4">
                    We use your information to provide and improve our services, assist with campaign management, and communicate with you.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">3. Data Security</h2>
                <p className="mb-4">
                    We implement appropriate security measures to protect your data. Your email credentials (app passwords) are stored securely.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">4. Contact Us</h2>
                <p className="mb-4">
                    If you have any questions about this Privacy Policy, please contact us.
                </p>
            </div>
        </div>
    );
}
