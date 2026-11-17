'use client';
import { useEffect } from 'react';
import { markInvoiceViewedAction } from '../actions';

export function MarkViewed({ token }: { token: string }) {
  useEffect(() => {
    void markInvoiceViewedAction(token);
  }, [token]);
  return null;
}
