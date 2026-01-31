"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/Button';

// Steps
import { ConnectMailboxStep, ImportLeadsStep, CreateCampaignStep } from './steps';

const STEPS = ['Welcome', 'Connect Mailbox', 'Import Leads', 'Create Campaign'];

export default function OnboardingWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [status, setStatus] = useState<any>(null); // Type: OnboardingStatus
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/onboarding');
            setStatus(res.data);

            // Auto-advance logic based on what's done?
            // Or just let them go through it. 
            // If completely done, redirect to dashboard.
            if (res.data.completed) {
                router.push('/dashboard');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            router.push('/');
        }
    };

    if (loading) return <div className="text-center">Loading setup...</div>;

    return (
        <div>
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    {STEPS.map((step, idx) => (
                        <div key={idx} className={`flex flex-col items-center ${idx <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${idx < currentStep ? 'bg-blue-600 border-blue-600 text-white' :
                                idx === currentStep ? 'border-blue-600 text-blue-600' : 'border-gray-300'
                                }`}>
                                {idx < currentStep ? <Check className="w-4 h-4" /> : <span>{idx + 1}</span>}
                            </div>
                            <span className="text-xs mt-1 hidden sm:block">{step}</span>
                        </div>
                    ))}
                </div>
                <div className="relative h-2 bg-gray-200 rounded">
                    <div
                        className="absolute h-full bg-blue-600 rounded transition-all duration-300"
                        style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="py-4">
                {currentStep === 0 && (
                    <div className="text-center space-y-4">
                        <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-blue-600">
                            <Send className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold">Welcome to Agentic Outreach!</h3>
                        <p className="text-gray-600">
                            We&apos;ll help you set up your cold email infrastructure in just 3 steps.
                        </p>
                        <Button onClick={handleNext} className="w-full">
                            Get Started <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}

                {currentStep === 1 && (
                    <ConnectMailboxStep onNext={handleNext} defaultCompleted={status?.hasMailbox} />
                )}

                {currentStep === 2 && (
                    <ImportLeadsStep onNext={handleNext} defaultCompleted={status?.hasLeads} />
                )}

                {currentStep === 3 && (
                    <CreateCampaignStep onNext={handleNext} defaultCompleted={status?.hasCampaign} />
                )}
            </div>
        </div>
    );
}
