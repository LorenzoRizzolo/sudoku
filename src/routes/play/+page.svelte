<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

	const STORAGE_KEY = "sudoku-studio-progress-v2";
	const PUZZLE_POOL_PER_LEVEL = 150;
	const MAX_ERRORS = 3;
	const levels = [
		{ name: "Beginner", subtitle: "A gentle warm-up", color: "#8bd3a8", clues: 48 },
		{ name: "Easy", subtitle: "Build your rhythm", color: "#7ec8e3", clues: 44 },
		{ name: "Medium", subtitle: "Think two moves ahead", color: "#a69be8", clues: 39 },
		{ name: "Hard", subtitle: "For sharp minds", color: "#e8a16a", clues: 34 },
		{ name: "Expert", subtitle: "Deep concentration", color: "#e87d8c", clues: 30 },
		{ name: "Master", subtitle: "The ultimate test", color: "#d98be8", clues: 27 },
	];

	const base = [
		[5, 3, 4, 6, 7, 8, 9, 1, 2],
		[6, 7, 2, 1, 9, 5, 3, 4, 8],
		[1, 9, 8, 3, 4, 2, 5, 6, 7],
		[8, 5, 9, 7, 6, 1, 4, 2, 3],
		[4, 2, 6, 8, 5, 3, 7, 9, 1],
		[7, 1, 3, 9, 2, 4, 8, 5, 6],
		[9, 6, 1, 5, 3, 7, 2, 8, 4],
		[2, 8, 7, 4, 1, 9, 6, 3, 5],
		[3, 4, 5, 2, 8, 6, 1, 7, 9],
	];

	let level = $state(0);
	let step = $state(0);
	let board = $state([]);
	let fixed = $state([]);
	let currentSolution = $state([]);
	let completed = $state(Array.from({ length: 6 }, () => []));
	let selected = $state(null);
	let message = $state("");
	let errors = $state(0);
	let errorCells = $state([]);
	let showHelp = $state(false);
	let hydrated = $state(false);
	let winPulse = $state(false);
	let losePulse = $state(false);
	let highlightedNumber = $state(null);

	// ── localStorage helpers ──

	function readSavedState() {
		if (typeof localStorage === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		} catch {
			return {};
		}
	}

	function writeSavedState(patch) {
		const current = readSavedState();
		const merged = { ...current, ...patch };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
	}

	// ── puzzle generation ──

	function seededRandom(seed) {
		let value = seed >>> 0;
		return () => {
			value = (value * 9301 + 49297) % 233280;
			return value / 233280;
		};
	}

	function shuffled(values, random) {
		const result = [...values];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	function ensurePuzzlePool(levelIndex) {
		const saved = readSavedState();
		if (!saved.puzzleSeeds) saved.puzzleSeeds = {};
		if (!Array.isArray(saved.puzzleSeeds[levelIndex]) || saved.puzzleSeeds[levelIndex].length !== PUZZLE_POOL_PER_LEVEL) {
			saved.puzzleSeeds[levelIndex] = Array.from({ length: PUZZLE_POOL_PER_LEVEL }, (_, i) => {
				return (((levelIndex + 1) * 131071 + i * 8191 + Math.floor(Math.random() * 1000000)) >>> 0);
			});
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		}
	}

	function ensurePuzzleMapKey(levelIndex, stepIndex) {
		const saved = readSavedState();
		if (!saved.puzzleMap) saved.puzzleMap = {};
		const key = `${levelIndex}-${stepIndex}`;
		if (!Number.isInteger(saved.puzzleMap[key])) {
			ensurePuzzlePool(levelIndex);
			const pool = saved.puzzleSeeds[levelIndex];
			saved.puzzleMap[key] = Math.floor(Math.random() * pool.length);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		}
	}

	function getPuzzleSeed(levelIndex, stepIndex) {
		ensurePuzzleMapKey(levelIndex, stepIndex);
		const saved = readSavedState();
		const pool = saved.puzzleSeeds[levelIndex];
		const index = saved.puzzleMap[`${levelIndex}-${stepIndex}`];
		return pool[index] ?? (index + 1000 + levelIndex * 97);
	}

	function generateSolution(levelIndex, stepIndex) {
		const seed = getPuzzleSeed(levelIndex, stepIndex);
		const rand = seededRandom(seed);
		const numbers = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rand);
		const bands = shuffled([0, 1, 2], rand);
		const rows = bands.flatMap((b) => shuffled([0, 1, 2], rand).map((r) => b * 3 + r));
		const stacks = shuffled([0, 1, 2], rand);
		const cols = stacks.flatMap((s) => shuffled([0, 1, 2], rand).map((c) => s * 3 + c));
		return rows.map((r) => cols.map((c) => numbers[base[r][c] - 1]));
	}

	function generatePuzzle(levelIndex, stepIndex) {
		const solution = generateSolution(levelIndex, stepIndex);
		const clueCount = levels[levelIndex].clues;
		const seed = getPuzzleSeed(levelIndex, stepIndex) + 12345;
		const rand = seededRandom(seed);
		const keep = new Set(
			shuffled(Array.from({ length: 81 }, (_, i) => i), rand).slice(0, clueCount)
		);
		return solution.map((row, r) => row.map((v, c) => (keep.has(r * 9 + c) ? v : 0)));
	}

	// ── board management ──

	function boardKey() {
		return `${level}-${step}`;
	}

	function loadPuzzle() {
		const puzzle = generatePuzzle(level, step);
		currentSolution = generateSolution(level, step);
		fixed = puzzle.map((row) => row.map((v) => v !== 0));

		const saved = readSavedState();
		const key = boardKey();
		if (saved.boards && Array.isArray(saved.boards[key])) {
			board = saved.boards[key].map((row) => [...row]);
			errors = typeof saved.errors?.[key] === "number" ? saved.errors[key] : 0;
			errorCells = Array.isArray(saved.errorCells?.[key]) ? [...saved.errorCells[key]] : [];
		} else {
			board = puzzle.map((row) => [...row]);
			errors = 0;
			errorCells = [];
		}
		selected = null;
		message = "";
		winPulse = false;
		losePulse = false;
		highlightedNumber = null;
		hydrated = true;
	}

	function persistBoard() {
		const saved = readSavedState();
		if (!saved.boards) saved.boards = {};
		if (!saved.errors) saved.errors = {};
		if (!saved.errorCells) saved.errorCells = {};
		const key = boardKey();
		saved.boards[key] = board.map((row) => [...row]);
		saved.errors[key] = errors;
		saved.errorCells[key] = [...errorCells];
		saved.level = level;
		saved.step = step;
		saved.completed = completed.map((a) => [...a]);
		saved.lastSaved = Date.now();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	}

	function clearBoardState() {
		const saved = readSavedState();
		const key = boardKey();
		if (saved.boards) delete saved.boards[key];
		if (saved.errors) delete saved.errors[key];
		if (saved.errorCells) delete saved.errorCells[key];
		saved.level = level;
		saved.step = step;
		saved.completed = completed.map((a) => [...a]);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	}

	// ── game actions ──

	function countNumberOnBoard(num) {
		return board.flat().filter((v) => v === num).length;
	}

	function selectCell(r, c) {
		selected = { row: r, col: c };
		highlightedNumber = fixed[r][c] ? board[r][c] || null : board[r][c] || null;
		if (errorCells.includes(`${r}-${c}`)) highlightedNumber = null;
	}

	function enterNumber(num) {
		if (!selected || fixed[selected.row][selected.col]) return;
		if (countNumberOnBoard(num) >= 9 && board[selected.row][selected.col] !== num) return;

		const key = `${selected.row}-${selected.col}`;
		const isCorrect = num === currentSolution[selected.row][selected.col];

		if (!isCorrect && board[selected.row][selected.col] !== num) {
			errors++;
			errorCells = [...new Set([...errorCells, key])];
			highlightedNumber = null;
			if (errors >= MAX_ERRORS) {
				message = "Three errors — restarting this puzzle…";
				losePulse = true;
				board[selected.row][selected.col] = num;
				board = board.map((row) => [...row]);
				persistBoard();
				setTimeout(() => { losePulse = false; }, 600);
				setTimeout(() => { resetPuzzle(); }, 900);
				return;
			}
			const lives = MAX_ERRORS - errors;
			message = `Incorrect number. ${lives} ${lives === 1 ? "life" : "lives"} left.`;
		} else {
			errorCells = errorCells.filter((c) => c !== key);
			highlightedNumber = num;
			message = "";
		}

		board[selected.row][selected.col] = num;
		board = board.map((row) => [...row]);
		persistBoard();

		if (!board.some((row) => row.includes(0))) {
			tryAutoComplete();
		}
	}

	function clearCell() {
		if (!selected || fixed[selected.row][selected.col]) return;
		const key = `${selected.row}-${selected.col}`;
		board[selected.row][selected.col] = 0;
		board = board.map((row) => [...row]);
		errorCells = errorCells.filter((c) => c !== key);
		message = "";
		persistBoard();
	}

	function resetPuzzle() {
		const puzzle = generatePuzzle(level, step);
		board = puzzle.map((row) => [...row]);
		errors = 0;
		errorCells = [];
		message = "Fresh start — you have three new chances.";
		winPulse = false;
		losePulse = false;
		selected = null;
		highlightedNumber = null;
		clearBoardState();
	}

	function tryAutoComplete() {
		const wrong = board.some((row, r) =>
			row.some((v, c) => v !== currentSolution[r][c])
		);
		if (wrong) {
			message = "Not quite. Check the highlighted clues and try again.";
			losePulse = true;
			setTimeout(() => { losePulse = false; }, 600);
			return;
		}
		// Puzzle solved!
		if (!completed[level].includes(step)) {
			completed[level] = [...completed[level], step].sort((a, b) => a - b);
		}
		message = "Perfect! Puzzle complete.";
		winPulse = true;
		persistBoard();

		setTimeout(() => {
			advanceToNextPuzzle();
		}, 1200);
	}

	function advanceToNextPuzzle() {
		// Determine next level/step
		if (completed[level].length >= 5 && level < levels.length - 1) {
			level++;
			step = 0;
		} else {
			// Find first uncompleted step for current level
			const done = completed[level] || [];
			step = 0;
			while (step < 5 && done.includes(step)) step++;
			if (step >= 5) step = 0;
		}

		winPulse = false;
		losePulse = false;
		message = "";
		loadPuzzle();
		persistBoard();
	}

	function goToStep(newStep) {
		if (newStep < 0 || newStep > 4) return;
		step = newStep;
		winPulse = false;
		losePulse = false;
		message = "";
		loadPuzzle();
		persistBoard();
	}

	function prevPuzzle() {
		if (step > 0) goToStep(step - 1);
	}

	function nextPuzzle() {
		if (step < 4) goToStep(step + 1);
	}

	function handleKey(e) {
		if (e.key >= "1" && e.key <= "9") enterNumber(Number(e.key));
		if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") clearCell();
	}

	// ── init ──

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const paramLevel = parseInt(params.get("level"), 10);
		const saved = readSavedState();

		// Restore completed state first
		if (Array.isArray(saved.completed)) {
			completed = saved.completed.map((a) => (Array.isArray(a) ? [...a] : []));
		}

		// Determine level
		if (!isNaN(paramLevel) && paramLevel >= 0 && paramLevel < levels.length) {
			level = paramLevel;
		} else {
			level = typeof saved.level === "number" ? Math.min(saved.level, levels.length - 1) : 0;
		}
		// Ensure level is unlocked
		while (level > 0 && (completed[level - 1] || []).length < 5) level--;

		// Determine step: the first uncompleted puzzle (0-4)
		const done = completed[level] || [];
		step = 0;
		while (step < 5 && done.includes(step)) step++;
		if (step >= 5) step = 0;

		loadPuzzle();
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	});

	function backHome() {
		goto("/");
	}
</script>

<svelte:window />

{#if hydrated}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="/">
				<span class="brand-mark">9</span> sudoku studio
			</a>
			<div class="top-actions">
				<button class="icon-button" aria-label="Help" onclick={() => (showHelp = true)}>?</button>
			</div>
		</header>

		<main>
			<div class="game">
				<div class="game-heading">
					<div class="heading-left">
						<h2>
							{levels[level].name}
							<span> · Puzzle #{step + 1}</span>
						</h2>
						<div class="step-nav">
							<button class="step-arrow" onclick={prevPuzzle} disabled={step === 0}>←</button>
							<button class="step-arrow" onclick={nextPuzzle} disabled={step === 4}>→</button>
						</div>
					</div>
					<div class="mistakes">
						Mistakes<span>{errors}</span><strong> / {MAX_ERRORS}</strong>
					</div>
					<div class="step-dots">
						{#each Array(5) as _, i}
							<span
								class:done={(completed[level] || []).includes(i)}
								class:current={i === step}
							></span>
						{/each}
					</div>
				</div>

				<div class="board-wrap" class:win={winPulse} class:lose={losePulse}>
					<div class="board">
						{#each board as row, r}
							{#each row as cell, c}
								<button
									class="cell"
									class:fixed={fixed[r][c]}
									class:error={errorCells.includes(`${r}-${c}`)}
									class:selected={selected && selected.row === r && selected.col === c}
									class:number-match={highlightedNumber && cell !== 0 && cell === highlightedNumber}
									onclick={() => selectCell(r, c)}
								>
									{cell !== 0 ? cell : ""}
								</button>
							{/each}
						{/each}
					</div>
				</div>

				<div class="controls">
					<div class="keypad">
						{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
							<button
								class="number-key"
								class:disabled={countNumberOnBoard(num) >= 9}
								disabled={countNumberOnBoard(num) >= 9}
								onclick={() => enterNumber(num)}
							>
								{num}
							</button>
						{/each}
						<button class="erase" onclick={clearCell}>Erase</button>
					</div>
					<div class="action-row">
						<button class="change-button" onclick={backHome}>
							← Change level
						</button>
						<button class="change-button" onclick={resetPuzzle}>
							Restart
						</button>
					</div>
				</div>

				{#if message}
					<p class="message" class:success={message.startsWith("Perfect") || message.startsWith("Fresh")}>
						{message}
					</p>
				{/if}

				<p class="keyboard-hint">
					<kbd>1-9</kbd> to fill · <kbd>⌫</kbd> to erase
				</p>
			</div>
		</main>

		<footer>
			<span>Made for quiet moments.</span><span>Everything stays on this device <span class="lock">♢</span></span>
		</footer>
	</div>
{:else}
	<div class="loading">Loading your puzzle…</div>
{/if}

{#if showHelp}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && (showHelp = false)}
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
		padding: 40px 16px 50px;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.game {
		width: min(100%, 620px);
		margin: 0 auto;
	}
	.game-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 24px;
		flex-wrap: wrap;
		gap: 12px;
	}
	.game-heading h2 {
		margin: 0;
		font-size: clamp(22px, 4vw, 29px);
		letter-spacing: -0.07em;
	}
	.game-heading h2 span {
		color: #a3b2ac;
		font-size: 14px;
		letter-spacing: 0;
	}
	.mistakes {
		margin-left: auto;
		margin-right: 24px;
		color: #b17b76;
		font: 500 9px "DM Mono", monospace;
		letter-spacing: 0.08em;
	}
	.mistakes strong {
		font-size: 16px;
		margin-left: 6px;
	}
	.mistakes span {
		color: #a3b2ac;
		font-size: 16px;
		margin-left: 10px;
	}
	.heading-left {
		display: flex;
		align-items: flex-end;
		gap: 16px;
	}
	.step-nav {
		display: flex;
		gap: 4px;
		padding-bottom: 3px;
	}
	.step-arrow {
		border: 1px solid #d4e0d9;
		background: transparent;
		color: #71877d;
		border-radius: 6px;
		width: 28px;
		height: 28px;
		cursor: pointer;
		font-size: 14px;
		display: grid;
		place-items: center;
		outline: none;
	}
	.step-arrow:hover:not(:disabled) {
		background: #e8efe8;
	}
	.step-arrow:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.step-dots {
		display: flex;
		gap: 7px;
		padding-bottom: 4px;
	}
	.step-dots span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #dce5df;
	}
	.step-dots span.done {
		background: #a7cf74;
	}
	.step-dots span.current {
		outline: 3px solid #e1edd2;
	}
	.board-wrap {
		padding: 12px;
		background: #fff;
		border: 1px solid #dce5df;
		border-radius: 14px;
		box-shadow: 0 14px 40px #234f3710;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		display: flex;
		justify-content: center;
	}
	.board-wrap.win {
		animation: winGlow 0.8s ease-in-out 2 alternate;
	}
	.board-wrap.lose {
		animation: loseShake 0.4s ease-in-out 2;
	}
	.board {
		width: 100%;
		max-width: 620px;
		aspect-ratio: 1;
		display: grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		border: 2px solid #37594d;
		border-radius: 5px;
		overflow: hidden;
	}
	.cell {
		position: relative;
		display: grid;
		place-items: center;
		padding: 0;
		margin: 0;
		min-width: 0;
		aspect-ratio: 1;
		border: 0;
		border-right: 1px solid #d6e1db;
		border-bottom: 1px solid #d6e1db;
		background: #fbfdfb;
		color: #4e7665;
		line-height: 1;
		font: 500 clamp(14px, 3.5vw, 25px) "DM Mono", monospace;
		cursor: pointer;
		width: 100%;
		height: auto;
		outline: none;
	}
	.cell:nth-child(3n) {
		border-right: 1px solid #8ca69a;
	}
	.cell:nth-child(9n) {
		border-right: 0;
	}
	.cell:nth-child(n + 19):nth-child(-n + 27),
	.cell:nth-child(n + 46):nth-child(-n + 54) {
		border-bottom: 1px solid #8ca69a;
	}
	.cell:nth-last-child(-n + 9) {
		border-bottom: 0;
	}
	.cell.fixed {
		color: #193c31;
		background: #f2f7f2;
		font-weight: 600;
	}
	.cell:not(.fixed):empty::after {
		content: "·";
		color: #c4d2cb;
		font-size: 20px;
	}
	.cell.error {
		color: #bd625b;
		background: #fbe8e5;
		box-shadow: inset 0 0 0 2px #e7a09a;
	}
	.cell.number-match {
		background: #dfeeff !important;
		color: #1d5ec7;
		box-shadow: inset 0 0 0 2px #9fc2ff;
	}
	.cell.selected {
		background: #dcecc6 !important;
		color: #193c31;
	}
	.cell.error.selected {
		background: #f4c7c1 !important;
		color: #963f3a;
	}
	.cell.number-match.selected {
		background: #cfe0ff !important;
		color: #174fb4;
	}
	.cell:hover {
		background: #edf6e8;
	}
	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		margin-top: 24px;
		width: 100%;
	}
	.action-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		flex-wrap: wrap;
		width: 100%;
	}
	.keypad {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		justify-content: center;
		width: 100%;
	}
	.number-key,
	.erase {
		width: clamp(40px, 11vw, 52px);
		height: clamp(40px, 11vw, 52px);
		border: 1px solid #d5e1da;
		background: transparent;
		color: #527266;
		border-radius: 6px;
		cursor: pointer;
		font: 500 12px "DM Mono", monospace;
		outline: none;
	}
	.number-key:hover:not(:disabled) {
		background: #e2eed3;
		border-color: #bcd89b;
	}
	.number-key:disabled,
	.number-key.disabled {
		background: #ecefec;
		border-color: #d2d8d4;
		color: #a6b5af;
		cursor: not-allowed;
	}
	.erase {
		width: auto;
		padding: 0 9px;
		color: #a17f7c;
		font: 10px "Manrope", sans-serif;
	}
	.change-button {
		border: 1px solid #d7e2d5;
		background: #f3f7f2;
		color: #3c5d50;
		border-radius: 7px;
		padding: 11px 16px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		height: 44px;
		flex: 1;
		min-width: 0;
		outline: none;
	}
	.check-button {
		border: 0;
		border-radius: 7px;
		padding: 11px 13px;
		background: #1b4235;
		color: #e0f6ad;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		outline: none;
	}
	.check-button span {
		margin-left: 14px;
		font-size: 16px;
	}
	.check-button:hover {
		background: #275a48;
	}
	.change-button:hover {
		background: #edf3ec;
	}
	.message {
		margin: 17px 0 -3px;
		text-align: center;
		color: #b27670;
		font-size: 12px;
	}
	.message.success {
		color: #709a51;
		animation: winText 0.7s ease-in-out;
	}
	@keyframes winGlow {
		0% { box-shadow: 0 0 0 rgba(121, 170, 88, 0); transform: scale(1); }
		50% { box-shadow: 0 0 0 10px rgba(121, 170, 88, 0.12), 0 20px 50px rgba(121, 170, 88, 0.18); transform: scale(1.01); }
		100% { box-shadow: 0 0 0 rgba(121, 170, 88, 0); transform: scale(1); }
	}
	@keyframes loseShake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-6px); }
		40% { transform: translateX(6px); }
		60% { transform: translateX(-5px); }
		80% { transform: translateX(5px); }
	}
	@keyframes winText {
		0% { transform: scale(0.98); opacity: 0.6; }
		50% { transform: scale(1.04); opacity: 1; }
		100% { transform: scale(1); opacity: 1; }
	}
	.keyboard-hint {
		margin: 19px 0 0;
		color: #a2b0aa;
		text-align: center;
		font-size: 10px;
	}
	.keyboard-hint kbd {
		padding: 2px 5px;
		border: 1px solid #d7e1dc;
		border-radius: 3px;
		font: 10px "DM Mono", monospace;
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
	}
	.close {
		position: absolute;
		top: 17px;
		right: 17px;
		font-size: 18px;
		outline: none;
	}
	@media (max-width: 850px) {
		.app-shell {
			padding: 0 4vw;
		}
		.topbar {
			height: 120px;
			padding: 10px 0;
		}
		main {
			padding: 24px 8px 40px;
		}
		.board-wrap {
			padding: 8px;
		}
		.cell:nth-child(3n) {
			border-right-color: #8ca69a;
		}
	}
	@media (max-width: 500px) {
		.topbar {
			height: 110px;
		}
		main {
			padding: 16px 4px 32px;
		}
		.board-wrap {
			padding: 5px;
			border-radius: 10px;
		}
		.game-heading h2 {
			font-size: 20px;
		}
		.mistakes {
			margin-left: 0;
			margin-right: 0;
			order: 3;
			width: 100%;
		}
		.step-dots {
			margin-left: auto;
		}
		.action-row {
			flex-direction: column;
		}
		footer {
			gap: 15px;
			flex-direction: column;
			padding: 16px 0 24px;
		}
	}
</style>
