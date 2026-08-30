<script>
	import { onMount } from "svelte";

	const STORAGE_KEY = "sudoku-studio-progress-v2";
	const PUZZLE_POOL_PER_LEVEL = 150;
	const levels = [
		{
			name: "Beginner",
			subtitle: "A gentle warm-up",
			color: "#8bd3a8",
			clues: 48,
		},
		{
			name: "Easy",
			subtitle: "Build your rhythm",
			color: "#7ec8e3",
			clues: 44,
		},
		{
			name: "Medium",
			subtitle: "Think two moves ahead",
			color: "#a69be8",
			clues: 39,
		},
		{
			name: "Hard",
			subtitle: "For sharp minds",
			color: "#e8a16a",
			clues: 34,
		},
		{
			name: "Expert",
			subtitle: "Deep concentration",
			color: "#e87d8c",
			clues: 30,
		},
		{
			name: "Master",
			subtitle: "The ultimate test",
			color: "#d98be8",
			clues: 27,
		},
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
	let currentSolution = $state(base);
	let completed = $state(
		Array(6)
			.fill(0)
			.map(() => []),
	);
	let selected = $state(null);
	let message = $state("");
	let errors = $state(0);
	let errorCells = $state([]);
	let showHelp = $state(false);
	let hydrated = $state(false);
	let puzzleSeeds = $state({});
	let winPulse = $state(false);
	let losePulse = $state(false);
	let highlightedNumber = $state(null);

	function readSavedState() {
		if (typeof localStorage === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		} catch {
			return {};
		}
	}

	function getPuzzlePool(levelIndex) {
		const saved = readSavedState();
		saved.puzzleSeeds = saved.puzzleSeeds || {};
		if (
			!Array.isArray(saved.puzzleSeeds[levelIndex]) ||
			saved.puzzleSeeds[levelIndex].length !== PUZZLE_POOL_PER_LEVEL
		) {
			saved.puzzleSeeds[levelIndex] = Array.from(
				{ length: PUZZLE_POOL_PER_LEVEL },
				(_, index) => {
					const value =
						(levelIndex + 1) * 131071 +
						index * 8191 +
						Math.floor(Math.random() * 1000000);
					return value >>> 0;
				},
			);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		}
		puzzleSeeds = saved.puzzleSeeds;
		return saved.puzzleSeeds[levelIndex];
	}

	function ensurePuzzleDataset() {
		for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
			getPuzzlePool(levelIndex);
		}
		return puzzleSeeds;
	}

	function getPuzzleSeed(levelIndex, stepIndex) {
		ensurePuzzleDataset();
		const pool = getPuzzlePool(levelIndex);
		const saved = readSavedState();
		saved.puzzleMap = saved.puzzleMap || {};
		const key = `${levelIndex}-${stepIndex}`;
		if (!Number.isInteger(saved.puzzleMap[key])) {
			saved.puzzleMap[key] = Math.floor(Math.random() * pool.length);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		}
		return saved.puzzleMap[key];
	}

	function seededRandom(seed) {
		let value = seed;
		return () => {
			value = (value * 9301 + 49297) % 233280;
			return value / 233280;
		};
	}

	function shuffled(values, random) {
		const result = [...values];
		for (let index = result.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(random() * (index + 1));
			[result[index], result[swapIndex]] = [
				result[swapIndex],
				result[index],
			];
		}
		return result;
	}

	function solutionFor(levelIndex, stepIndex) {
		const pool = getPuzzlePool(levelIndex);
		const seedIndex = getPuzzleSeed(levelIndex, stepIndex);
		const seed = pool[seedIndex] ?? seedIndex + 1000 + levelIndex * 97;
		const random = seededRandom(seed);
		const numbers = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
		const bands = shuffled([0, 1, 2], random);
		const rows = bands.flatMap((band) =>
			shuffled([0, 1, 2], random).map((row) => band * 3 + row),
		);
		const stacks = shuffled([0, 1, 2], random);
		const columns = stacks.flatMap((stack) =>
			shuffled([0, 1, 2], random).map((column) => stack * 3 + column),
		);
		return rows.map((row) =>
			columns.map((column) => numbers[base[row][column] - 1]),
		);
	}

	function puzzleFor(levelIndex, stepIndex) {
		const clueCount = levels[levelIndex].clues;
		const pool = getPuzzlePool(levelIndex);
		const seedIndex = getPuzzleSeed(levelIndex, stepIndex);
		const seed = pool[seedIndex] ?? seedIndex + 1000 + levelIndex * 97;
		const random = seededRandom(seed + 12345);
		const solution = solutionFor(levelIndex, stepIndex);
		const keep = new Set(
			shuffled(
				Array.from({ length: 81 }, (_, index) => index),
				random,
			).slice(0, clueCount),
		);
		return solution.map((row, r) =>
			row.map((value, c) => (keep.has(r * 9 + c) ? value : 0)),
		);
	}

	function loadPuzzle() {
		ensurePuzzleDataset();
		const puzzle = puzzleFor(level, step);
		currentSolution = solutionFor(level, step);
		fixed = puzzle.map((row) => row.map((value) => value !== 0));
		const saved = readSavedState();
		const savedBoard = saved.boards?.[`${level}-${step}`];
		board =
			savedBoard?.length === 9
				? savedBoard
				: puzzle.map((row) => [...row]);
		errors = saved.errors?.[`${level}-${step}`] || 0;
		errorCells = saved.errorCells?.[`${level}-${step}`] || [];
		selected = null;
		message = "";
	}

	function save() {
		const saved = readSavedState();
		saved.completed = completed;
		saved.boards = saved.boards || {};
		saved.boards[`${level}-${step}`] = board;
		saved.errors = saved.errors || {};
		saved.errorCells = saved.errorCells || {};
		saved.errors[`${level}-${step}`] = errors;
		saved.errorCells[`${level}-${step}`] = errorCells;
		saved.level = level;
		saved.step = step;
		saved.puzzleSeeds = puzzleSeeds || {};
		saved.puzzleMap = saved.puzzleMap || {};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	}

	function chooseLevel(index) {
		if (index > 0 && completed[index - 1].length < 5) return;
		level = index;
		step = Math.min(completed[index].length, 4);
		loadPuzzle();
		save();
	}

	function changePuzzle() {
		const saved = readSavedState();
		saved.puzzleMap = saved.puzzleMap || {};
		saved.boards = saved.boards || {};
		saved.errors = saved.errors || {};
		saved.errorCells = saved.errorCells || {};
		const key = `${level}-${step}`;
		const pool = getPuzzlePool(level);
		const currentIndex = Number.isInteger(saved.puzzleMap[key])
			? saved.puzzleMap[key]
			: 0;
		let nextIndex = Math.floor(Math.random() * pool.length);
		while (pool.length > 1 && nextIndex === currentIndex) {
			nextIndex = Math.floor(Math.random() * pool.length);
		}
		delete saved.boards[key];
		delete saved.errors[key];
		delete saved.errorCells[key];
		saved.puzzleMap[key] = nextIndex;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		loadPuzzle();
		save();
	}

	function countNumberOnBoard(number) {
		return board.flat().filter((value) => value === number).length;
	}

	function isBoardSolved() {
		return (
			!board.some((row) => row.includes(0)) &&
			board.every((row, r) =>
				row.every((value, c) => value === currentSolution[r][c]),
			)
		);
	}

	function advanceToNextPuzzle() {
		if (!completed[level].includes(step))
			completed[level] = [...completed[level], step].sort(
				(a, b) => a - b,
			);
		setTimeout(() => {
			winPulse = false;
			if (completed[level].length >= 5 && level < 5) {
				level += 1;
				step = 0;
				loadPuzzle();
			} else if (completed[level].length < 5) {
				step = completed[level].length;
				loadPuzzle();
			}
			save();
		}, 150);
	}

	function selectCell(row, col) {
		selected = { row, col };
		highlightedNumber = board[row][col] || null;
		if (fixed[row][col]) {
			highlightedNumber = board[row][col] || null;
		}
		if (errorCells.includes(`${row}-${col}`)) {
			highlightedNumber = null;
		}
	}

	function enterNumber(number) {
		if (!selected || fixed[selected.row][selected.col]) return;
		if (countNumberOnBoard(number) >= 9 && board[selected.row][selected.col] !== number) {
			return;
		}
		const key = `${selected.row}-${selected.col}`;
		if (
			number !== currentSolution[selected.row][selected.col] &&
			board[selected.row][selected.col] !== number
		) {
			errors += 1;
			errorCells = [...new Set([...errorCells, key])];
			highlightedNumber = null;
			message =
				errors >= 3
					? "Three errors — restarting this puzzle…"
					: `Incorrect number. ${3 - errors} ${3 - errors === 1 ? "life" : "lives"} left.`;
		} else {
			errorCells = errorCells.filter((cell) => cell !== key);
			highlightedNumber = number;
			message = "";
		}
		board[selected.row][selected.col] = number;
		board = board.map((row) => [...row]);
		save();
		if (errors >= 3) {
			losePulse = true;
			window.alert("Three mistakes — this puzzle is restarting.");
			setTimeout(() => {
				losePulse = false;
			}, 600);
			setTimeout(resetPuzzle, 900);
			return;
		}
		if (!board.some((row) => row.includes(0))) {
			checkPuzzle();
		}
	}

	function clearCell() {
		if (!selected || fixed[selected.row][selected.col]) return;
		const key = `${selected.row}-${selected.col}`;
		board[selected.row][selected.col] = 0;
		board = board.map((row) => [...row]);
		errorCells = errorCells.filter((cell) => cell !== key);
		message = "";
		save();
	}

	function resetPuzzle() {
		const puzzle = puzzleFor(level, step);
		board = puzzle.map((row) => [...row]);
		errors = 0;
		errorCells = [];
		message = "Fresh start — you have three new chances.";
		winPulse = false;
		losePulse = false;
		save();
	}

	function checkPuzzle() {
		const wrong = board.some((row, r) =>
			row.some((value, c) => value !== currentSolution[r][c]),
		);
		const incomplete = board.some((row) => row.includes(0));
		if (incomplete) {
			message = "Almost there — fill every square before checking.";
			return;
		}
		if (wrong) {
			message = "Not quite. Check the highlighted clues and try again.";
			return;
		}
		if (!completed[level].includes(step))
			completed[level] = [...completed[level], step].sort(
				(a, b) => a - b,
			);
		message = "Perfect! Puzzle complete.";
		winPulse = true;
		losePulse = false;
		save();
	}

	function handleKey(event) {
		if (event.key >= "1" && event.key <= "9")
			enterNumber(Number(event.key));
		if (
			event.key === "Backspace" ||
			event.key === "Delete" ||
			event.key === "0"
		)
			clearCell();
	}

	onMount(() => {
		const saved = readSavedState();
		if (Array.isArray(saved.completed)) completed = saved.completed;
		level = Math.min(saved.level || 0, 5);
		step = Math.min(saved.step || 0, 4);
		while (level > 0 && completed[level - 1]?.length < 5) level -= 1;
		loadPuzzle();
		hydrated = true;
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	});
</script>

<svelte:head>
	<title>Sudoku Studio — Play offline</title>
	<meta
		name="description"
		content="A focused, local-only Sudoku journey with six levels and thirty puzzles."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if hydrated}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="/" aria-label="Sudoku Studio home">
				<img src="/logo.png" alt="Logo" class="logo">
				<span>Sudoku<span class="muted">Studio</span></span>
			</a>
			<div class="top-actions">
				<span class="saved"
					><span class="dot"></span> Saved locally</span
				>
				<button
					class="icon-button"
					aria-label="How to play"
					onclick={() => (showHelp = true)}>?</button
				>
			</div>
		</header>

		<main>
			<section class="hero">
				<div>
					<p class="eyebrow">YOUR DAILY PRACTICE</p>
					<h1>
						A little clarity,<br /><em>one square at a time.</em>
					</h1>
					<p class="intro">
						Thirty thoughtfully paced puzzles. No accounts, no
						distractions — just you and the grid.
					</p>
				</div>
				<div class="journey-card">
					<div class="journey-head">
						<span>YOUR JOURNEY</span><strong
							>{completed.flat().length}
							<small>/ 30</small></strong
						>
					</div>
					<div class="progress">
						<span
							style={`width: ${(completed.flat().length / 30) * 100}%`}
						></span>
					</div>
					<p>
						{completed.flat().length === 0
							? "Your first puzzle is waiting."
							: `${30 - completed.flat().length} puzzles left to master.`}
					</p>
				</div>
			</section>

			<section class="workspace">
				<aside class="levels">
					<div class="section-label">
						<span>01</span>
						<h2>Choose a level</h2>
					</div>
					<div class="level-list">
						{#each levels as item, index}
							<button
								class:active={level === index}
								class:locked={index > 0 &&
									completed[index - 1].length < 5}
								class="level-row"
								onclick={() => chooseLevel(index)}
								disabled={index > 0 &&
									completed[index - 1].length < 5}
							>
								<span
									class="level-number"
									style={`--level-color: ${item.color}`}
									>{String(index + 1).padStart(2, "0")}</span
								>
								<span class="level-copy"
									><strong>{item.name}</strong><small
										>{item.subtitle}</small
									></span
								>
								<span class="level-status"
									>{#if index > 0 && completed[index - 1].length < 5}🔒{:else}{completed[
											index
										].length}/5{/if}</span
								>
							</button>
						{/each}
					</div>
					<div class="tip">
						<span>✦</span>
						<p>
							<strong>Small steps, big wins.</strong><br
							/>Complete all 5 puzzles to unlock the next level.
						</p>
					</div>
				</aside>

				<section class="game">
					<div class="game-heading">
						<div>
							<p class="eyebrow">
								LEVEL {String(level + 1).padStart(2, "0")} · {levels[
									level
								].name.toUpperCase()}
							</p>
							<h2>Puzzle {step + 1} <span>/ 5</span></h2>
						</div>
						<div
							class="mistakes"
							aria-label={`${errors} of 3 errors`}
						>
							ERRORS <strong>{errors}</strong><span>/ 3</span>
						</div>
						<div class="step-dots" aria-label="Puzzle progress">
							{#each Array(5) as _, index}<span
									class:done={completed[level].includes(
										index,
									)}
									class:current={index === step}
								></span>{/each}
						</div>
					</div>
					<div class:win={winPulse} class:lose={losePulse} class="board-wrap">
						<div
							class="board"
							role="grid"
							aria-label="Sudoku board"
						>
							{#each board as row, r}
								{#each row as value, c}
									<button
										class:fixed={fixed[r][c]}
										class:error={errorCells.includes(
											`${r}-${c}`,
										)}
										class:selected={selected?.row === r &&
											selected?.col === c}
										class:number-match={highlightedNumber !== null &&
											value === highlightedNumber}
										class="cell"										style={`--r: ${r}; --c: ${c}`}										aria-label={`Row ${r + 1}, column ${c + 1}${value ? `, ${value}` : ", empty"}`}
										onclick={() => selectCell(r, c)}
										>{value || ""}</button
									>
								{/each}
							{/each}
						</div>
					</div>
					<div class="controls">
						<br />
						<div class="keypad">
							{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as number}
								<button
									class="number-key"
									class:disabled={countNumberOnBoard(number) >= 9}
									disabled={countNumberOnBoard(number) >= 9}
									onclick={() => {
										if (countNumberOnBoard(number) < 9) {
											highlightedNumber = number;
											enterNumber(number);
										}
									}}
									>{number}</button
								>
							{/each}

							<button class="erase" onclick={clearCell}>Erase</button>
						</div>

						<br /><br />
						<div class="action-row">
							<button class="change-button" onclick={changePuzzle}
								>Cambia sudoku</button
							>
							{#if isBoardSolved()}
								<button class="check-button" onclick={advanceToNextPuzzle}
									>Vai al prossimo sudoku <span>→</span></button
								>
							{:else}
								<button class="check-button" onclick={checkPuzzle}
									>Check solution <span>→</span></button
								>
							{/if}
						</div>
					</div>
					{#if message}<p
							class:success={message.startsWith("Perfect")}
							class="message"
						>
							{message}
						</p>{/if}
					<p class="keyboard-hint">
						Select a square, then use <kbd>1</kbd> – <kbd>9</kbd> on
						your keyboard
					</p>
				</section>
			</section>
		</main>
		<footer>
			<span>Made for quiet moments.</span><span
				>Everything stays on this device <span class="lock">♢</span
				></span
			>
		</footer>
	</div>
{:else}
	<div class="loading">Loading your Sudoku journey…</div>
{/if}

{#if showHelp}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) =>
			event.target === event.currentTarget && (showHelp = false)}
	>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="help-title"
		>
			<button
				class="close"
				aria-label="Close"
				onclick={() => (showHelp = false)}>×</button
			>
			<p class="eyebrow">HOW TO PLAY</p>
			<h2 id="help-title">Solve the grid.</h2>
			<p>
				Fill every row, column, and 3×3 box with the numbers 1 through
				9. Complete five puzzles to unlock the next level. Your progress
				is saved automatically in this browser.
			</p>
			<button class="check-button" onclick={() => (showHelp = false)}
				>Got it <span>→</span></button
			>
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
	:global(button) {
		font: inherit;
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
		font:
			500 17px "DM Mono",
			monospace;
	}
	.muted {
		color: #88a098;
		font-weight: 500;
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
		font:
			500 10px "DM Mono",
			monospace;
		letter-spacing: 0.16em;
	}
	h1,
	h2,
	p {
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
		font:
			500 10px "DM Mono",
			monospace;
		letter-spacing: 0.1em;
	}
	.journey-head strong {
		color: #1c3d32;
		font-size: 18px;
		letter-spacing: -0.06em;
	}
	.journey-head small {
		color: #9aaba5;
		font-size: 10px;
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
		grid-template-columns: 310px minmax(400px, 1fr);
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
		font:
			500 10px "DM Mono",
			monospace;
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
		font:
			500 11px "DM Mono",
			monospace;
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
		font:
			500 11px "DM Mono",
			monospace;
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
	.game {
		max-width: 700px;
	}
	.game-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		margin-bottom: 24px;
	}
	.game-heading h2 {
		margin: 0;
		font-size: 29px;
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
		font:
			500 9px "DM Mono",
			monospace;
		letter-spacing: 0.08em;
	}
	.mistakes strong {
		font-size: 16px;
		margin-left: 6px;
	}
	.mistakes span {
		color: #a3b2ac;
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
	}
	.board-wrap.win {
		animation: winGlow 0.8s ease-in-out 2 alternate;
	}
	.board-wrap.lose {
		animation: loseShake 0.4s ease-in-out 2;
	}
	.board {
		width: min(100%, 620px);
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
		font:
			500 clamp(16px, 2.6vw, 25px) "DM Mono",
			monospace;
		cursor: pointer;
		width: 100%;
		height: auto;
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

	.action-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.keypad {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		width: 100%;
	}
	.number-key,
	.erase {
		width: 52px;
		height: 52px;
		border: 1px solid #d5e1da;
		background: transparent;
		color: #527266;
		border-radius: 6px;
		cursor: pointer;
		font:
			500 12px "DM Mono",
			monospace;
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
		font:
			10px "Manrope",
			sans-serif;
	}
	.change-button {
		border: 1px solid #d7e2d5;
		background: #f3f7f2;
		color: #3c5d50;
		border-radius: 7px;
		padding: 11px 13px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		min-width: 150px;
		height: 42px;
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
		min-width: 150px;
		height: 42px;
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
		font:
			10px "DM Mono",
			monospace;
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
	}
	.logo{
		width: 100px;
		height: 100px;
		border-radius: 9px;
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
		.game {
			width: 100%;
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
		.board-wrap {
			padding: 7px;
		}
		.controls {
			align-items: stretch;
			flex-direction: column;
		}
		.keypad {
			justify-content: center;
		}
		.action-row {
			width: 100%;
		}
		.change-button,
		.check-button {
			width: 100%;
		}
		.game-heading {
			align-items: start;
			flex-wrap: wrap;
			gap: 15px;
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
		.cell:nth-child(3n) {
			border-right-color: #8ca69a;
		}
		footer {
			gap: 15px;
			flex-direction: column;
		}
	}
</style>
