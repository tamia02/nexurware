export default function TermsPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <div className="prose">
                <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                <p className="mb-4">
                    Please read these Terms of Service carefully before using Nexusware.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
                <p className="mb-4">
                    By accessing or using our service, you agree to be bound by these Terms.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">2. Use of Service</h2>
                <p className="mb-4">
                    You agree to use Nexusware only for lawful purposes and in accordance with all applicable anti-spam laws (e.g., CAN-SPAM, GDPR).
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">3. Account Responsibilities</h2>
                <p className="mb-4">
                    You are responsible for safeguarding your account credentials and for all activities that occur under your account.
                </p>

                <h2 className="text-xl font-semibold mt-6 mb-2">4. Termination</h2>
                <p className="mb-4">
                    We reserve the right to terminate or suspend your account immediately, without prior notice, for any breach of these Terms.
                </p>
            </div>
        </div>
    );
}
