<script>
  import { onMount } from "svelte";
  import { getContext } from "svelte";

  let auth = getContext("auth");
  let data = $state(null);
  let loading = $state(true);

  async function load() {
    loading = true;
    const res = await fetch("/api/stats");
    data = await res.json();
    loading = false;
  }

  onMount(load);

  function formatTime(s) {
    if (s == null) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const LEVEL_COLORS = ["#8bd3a8", "#7ec8e3", "#a69be8", "#e8a16a", "#e87d8c", "#d98be8"];
</script>

<svelte:head><title>Your Stats — Sudoku Studio</title></svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a href="/" class="logo">Sudoku Studio</a>
    <div class="topbar-right">
      {#if auth.user}
        <span class="user-badge">👤 {auth.user.username}</span>
        <span class="points-badge">🏆 {auth.user.total_points}</span>
      {:else}
        <a href="/leaderboard" class="nav-link">Leaderboard</a>
        <button class="signin-btn" onclick={() => auth.setShowAuthModal(true)}>Sign In</button>
      {/if}
    </div>
  </header>

  <main>
    {#if loading}
      <p class="loading-text">Loading stats…</p>
    {:else if !auth.user}
      <div class="signin-wall">
        <h2>Sign in to see your stats</h2>
        <p>Track your progress, view solve history, and climb the leaderboard.</p>
        <button class="submit" onclick={() => auth.setShowAuthModal(true)}>Sign In</button>
      </div>
    {:else}
      <div class="stats-header">
        <div>
          <h1>{auth.user.username}</h1>
          <p class="rank">Global rank <strong>#{data.rank}</strong></p>
        </div>
        <div class="big-stats">
          <div class="big-stat">
            <span class="big-num">{auth.user.total_points}</span>
            <span class="big-label">Points</span>
          </div>
          <div class="big-stat">
            <span class="big-num">{auth.user.games_won}</span>
            <span class="big-label">Solved</span>
          </div>
          <div class="big-stat">
            <span class="big-num">{auth.user.games_played}</span>
            <span class="big-label">Played</span>
          </div>
        </div>
      </div>

      {#if data.stats && data.stats.length > 0}
        <section class="section">
          <h2>By Level</h2>
          <div class="level-stats-grid">
            {#each data.stats as s}
              <div class="level-stat-card" style="border-left: 3px solid {LEVEL_COLORS[s.levelIndex] || '#ccc'}">
                <h3>{s.level}</h3>
                <div class="ls-row"><span>Games</span><strong>{s.games}</strong></div>
                <div class="ls-row"><span>Avg time</span><strong>{formatTime(s.avgTime)}</strong></div>
                <div class="ls-row"><span>Best time</span><strong>{formatTime(s.bestTime)}</strong></div>
                <div class="ls-row"><span>Points</span><strong>{s.totalPoints}</strong></div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if data.recentSolves && data.recentSolves.length > 0}
        <section class="section">
          <h2>Recent Solves</h2>
          <div class="recent-list">
            {#each data.recentSolves as s}
              <div class="recent-row">
                <span class="rlevel" style="color:{LEVEL_COLORS[s.level_index] || '#ccc'}">{s.levelName}</span>
                <span class="rtime">{formatTime(s.time_seconds)}</span>
                <span class="rpoints">+{s.points_earned}pts</span>
                <span class="rdate">{formatDate(s.completed_at)}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </main>
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) { font-family: "Manrope", sans-serif; background: #f7f9f7; color: #1b4235; -webkit-font-smoothing: antialiased; }
  .app-shell { max-width: 900px; margin: 0 auto; padding: 0 3vw; }
  .topbar { display: flex; justify-content: space-between; align-items: center; height: 90px; border-bottom: 1px solid #dce5df; margin-bottom: 40px; }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; text-decoration: none; color: inherit; }
  .user-badge { font-size: 12px; color: #3c5d50; background: #edf6e8; padding: 5px 12px; border-radius: 6px; font-weight: 600; }
  .points-badge { font-size: 12px; color: #1b4235; background: #fef6d8; padding: 5px 12px; border-radius: 6px; font-weight: 700; }
  .signin-btn { border: 1px solid #d7e2d5; background: #f3f7f2; color: #3c5d50; border-radius: 7px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .signin-btn:hover { background: #edf3ec; }
  .nav-link { font-size: 12px; color: #3f785b; text-decoration: none; font-weight: 600; }

  .loading-text { text-align: center; color: #789087; font-size: 14px; padding: 60px 0; }

  .signin-wall { text-align: center; padding: 80px 20px; }
  .signin-wall h2 { font-size: 28px; margin-bottom: 10px; }
  .signin-wall p { color: #789087; margin-bottom: 24px; }
  .submit { padding: 13px 36px; border: 0; border-radius: 8px; background: #1b4235; color: #e0f6ad; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }

  .stats-header { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 24px; margin-bottom: 40px; }
  h1 { font-size: 36px; letter-spacing: -0.04em; margin-bottom: 4px; }
  .rank { color: #789087; font-size: 13px; }
  .big-stats { display: flex; gap: 28px; }
  .big-stat { text-align: center; }
  .big-num { display: block; font-size: 32px; font-weight: 800; letter-spacing: -0.03em; }
  .big-label { display: block; font-size: 11px; color: #a3b2ac; text-transform: uppercase; letter-spacing: 0.06em; }

  .section { margin-bottom: 40px; }
  h2 { font-size: 20px; margin-bottom: 16px; }

  .level-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .level-stat-card { background: #fff; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 8px #17362c06; }
  .level-stat-card h3 { font-size: 13px; margin-bottom: 10px; }
  .ls-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #789087; }
  .ls-row strong { color: #1b4235; }

  .recent-list { background: #fff; border-radius: 14px; box-shadow: 0 2px 16px #17362c08; overflow: hidden; }
  .recent-row { display: flex; align-items: center; padding: 12px 20px; gap: 16px; border-bottom: 1px solid #f0f4ef; font-size: 13px; }
  .recent-row:last-child { border-bottom: 0; }
  .rlevel { font-weight: 600; width: 80px; }
  .rtime { font-family: "DM Mono", monospace; width: 50px; }
  .rpoints { font-weight: 700; color: #c4941e; width: 60px; }
  .rdate { color: #a3b2ac; font-size: 11px; margin-left: auto; }

  @media (max-width: 600px) {
    .stats-header { flex-direction: column; }
    .big-stats { gap: 20px; }
    .recent-row { padding: 10px 14px; gap: 8px; font-size: 12px; }
    .rlevel { width: 60px; }
  }
</style>
