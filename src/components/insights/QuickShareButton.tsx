"use client";

import { useState } from "react";
import { Share2, Link2, Mail, MessageCircle, Send, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { SendNotificationPayload } from "@/types/notifications";

interface QuickShareButtonProps {
    episodeId: string;
    episodeTitle: string;
    podcastName: string;
    summaryReady: boolean;
}

export function QuickShareButton({
    episodeId,
    episodeTitle,
    podcastName,
    summaryReady,
}: QuickShareButtonProps) {
    const { user, setShowAuthModal } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // URL to share
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const text = `🎙️ ${episodeTitle} - ${podcastName}\n\nRead full insights 👇\n${shareUrl}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
    };

    const handleTelegram = () => {
        const text = `🎙️ ${episodeTitle} - ${podcastName}`;
        const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
    };

    const handleEmail = async () => {
        if (!user) {
            setIsOpen(false);
            setShowAuthModal(true, "Sign in to share via email");
            return;
        }
        // Simple mock send for now or reuse existing API
        // functionality similar to ShareMenu would go here
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: episodeTitle,
                    text: `Check out this summary of ${episodeTitle} from ${podcastName}`,
                    url: shareUrl,
                });
            } catch (err) {
                // Fallback to modal if cancelled or failed
                console.log("Native share failed or cancelled", err);
                setIsOpen(true);
            }
        } else {
            setIsOpen(true);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-background/50 backdrop-blur-md border border-white/20 hover:bg-accent/50 transition-all shadow-sm w-10 h-10"
                onClick={handleNativeShare}
            >
                <Share2 className="h-5 w-5 text-foreground" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-white/10 dark:border-white/5 shadow-2xl rounded-3xl gap-0">
                    <div className="p-6 pb-8 space-y-6">
                        <div className="text-center space-y-1.5">
                            <DialogTitle className="text-xl font-bold text-foreground tracking-tight">Share this Insight</DialogTitle>
                            <p className="text-sm text-muted-foreground font-medium">Spread the knowledge with your network</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <ShareMethodButton
                                icon={MessageCircle}
                                label="WhatsApp"
                                color="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60"
                                onClick={handleWhatsApp}
                            />
                            <ShareMethodButton
                                icon={Send}
                                label="Telegram"
                                color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                                onClick={handleTelegram}
                            />
                            <ShareMethodButton
                                icon={Mail}
                                label="Email"
                                color="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/60"
                                onClick={handleEmail}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">Or copy link</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border">
                            <div className="flex-1 min-w-0 px-2">
                                <p className="text-xs text-muted-foreground font-mono truncate">{shareUrl}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                className={cn(
                                    "rounded-lg transition-all min-w-[90px]",
                                    copied ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-background shadow-sm hover:bg-accent"
                                )}
                                onClick={handleCopyLink}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ShareMethodButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
    return (
        <button
            className="flex flex-col items-center gap-3 group px-2 py-4 rounded-2xl hover:bg-muted/50 transition-colors"
            onClick={onClick}
        >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", color)}>
                <Icon className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">{label}</span>
        </button>
    );
}
