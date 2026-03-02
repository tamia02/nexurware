import { useEffect, useState } from "react";
import { X, Mail, Clock, MousePointer2, MessageSquare, PlusCircle } from "lucide-react";
import { api } from "@/lib/api";

interface LeadSidePanelProps {
    campaignId: string;
    leadId: string | null;
    onClose: () => void;
}

export function LeadSidePanel({ campaignId, leadId, onClose }: LeadSidePanelProps) {
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!campaignId || !leadId) return;
        setLoading(true);
        api.get(`/campaigns/${campaignId}/leads/${leadId}/timeline`)
            .then(res => {
                setTimeline(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [campaignId, leadId]);

    if (!leadId) return null;

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'EMAIL_QUEUED': return <PlusCircle className="w-4 h-4 text-gray-500" />;
            case 'EMAIL_SENT': return <Mail className="w-4 h-4 text-blue-500" />;
            case 'EMAIL_OPENED': return <Mail className="w-4 h-4 text-green-500" />;
            case 'LINK_CLICKED': return <MousePointer2 className="w-4 h-4 text-purple-500" />;
            case 'REPLY_RECEIVED': return <MessageSquare className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getEventDescription = (type: string) => {
        switch (type) {
            case 'EMAIL_QUEUED': return 'Email queued for sending';
            case 'EMAIL_SENT': return 'Email sent';
            case 'EMAIL_OPENED': return 'Email opened';
            case 'LINK_CLICKED': return 'Link clicked';
            case 'REPLY_RECEIVED': return 'Reply received';
            default: return type.replace('_', ' ');
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 max-w-md w-full flex">
                <div className="w-full h-full bg-white shadow-xl flex flex-col pt-6 pb-4 overflow-y-auto">
                    <div className="px-4 flex items-center justify-between border-b pb-4">
                        <h2 className="text-lg font-medium text-gray-900">Lead Timeline</h2>
                        <button onClick={onClose} className="rounded-md text-gray-400 hover:text-gray-500">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="px-6 py-4">
                        {loading ? (
                            <p className="text-gray-500 text-sm">Loading timeline...</p>
                        ) : timeline.length === 0 ? (
                            <p className="text-gray-500 text-sm">No events found for this lead.</p>
                        ) : (
                            <div className="flow-root mt-4">
                                <ul role="list" className="-mb-8">
                                    {timeline.map((event, eventIdx) => (
                                        <li key={event.id}>
                                            <div className="relative pb-8">
                                                {eventIdx !== timeline.length - 1 ? (
                                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                                ) : null}
                                                <div className="relative flex space-x-3">
                                                    <div>
                                                        <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                                            {getEventIcon(event.type)}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500">
                                                                {getEventDescription(event.type)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                            <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
