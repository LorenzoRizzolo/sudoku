import { browser } from '$app/environment';

let currentUser = $state(null);
let loading = $state(true);
let showAuthModal = $state(false);
let authMode = $state('signin');
let authError = $state('');

export function getAuth() {
  return {
    get user() { return currentUser; },
    get loading() { return loading; },
    get showAuthModal() { return showAuthModal; },
    get authMode() { return authMode; },
    get authError() { return authError; },

    setUser(u) { currentUser = u; },
    setShowAuthModal(v) { showAuthModal = v; },
    setAuthMode(m) { authMode = m; authError = ''; },
    setAuthError(e) { authError = e; },

    async fetchUser() {
      if (!browser) return;
      loading = true;
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        currentUser = data.user;
      } catch {
        currentUser = null;
      } finally {
        loading = false;
      }
    },

    async signup(username, email, password) {
      authError = '';
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        authError = data.error || 'Signup failed';
        return false;
      }
      currentUser = data.user;
      showAuthModal = false;
      return true;
    },

    async signin(username, password) {
      authError = '';
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        authError = data.error || 'Signin failed';
        return false;
      }
      currentUser = data.user;
      showAuthModal = false;
      return true;
    },

    async signout() {
      await fetch('/api/auth/signout', { method: 'POST' });
      currentUser = null;
    },

    async submitSolve(levelIndex, stepIndex, puzzleSeed, timeSeconds, errors) {
      if (!currentUser) return null;
      try {
        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level_index: levelIndex,
            step_index: stepIndex,
            puzzle_seed: puzzleSeed,
            time_seconds: Math.round(timeSeconds),
            errors
          })
        });
        const data = await res.json();
        if (res.ok && data.user) {
          currentUser = data.user;
        }
        return data;
      } catch {
        return null;
      }
    }
  };
}
