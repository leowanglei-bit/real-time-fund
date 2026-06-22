export const isSupabaseConfigured = false;
const noop = () => Promise.resolve({ data: null, error: null });
const ns = { on: () => ns, subscribe: () => {} };
export const supabase = {
  auth: {
    getSession: noop,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOtp: noop,
    signInWithOAuth: noop,
    verifyOtp: noop,
    signOut: noop,
  },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: noop }), in: () => ({}), order: () => ({ data: [] }) }),
    insert: noop,
    upsert: () => ({ select: noop }),
  }),
  rpc: noop,
  functions: { invoke: noop },
  channel: () => ns,
  removeChannel: () => {},
};
