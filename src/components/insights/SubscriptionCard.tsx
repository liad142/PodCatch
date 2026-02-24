"use client";

import { useState } from "react";
import { MessageCircle, Send, Mail, CheckCircle2, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
    podcastName: string;
    podcastId: string;
    onSubscribe?: (channel: 'whatsapp' | 'telegram' | 'email') => Promise<void>;
}

export function SubscriptionCard({ podcastName, podcastId, onSubscribe }: SubscriptionCardProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [subscribed, setSubscribed] = useState<Set<string>>(new Set());

    const handleSubscribe = async (channel: 'whatsapp' | 'telegram' | 'email') => {
        if (subscribed.has(channel)) return;

        setLoading(channel);
        try {
            if (onSubscribe) {
                await onSubscribe(channel);
            } else {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            setSubscribed(prev => new Set(prev).add(channel));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-1)] p-8 text-center max-w-lg mx-auto">
            <div className="flex flex-col items-center space-y-4">
                <Bell className="h-8 w-8 text-primary" />
                <h3 className="text-h3 text-foreground">
                    Get notified about {podcastName}
                </h3>
                <p className="text-body-sm text-muted-foreground">
                    Receive a concise insight summary when a new episode drops.
                </p>

                <div className="grid grid-cols-3 gap-3 w-full mt-2">
                    <SubscriptionButton
                        icon={MessageCircle}
                        label="WhatsApp"
                        onClick={() => handleSubscribe('whatsapp')}
                        isLoading={loading === 'whatsapp'}
                        isSubscribed={subscribed.has('whatsapp')}
                    />
                    <SubscriptionButton
                        icon={Send}
                        label="Telegram"
                        onClick={() => handleSubscribe('telegram')}
                        isLoading={loading === 'telegram'}
                        isSubscribed={subscribed.has('telegram')}
                    />
                    <SubscriptionButton
                        icon={Mail}
                        label="Email"
                        onClick={() => handleSubscribe('email')}
                        isLoading={loading === 'email'}
                        isSubscribed={subscribed.has('email')}
                    />
                </div>

                <p className="text-caption text-muted-foreground mt-4">
                    No spam. Unsubscribe anytime.
                </p>
            </div>
        </div>
    );
}

interface SubscriptionButtonProps {
    icon: any;
    label: string;
    onClick: () => void;
    isLoading: boolean;
    isSubscribed: boolean;
}

function SubscriptionButton({
    icon: Icon,
    label,
    onClick,
    isLoading,
    isSubscribed,
}: SubscriptionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={isLoading || isSubscribed}
            className={cn(
                "bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all",
                isSubscribed
                    ? "bg-[var(--primary-subtle)] border-primary"
                    : "hover:bg-secondary hover:shadow-[var(--shadow-2)]"
            )}
        >
            {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isSubscribed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
                <Icon className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-caption font-medium text-foreground">{label}</span>
        </button>
    );
}
