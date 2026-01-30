"use client";

import { useState } from "react";
import { X, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpeakerInfo } from "@/types/transcript";

interface SpeakerIdentifierProps {
  speakers: SpeakerInfo[];
  onUpdate: (oldName: string, newName: string) => void;
  onClose: () => void;
}

export function SpeakerIdentifier({
  speakers,
  onUpdate,
  onClose
}: SpeakerIdentifierProps) {
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // Update each speaker
    for (const [oldName, newName] of Object.entries(editedNames)) {
      if (newName.trim() && newName !== oldName) {
        onUpdate(oldName, newName.trim());
      }
    }

    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100vh-4rem)] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <User size={20} className="text-indigo-500" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Identify Speakers
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Help us identify who's speaking in this episode. Your edits will be saved for future reference.
          </p>

          <div className="space-y-4">
            {speakers.map((speaker) => (
              <div
                key={speaker.name}
                className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg flex-shrink-0"
                  style={{ backgroundColor: speaker.color }}
                >
                  {speaker.avatar}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Current: <strong className="text-slate-900 dark:text-slate-100">{speaker.name}</strong>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter actual name..."
                    defaultValue={speaker.realName || ""}
                    onChange={(e) =>
                      setEditedNames({
                        ...editedNames,
                        [speaker.name]: e.target.value
                      })
                    }
                    className="h-10 rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="px-5 bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
