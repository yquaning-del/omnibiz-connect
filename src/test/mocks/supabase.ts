import { vi } from 'vitest';

export const mockSupabaseFrom = vi.fn();

export const mockSupabaseAuth = {
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  getSession: vi.fn(() =>
    Promise.resolve({ data: { session: null }, error: null })
  ),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));
