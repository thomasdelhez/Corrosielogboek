import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
  createdAt: number;
  dismissAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly dedupeWindowMs = 1500;
  readonly toasts = signal<ToastMessage[]>([]);

  show(type: ToastType, text: string, durationMs = 4500): void {
    const now = Date.now();
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const existing = this.toasts().find(
      (toast) => toast.type === type && toast.text === trimmedText && now - toast.createdAt <= this.dedupeWindowMs,
    );

    if (existing) {
      const dismissAt = now + durationMs;
      this.toasts.update((items) =>
        items.map((toast) =>
          toast.id === existing.id ? { ...toast, createdAt: now, dismissAt: Math.max(toast.dismissAt, dismissAt) } : toast,
        ),
      );
      this.scheduleDismiss(existing.id, durationMs);
      return;
    }

    const id = this.nextId++;
    this.toasts.update((items) => [...items, { id, type, text: trimmedText, createdAt: now, dismissAt: now + durationMs }]);
    this.scheduleDismiss(id, durationMs);
  }

  success(text: string, durationMs?: number): void {
    this.show('success', text, durationMs);
  }

  error(text: string, durationMs?: number): void {
    this.show('error', text, durationMs);
  }

  info(text: string, durationMs?: number): void {
    this.show('info', text, durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  private scheduleDismiss(id: number, durationMs: number): void {
    if (durationMs <= 0) return;
    setTimeout(() => {
      const toast = this.toasts().find((item) => item.id === id);
      if (!toast) return;
      if (Date.now() >= toast.dismissAt) {
        this.dismiss(id);
      }
    }, durationMs);
  }
}
