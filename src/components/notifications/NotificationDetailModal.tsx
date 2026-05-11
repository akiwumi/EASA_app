"use client";

import { CheckCheck, ExternalLink, X } from "lucide-react";
import type { NotificationRecord as Notification } from "@/components/notifications/notification-record";

interface NotificationDetailModalProps {
  notification: Notification;
  relatedHref?: string | null;
  relatedLabel?: string;
  onClose: () => void;
  onMarkRead: (id: string) => void | Promise<void>;
  onOpenRelated?: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readableType(type: string): string {
  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NotificationDetailModal({
  notification,
  relatedHref,
  relatedLabel = "Open related item",
  onClose,
  onMarkRead,
  onOpenRelated,
}: NotificationDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        className="easa-card flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--easa-color-border)] px-5 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--easa-color-border)] px-2 py-0.5 text-xs font-medium text-[var(--easa-color-text-secondary)]">
                {readableType(notification.type)}
              </span>
              <span className="text-xs text-[var(--easa-color-text-muted)]">
                {formatDateTime(notification.created_at)}
              </span>
              {!notification.read && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--easa-color-accent-blue)]">
                  Unread
                </span>
              )}
            </div>
            <h2 id="notification-detail-title" className="text-lg font-semibold leading-snug">
              {notification.title}
            </h2>
          </div>
          <button
            type="button"
            className="easa-btn secondary shrink-0 p-1.5"
            onClick={onClose}
            aria-label="Close notification details"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {notification.body ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--easa-color-text-secondary)]">
              {notification.body}
            </p>
          ) : (
            <p className="text-sm text-[var(--easa-color-text-muted)]">No additional message details.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--easa-color-border)] px-5 py-4">
          {relatedHref && onOpenRelated && (
            <button type="button" className="easa-btn secondary flex items-center gap-2 text-sm" onClick={onOpenRelated}>
              <ExternalLink size={15} strokeWidth={1.75} />
              {relatedLabel}
            </button>
          )}
          {!notification.read && (
            <button
              type="button"
              className="easa-btn primary flex items-center gap-2 text-sm"
              onClick={() => onMarkRead(notification.id)}
            >
              <CheckCheck size={15} strokeWidth={1.75} />
              Mark as read
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
