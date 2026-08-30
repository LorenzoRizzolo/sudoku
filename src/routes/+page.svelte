<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

	const STORAGE_KEY = "sudoku-studio-progress-v2";

	const levels = [
		{ name: "Beginner", subtitle: "A gentle warm-up", color: "#8bd3a8", clues: 48 },
		{ name: "Easy", subtitle: "Build your rhythm", color: "#7ec8e3", clues: 44 },
		{ name: "Medium", subtitle: "Think two moves ahead", color: "#a69be8", clues: 39 },
		{ name: "Hard", subtitle: "For sharp minds", color: "#e8a16a", clues: 34 },
		{ name: "Expert", subtitle: "Deep concentration", color: "#e87d8c", clues: 30 },
		{ name: "Master", subtitle: "The ultimate test", color: "#d98be8", clues: 27 },
	];

	let level = $state(0);
	let completed = $state(
		Array(6).fill(0).map(() => []),
	);
	let showHelp = $state(false);
	let hydrated = $state(false);

	function readSavedState() {
		if (typeof localStorage === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		} catch {
			return {};
		}
	}

	onMount(() => {
		const saved = readSavedState();
		if (Array.isArray(saved.completed)) {
			completed = saved.completed.map((arr) => (Array.isArray(arr) ? arr : []));
		}
		if (typeof saved.level === "number") {
			level = saved.level;
		}
		hydrated = true;
	});

	function selectLevel(index) {
		level = index;
		const saved = readSavedState();
		saved.level = index;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		goto(`/play?level=${index}`);
	}

	function levelProgress(index) {
		return (completed[index] || []).length;
	}

	function nextLevelUnlocked(index) {
		if (index === 0) return true;
		return levelProgress(index - 1) >= 5;
	}

	let savedAt = $state("");
	let savedTime = $derived(savedAt || "not yet");

	function computeSavedAt() {
		const saved = readSavedState();
		if (saved.lastSaved) {
			const d = new Date(saved.lastSaved);
			savedAt = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
		}
	}

	onMount(() => {
		computeSavedAt();
	});
</script>

{#if hydrated}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="/">
				<img src="/logo.png" alt="Logo" class="logo">
				sudoku studio
			</a>
			<div class="top-actions">
				<span class="saved"><span class="dot"></span>Saved {savedTime}</span>
				<button class="icon-button" aria-label="Help" onclick={() => (showHelp = true)}>?</button>
			</div>
		</header>

		<main>
			<section class="hero">
				<div>
					<p class="eyebrow">SUDOKU STUDIO</p>
					<h1>Every puzzle, <em>your pace.</em></h1>
					<p class="intro">
						Six handcrafted difficulty levels. Puzzles generated on device. Progress saved locally — nothing leaves your browser.
					</p>
				</div>
				<div class="journey-card">
					<div class="journey-head">
						<span>JOURNEY</span>
						<strong>{levels[level].name}</strong>
					</div>
					<div class="progress">
						<span style="width: {Math.min(100, (levelProgress(level) / 5) * 100)}%"></span>
					</div>
					<p>{levelProgress(level)} / 5 puzzles solved</p>
				</div>
			</section>

			<div class="workspace">
				<div class="levels">
					<div class="section-label">
						<span>01</span><h2>Choose difficulty</h2>
					</div>
					<div class="level-list">
						{#each levels as lvl, i}
							<button
								class="level-row"
								class:active={i === level}
								style="--level-color: {lvl.color}"
								disabled={!nextLevelUnlocked(i)}
								onclick={() => selectLevel(i)}
							>
								<span class="level-number">0{i + 1}</span>
								<div class="level-copy">
									<strong>{lvl.name}</strong>
									<small>{lvl.subtitle} · {lvl.clues} clues</small>
								</div>
								<span class="level-status">
									{#if levelProgress(i) >= 5}
										✓ done
									{:else if nextLevelUnlocked(i)}
										{levelProgress(i)}/5
									{:else}
										🔒
									{/if}
								</span>
							</button>
						{/each}
					</div>
					<div class="tip">
						<span>💡</span>
						<p><strong>Pro tip:</strong> Solve 5 puzzles on a level to unlock the next one. Progress is saved automatically.</p>
					</div>
				</div>

				<div class="start-area">
					<div class="section-label">
						<span>02</span><h2>Start playing</h2>
					</div>
					<p class="start-desc">
						You're on <strong>{levels[level].name}</strong>. Solve {5 - levelProgress(level)} more puzzle{5 - levelProgress(level) === 1 ? "" : "s"} to unlock the next level.
					</p>
					<button class="play-button" onclick={() => selectLevel(level)}>
						Play {levels[level].name} <span>→</span>
					</button>
				</div>
			</div>
		</main>

		<footer>
			<span>Made for quiet moments.</span><span>Everything stays on this device <span class="lock">♢</span></span>
		</footer>
	</div>
{:else}
	<div class="loading">Loading your Sudoku journey…</div>
{/if}

{#if showHelp}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && (showHelp = false)}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
			<button class="close" aria-label="Close" onclick={() => (showHelp = false)}>×</button>
			<p class="eyebrow">HOW TO PLAY</p>
			<h2 id="help-title">Solve the grid.</h2>
			<p>
				Fill every row, column, and 3×3 box with the numbers 1 through 9.
				Complete five puzzles to unlock the next level. Your progress is saved automatically in this browser.
			</p>
			<button class="check-button" onclick={() => (showHelp = false)}>Got it <span>→</span></button>
		</div>
	</div>
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		background: #f5f7f5;
		color: #182722;
		font-family: "Manrope", sans-serif;
	}
	:global(button), :global(input) {
		font: inherit;
		outline: none;
	}
	:global(button:focus-visible), :global(input:focus-visible) {
		outline: none;
	}
	.app-shell {
		min-height: 100vh;
		max-width: 1440px;
		margin: auto;
		padding: 0 6vw;
	}
	.topbar {
		height: 192px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #dce5df;
	}
	.brand {
		color: #19342b;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 12px;
		font-weight: 800;
		font-size: 16px;
		letter-spacing: -0.04em;
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: #193e32;
		color: #d7f27b;
		font: 500 17px "DM Mono", monospace;
	}
	.top-actions {
		display: flex;
		align-items: center;
		gap: 20px;
		color: #81958d;
		font-size: 11px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.saved {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.dot {
		width: 7px;
		height: 7px;
		background: #9ecb65;
		border-radius: 50%;
	}
	.icon-button,
	.close {
		border: 1px solid #d4e0d9;
		color: #71877d;
		background: transparent;
		border-radius: 50%;
		width: 28px;
		height: 28px;
		cursor: pointer;
		outline: none;
	}
	main {
		padding: 72px 0 50px;
	}
	.hero {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 30px;
		padding-bottom: 76px;
	}
	.eyebrow {
		margin: 0 0 17px;
		color: #7b9389;
		font: 500 10px "DM Mono", monospace;
		letter-spacing: 0.16em;
	}
	h1, h2, p {
		margin-top: 0;
	}
	h1 {
		font-size: clamp(43px, 5.2vw, 70px);
		line-height: 1.03;
		letter-spacing: -0.07em;
		margin-bottom: 24px;
		font-weight: 700;
	}
	h1 em {
		color: #81a89a;
		font-style: normal;
	}
	.intro {
		max-width: 440px;
		color: #789087;
		font-size: 14px;
		line-height: 1.8;
	}
	.journey-card {
		width: 270px;
		padding: 19px 20px;
		border: 1px solid #dce5df;
		border-radius: 14px;
		background: #fbfcfb;
	}
	.journey-head {
		display: flex;
		justify-content: space-between;
		color: #82968d;
		font: 500 10px "DM Mono", monospace;
		letter-spacing: 0.1em;
	}
	.journey-head strong {
		color: #1c3d32;
		font-size: 18px;
		letter-spacing: -0.06em;
	}
	.progress {
		height: 5px;
		border-radius: 5px;
		background: #e7ede8;
		margin: 16px 0 12px;
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: #a7cf74;
		border-radius: inherit;
		transition: width 0.4s;
	}
	.journey-card p {
		margin: 0;
		color: #9aaba5;
		font-size: 11px;
	}
	.workspace {
		display: grid;
		grid-template-columns: 310px minmax(300px, 1fr);
		gap: clamp(60px, 10vw, 150px);
		align-items: start;
	}
	.section-label {
		display: flex;
		gap: 18px;
		align-items: center;
		margin-bottom: 23px;
	}
	.section-label span {
		color: #a3b2ac;
		font: 500 10px "DM Mono", monospace;
	}
	.section-label h2 {
		margin: 0;
		font-size: 14px;
		letter-spacing: -0.02em;
	}
	.level-list {
		border-top: 1px solid #dce5df;
	}
	.level-row {
		width: 100%;
		padding: 17px 3px;
		display: flex;
		align-items: center;
		gap: 15px;
		border: 0;
		border-bottom: 1px solid #dce5df;
		background: transparent;
		text-align: left;
		cursor: pointer;
		color: inherit;
		transition: 0.2s;
		outline: none;
	}
	.level-row:not(:disabled):hover {
		padding-left: 8px;
	}
	.level-row.active {
		background: #edf4ed;
		padding-left: 10px;
		border-radius: 7px;
	}
	.level-row:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.level-number {
		color: var(--level-color);
		font: 500 11px "DM Mono", monospace;
	}
	.level-copy {
		display: grid;
		gap: 3px;
		flex: 1;
	}
	.level-copy strong {
		font-size: 13px;
		font-weight: 700;
	}
	.level-copy small {
		color: #90a39b;
		font-size: 10px;
	}
	.level-status {
		color: #93a49e;
		font: 500 11px "DM Mono", monospace;
	}
	.tip {
		display: flex;
		gap: 12px;
		margin-top: 31px;
		color: #92a39c;
		font-size: 11px;
		line-height: 1.65;
	}
	.tip span {
		color: #aacd70;
		font-size: 18px;
	}
	.tip p {
		margin: 0;
	}
	.tip strong {
		color: #668075;
	}
	.start-area {
		padding-top: 8px;
	}
	.start-desc {
		color: #789087;
		font-size: 14px;
		line-height: 1.8;
		margin-bottom: 30px;
	}
	.play-button {
		border: 0;
		border-radius: 10px;
		padding: 16px 32px;
		background: #1b4235;
		color: #e0f6ad;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
		outline: none;
	}
	.play-button span {
		margin-left: 14px;
		font-size: 18px;
	}
	.play-button:hover {
		background: #275a48;
	}
	footer {
		display: flex;
		justify-content: space-between;
		padding: 25px 0 32px;
		color: #a3b2ac;
		font-size: 10px;
		border-top: 1px solid #dce5df;
	}
	.lock {
		color: #91bb68;
		font-size: 14px;
	}
	.loading {
		display: grid;
		place-items: center;
		min-height: 100vh;
		color: #789087;
		font-size: 14px;
	}
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 20px;
		background: #17362c66;
		z-index: 2;
	}
	.modal {
		position: relative;
		width: min(420px, 100%);
		padding: 35px;
		border-radius: 15px;
		background: #fbfdfb;
		box-shadow: 0 20px 60px #17362c44;
	}
	.modal h2 {
		margin-bottom: 15px;
		font-size: 30px;
		letter-spacing: -0.06em;
	}
	.modal p:not(.eyebrow) {
		color: #789087;
		font-size: 13px;
		line-height: 1.8;
		margin-bottom: 25px;
	}
	.modal .check-button {
		width: 100%;
		padding: 11px 13px;
		border-radius: 7px;
		background: #1b4235;
		color: #e0f6ad;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		border: 0;
		outline: none;
	}
	.modal .check-button span {
		margin-left: 14px;
		font-size: 16px;
	}
	.close {
		position: absolute;
		top: 17px;
		right: 17px;
		font-size: 18px;
	}
	@media (max-width: 850px) {
		.app-shell {
			padding: 0 5vw;
		}
		.hero {
			align-items: start;
			flex-direction: column;
			padding-bottom: 45px;
		}
		.journey-card {
			width: 100%;
		}
		.workspace {
			grid-template-columns: 1fr;
			gap: 55px;
		}
		.levels {
			max-width: 630px;
			width: 100%;
		}
		.level-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.level-row {
			padding-right: 10px;
		}
		.level-row.active {
			padding-left: 10px;
		}
		.tip {
			display: none;
		}
	}
	@media (max-width: 500px) {
		.topbar {
			height: 150px;
		}
		.saved {
			display: none;
		}
		main {
			padding-top: 44px;
		}
		h1 {
			font-size: 43px;
		}
		.level-list {
			grid-template-columns: 1fr;
		}
		footer {
			gap: 15px;
			flex-direction: column;
		}
	}
</style>
