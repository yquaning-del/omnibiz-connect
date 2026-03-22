import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import '../mocks/supabase';
import { mockSupabaseAuth } from '../mocks/supabase';

function AuthConsumer({ onValue }: { onValue: (v: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onValue(auth);
  return null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: no session
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('starts in loading state before getSession resolves', () => {
    // Make getSession hang to observe the loading state
    mockSupabaseAuth.getSession.mockReturnValue(new Promise(() => {}));
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    expect(captured?.loading).toBe(true);
  });

  it('sets loading to false after no session found', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.user).toBeNull();
  });

  it('user is null when no session exists', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.user).toBeNull();
    expect(captured?.session).toBeNull();
  });

  it('hasRole returns false when roles array is empty', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.hasRole('org_admin')).toBe(false);
    expect(captured?.hasRole('super_admin')).toBe(false);
    expect(captured?.hasRole('staff')).toBe(false);
  });

  it('isSuperAdmin is false when user has no roles', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.isSuperAdmin).toBe(false);
  });

  it('isOrgAdmin is false when user has no roles', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.isOrgAdmin).toBe(false);
  });

  it('organizations and locations start as empty arrays', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => { captured = v; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured?.organizations).toEqual([]);
    expect(captured?.locations).toEqual([]);
  });
});
