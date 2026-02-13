"use client";

import { useState } from "react";
import { MessageCircle, Send, Mail, CheckCircle2, Loader2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[100px] -z-0 opacity-50 group-hover:scale-110 transition-transform duration-700" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                <div className="space-y-3 max-w-lg">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 text-indigo-600">
                        <BellRing className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Get future summaries for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{podcastName}</span> delivered to you.
                    </h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        We'll send you a concise insight summary the moment a new episode drops.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                    <SubscriptionButton
                        icon={MessageCircle}
                        label="WhatsApp"
                        activeColor="border-green-500 bg-green-50/50 text-green-700 shadow-green-100"
                        iconColor="text-green-600 bg-green-100"
                        onClick={() => handleSubscribe('whatsapp')}
                        isLoading={loading === 'whatsapp'}
                        isSubscribed={subscribed.has('whatsapp')}
                    />
                    <SubscriptionButton
                        icon={Send}
                        label="Telegram"
                        activeColor="border-blue-500 bg-blue-50/50 text-blue-700 shadow-blue-100"
                        iconColor="text-blue-600 bg-blue-100"
                        onClick={() => handleSubscribe('telegram')}
                        isLoading={loading === 'telegram'}
                        isSubscribed={subscribed.has('telegram')}
                    />
                    <SubscriptionButton
                        icon={Mail}
                        label="Email"
                        activeColor="border-violet-500 bg-violet-50/50 text-violet-700 shadow-violet-100"
                        iconColor="text-violet-600 bg-violet-100"
                        onClick={() => handleSubscribe('email')}
                        isLoading={loading === 'email'}
                        isSubscribed={subscribed.has('email')}
                    />
                </div>

                <p className="text-xs text-slate-400 font-medium">
                    No spam. Unsubscribe anytime.
                </p>
            </div>
        </div>
    );
}

interface SubscriptionButtonProps {
    icon: any;
    label: string;
    activeColor: string;
    iconColor: string;
    onClick: () => void;
    isLoading: boolean;
    isSubscribed: boolean;
}

function SubscriptionButton({
    icon: Icon,
    label,
    activeColor,
    iconColor,
    onClick,
    isLoading,
    isSubscribed,
}: SubscriptionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={isLoading || isSubscribed}
            className={cn(
                "relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 h-40 w-full group/btn",
                isSubscribed
                    ? cn(activeColor, "shadow-lg scale-[1.02]")
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 hover:shadow-md hover:-translate-y-1 text-slate-600"
            )}
        >
            {isSubscribed && (
                <div className="absolute top-3 right-3">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center"
                    >
                        <CheckCircle2 className="h-4 w-4 text-inherit" />
                    </motion.div>
                </div>
            )}

            <div
                className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
                    isSubscribed ? "bg-white" : iconColor,
                    "group-hover/btn:scale-110"
                )}
            >
                {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-current" />
                ) : (
                    <Icon className={cn("h-7 w-7", isSubscribed ? "text-inherit" : "text-white")} />
                )}
            </div>

            <span className="font-semibold text-sm tracking-wide">{label}</span>
        </button>
    );
}
