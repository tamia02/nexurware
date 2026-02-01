"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { LayoutDashboard, Users, LayoutList, Settings, CreditCard, BarChart3, Puzzle, Inbox } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Campaigns', href: '/campaigns', icon: LayoutList },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Integrations', href: '/settings/integrations', icon: Puzzle },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex bg-gray-900 w-64 flex-col fixed inset-y-0 z-50">
            <div className="flex h-16 shrink-0 items-center gap-2 px-6 bg-gray-900 border-b border-gray-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div className="font-semibold text-white">Nexusware</div>
            </div>
            <nav className="flex flex-1 flex-col px-6 py-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                isActive
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                        >
                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
