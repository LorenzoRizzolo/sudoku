<script>
  import { onMount } from "svelte";
  import { getContext } from "svelte";
  import { goto } from "$app/navigation";

  let auth = getContext("auth");
  let type = $state("points");
  let rows = $state([]);
  let loading = $state(true);

  async function load() {
    loading = true;
    const res = await fetch(`/api/leaderboard?type=${type}&limit=50`);
    const data = await res.json();
    rows = data.leaderboard || [];
    loading = false;
  }

  onMount(load);

  function formatTime(s) {
    if (s == null) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }
</script>

<svelte:head><title>Leaderboard — Sudoku Studio</title></svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a href="/" class="logo">Sudoku Studio</a>
    <div class="topbar-right">
      {#if auth.user}
        <span class="user-badge">👤 {auth.user.username}</span>
        <span class="points-badge">🏆 {auth.user.total_points}</span>
      {:else}
        <button class="signin-btn" onclick={() => auth.setShowAuthModal(true)}>Sign In</button>
      {/if}
    </div>
  </header>

  <main>
    <div class="heading-row">
      <h1>Leaderboard</h1>
      <div class="tabs">
        <button class:active={type === "points"} onclick={() => { type = "points"; load(); }}>Points</button>
        <button class:active={type === "wins"} onclick={() => { type = "wins"; load(); }}>Wins</button>
        <button class:active={type === "speed"} onclick={() => { type = "speed"; load(); }}>Speed</button>
      </div>
    </div>

    {#if loading}
      <p class="loading-text">Loading…</p>
    {:else if rows.length === 0}
      <p class="empty">No solves yet. Be the first!</p>
    {:else}
      <div class="leaderboard-table">
        <div class="lb-header">
          <span class="col-rank">#</span>
          <span class="col-name">Player</span>
          {#if type === "speed"}
            <span class="col-stat">Best</span>
            <span class="col-stat">Avg</span>
          {/if}
          <span class="col-stat">Points</span>
          <span class="col-stat">Wins</span>
        </div>
        {#each rows as row, i}
          <div class="lb-row" class:me={auth.user && row.id === auth.user.id}>
            <span class="col-rank">{row.rank || i + 1}</span>
            <span class="col-name">{row.username}</span>
            {#if type === "speed"}
              <span class="col-stat">{formatTime(row.best_time)}</span>
              <span class="col-stat">{formatTime(row.avg_time)}</span>
            {/if}
            <span class="col-stat">{row.total_points}</span>
            <span class="col-stat">{row.games_won}</span>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) { font-family: "Manrope", sans-serif; background: #f7f9f7; color: #1b4235; -webkit-font-smoothing: antialiased; }
  .app-shell { max-width: 800px; margin: 0 auto; padding: 0 3vw; }
  .topbar { display: flex; justify-content: space-between; align-items: center; height: 90px; border-bottom: 1px solid #dce5df; margin-bottom: 40px; }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; text-decoration: none; color: inherit; }
  .user-badge { font-size: 12px; color: #3c5d50; background: #edf6e8; padding: 5px 12px; border-radius: 6px; font-weight: 600; }
  .points-badge { font-size: 12px; color: #1b4235; background: #fef6d8; padding: 5px 12px; border-radius: 6px; font-weight: 700; }
  .signin-btn { border: 1px solid #d7e2d5; background: #f3f7f2; color: #3c5d50; border-radius: 7px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .signin-btn:hover { background: #edf3ec; }

  .heading-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
  h1 { font-size: 36px; letter-spacing: -0.04em; }
  .tabs { display: flex; gap: 4px; }
  .tabs button { padding: 8px 18px; border: 1px solid #d5e1da; background: transparent; border-radius: 8px; font: 12px "Manrope", sans-serif; font-weight: 600; color: #527266; cursor: pointer; }
  .tabs button.active { background: #1b4235; color: #e0f6ad; border-color: #1b4235; }

  .loading-text, .empty { text-align: center; color: #789087; font-size: 14px; padding: 60px 0; }

  .leaderboard-table { background: #fff; border-radius: 14px; box-shadow: 0 2px 16px #17362c08; overflow: hidden; }
  .lb-header, .lb-row { display: flex; align-items: center; padding: 12px 20px; gap: 12px; }
  .lb-header { border-bottom: 1px solid #dce5df; font-size: 11px; font-weight: 700; color: #a3b2ac; text-transform: uppercase; letter-spacing: 0.04em; }
  .lb-row { border-bottom: 1px solid #f0f4ef; font-size: 13px; }
  .lb-row:last-child { border-bottom: 0; }
  .lb-row.me { background: #edf6e8; }
  .col-rank { width: 36px; font-weight: 700; color: #a3b2ac; text-align: center; }
  .lb-row:nth-child(2) .col-rank { color: #c4941e; }
  .lb-row:nth-child(3) .col-rank { color: #8ba69b; }
  .lb-row:nth-child(4) .col-rank { color: #b27670; }
  .col-name { flex: 1; font-weight: 600; }
  .col-stat { width: 70px; text-align: right; font-family: "DM Mono", monospace; font-size: 12px; }

  @media (max-width: 500px) {
    .lb-header, .lb-row { padding: 10px 12px; gap: 6px; }
    .col-stat { width: 55px; font-size: 11px; }
  }
</style>
