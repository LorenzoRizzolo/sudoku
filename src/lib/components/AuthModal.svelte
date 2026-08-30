<script>
  import { getContext } from 'svelte';

  let auth = getContext('auth');

  let username = $state('');
  let email = $state('');
  let password = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    if (auth.authMode === 'signin') {
      await auth.signin(username, password);
    } else {
      await auth.signup(username, email, password);
    }
    submitting = false;
  }

  function switchMode() {
    auth.setAuthMode(auth.authMode === 'signin' ? 'signup' : 'signin');
    username = '';
    email = '';
    password = '';
  }
</script>

{#if auth.showAuthModal}
  <button class="backdrop" onclick={() => auth.setShowAuthModal(false)} aria-label="Close auth modal"></button>
  <div class="modal">
    <button class="close" onclick={() => auth.setShowAuthModal(false)}>&times;</button>

    <h2>{auth.authMode === 'signin' ? 'Welcome back' : 'Create account'}</h2>
    <p class="sub">
      {auth.authMode === 'signin'
        ? 'Sign in to track your progress and climb the leaderboard'
        : 'Join to track your solves and compete on the leaderboard'}
    </p>

    {#if auth.authError}
      <p class="error">{auth.authError}</p>
    {/if}

    <form onsubmit={handleSubmit}>
      <label>
        <span>Username</span>
        <input type="text" bind:value={username} required minlength="3" autocomplete="username" />
      </label>

      {#if auth.authMode === 'signup'}
        <label>
          <span>Email</span>
          <input type="email" bind:value={email} required autocomplete="email" />
        </label>
      {/if}

      <label>
        <span>Password</span>
        <input type="password" bind:value={password} required minlength="6" autocomplete={auth.authMode === 'signin' ? 'current-password' : 'new-password'} />
      </label>

      <button type="submit" class="submit" disabled={submitting}>
        {submitting
          ? 'Please wait…'
          : auth.authMode === 'signin' ? 'Sign In' : 'Create Account'}
      </button>
    </form>

    <p class="switch">
      {auth.authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
      <button class="link" onclick={switchMode}>
        {auth.authMode === 'signin' ? 'Sign up' : 'Sign in'}
      </button>
    </p>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: #17362c66;
    z-index: 10;
    border: 0;
    cursor: pointer;
    padding: 0;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(400px, 90vw);
    background: #fbfdfb;
    border-radius: 16px;
    padding: 35px 32px 28px;
    box-shadow: 0 20px 60px #17362c44;
    z-index: 11;
  }
  .close {
    position: absolute;
    top: 12px;
    right: 14px;
    background: 0;
    border: 0;
    font-size: 22px;
    color: #8ba69b;
    cursor: pointer;
    padding: 4px;
  }
  h2 {
    font-size: 28px;
    letter-spacing: -0.04em;
    margin: 0 0 6px;
    color: #1b4235;
  }
  .sub {
    color: #789087;
    font-size: 13px;
    margin: 0 0 22px;
    line-height: 1.5;
  }
  .error {
    background: #fef0ef;
    color: #b0453f;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    margin: 0 0 18px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  label span {
    font-size: 11px;
    color: #5c6f65;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  input {
    padding: 10px 12px;
    border: 1px solid #d5e1da;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: #1b4235;
    background: #f9fbf9;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus {
    border-color: #7eaa8c;
  }
  .submit {
    margin-top: 6px;
    padding: 13px;
    border: 0;
    border-radius: 8px;
    background: #1b4235;
    color: #e0f6ad;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .submit:hover:not(:disabled) {
    background: #275a48;
  }
  .submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .switch {
    margin: 20px 0 0;
    text-align: center;
    color: #789087;
    font-size: 13px;
  }
  .link {
    background: 0;
    border: 0;
    color: #3f785b;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }
</style>
