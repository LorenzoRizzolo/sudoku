<script>
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/logo.ico" />
	<link rel="manifest" href="/manifest.json">
</svelte:head>

{@render children()}
