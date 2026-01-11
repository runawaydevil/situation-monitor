<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Dashboard } from '$lib/components/layout';
	import { SettingsModal, MonitorFormModal } from '$lib/components/modals';
	import {
		NewsPanel,
		MarketsPanel,
		HeatmapPanel,
		CommoditiesPanel,
		CryptoPanel,
		MainCharPanel,
		CorrelationPanel,
		NarrativePanel,
		MonitorsPanel,
		MapPanel,
		WhalePanel,
		PolymarketPanel,
		ContractsPanel,
		LayoffsPanel,
		IntelPanel,
		SituationPanel
	} from '$lib/components/panels';
	import {
		news,
		politicsNews,
		techNews,
		financeNews,
		govNews,
		aiNews,
		intelNews,
		markets,
		monitors,
		settings,
		refresh
	} from '$lib/stores';
	import {
		fetchAllNews,
		fetchAllMarkets,
		fetchPolymarket,
		fetchWhaleTransactions,
		fetchGovContracts,
		fetchLayoffs
	} from '$lib/api';
	import type { Prediction, WhaleTransaction, Contract, Layoff } from '$lib/api';
	import type { CustomMonitor } from '$lib/types';

	// Modal state
	let settingsOpen = $state(false);
	let monitorFormOpen = $state(false);
	let editingMonitor = $state<CustomMonitor | null>(null);

	// Misc panel data
	let predictions = $state<Prediction[]>([]);
	let whales = $state<WhaleTransaction[]>([]);
	let contracts = $state<Contract[]>([]);
	let layoffs = $state<Layoff[]>([]);

	// Derived data for panels that need aggregated news
	const allNewsItems = $derived([
		...$politicsNews.items,
		...$techNews.items,
		...$financeNews.items,
		...$govNews.items,
		...$aiNews.items,
		...$intelNews.items
	]);

	// Data fetching
	async function loadNews() {
		// Set loading for all categories
		const categories = ['politics', 'tech', 'finance', 'gov', 'ai', 'intel'] as const;
		categories.forEach((cat) => news.setLoading(cat, true));

		try {
			const data = await fetchAllNews();
			Object.entries(data).forEach(([category, items]) => {
				news.setItems(category as keyof typeof data, items);
			});
		} catch (error) {
			categories.forEach((cat) => news.setError(cat, String(error)));
		}
	}

	async function loadMarkets() {
		try {
			const data = await fetchAllMarkets();
			markets.setIndices(data.indices);
			markets.setSectors(data.sectors);
			markets.setCommodities(data.commodities);
			markets.setCrypto(data.crypto);
		} catch (error) {
			console.error('Failed to load markets:', error);
		}
	}

	async function loadMiscData() {
		try {
			const [predictionsData, whalesData, contractsData, layoffsData] = await Promise.all([
				fetchPolymarket(),
				fetchWhaleTransactions(),
				fetchGovContracts(),
				fetchLayoffs()
			]);
			predictions = predictionsData;
			whales = whalesData;
			contracts = contractsData;
			layoffs = layoffsData;
		} catch (error) {
			console.error('Failed to load misc data:', error);
		}
	}

	// Refresh handlers
	async function handleRefresh() {
		refresh.startRefresh();
		try {
			await Promise.all([loadNews(), loadMarkets()]);
			refresh.endRefresh();
		} catch (error) {
			refresh.endRefresh([String(error)]);
		}
	}

	// Monitor handlers
	function handleCreateMonitor() {
		editingMonitor = null;
		monitorFormOpen = true;
	}

	function handleEditMonitor(monitor: CustomMonitor) {
		editingMonitor = monitor;
		monitorFormOpen = true;
	}

	function handleDeleteMonitor(id: string) {
		monitors.deleteMonitor(id);
	}

	function handleToggleMonitor(id: string) {
		monitors.toggleMonitor(id);
	}

	// Get panel visibility
	const isPanelVisible = (id: string) => $settings.enabled[id as keyof typeof $settings.enabled] !== false;

	// Initial load
	onMount(() => {
		loadNews();
		loadMarkets();
		loadMiscData();
		refresh.setupAutoRefresh(handleRefresh);

		return () => {
			refresh.stopAutoRefresh();
		};
	});
</script>

<svelte:head>
	<title>Situation Monitor</title>
	<meta name="description" content="Real-time global situation monitoring dashboard" />
</svelte:head>

<div class="app">
	<Header
		onRefresh={handleRefresh}
		onSettingsClick={() => (settingsOpen = true)}
	/>

	<main class="main-content">
		<Dashboard>
			<!-- Map Panel - Full width -->
			{#if isPanelVisible('map')}
				<div class="panel-slot map-slot">
					<MapPanel monitors={$monitors.monitors} />
				</div>
			{/if}

			<!-- News Panels -->
			{#if isPanelVisible('politics')}
				<div class="panel-slot">
					<NewsPanel category="politics" panelId="politics" title="Politics" />
				</div>
			{/if}

			{#if isPanelVisible('tech')}
				<div class="panel-slot">
					<NewsPanel category="tech" panelId="tech" title="Tech" />
				</div>
			{/if}

			{#if isPanelVisible('finance')}
				<div class="panel-slot">
					<NewsPanel category="finance" panelId="finance" title="Finance" />
				</div>
			{/if}

			{#if isPanelVisible('gov')}
				<div class="panel-slot">
					<NewsPanel category="gov" panelId="gov" title="Government" />
				</div>
			{/if}

			{#if isPanelVisible('ai')}
				<div class="panel-slot">
					<NewsPanel category="ai" panelId="ai" title="AI" />
				</div>
			{/if}

			<!-- Markets Panels -->
			{#if isPanelVisible('markets')}
				<div class="panel-slot">
					<MarketsPanel />
				</div>
			{/if}

			{#if isPanelVisible('heatmap')}
				<div class="panel-slot">
					<HeatmapPanel />
				</div>
			{/if}

			{#if isPanelVisible('commodities')}
				<div class="panel-slot">
					<CommoditiesPanel />
				</div>
			{/if}

			{#if isPanelVisible('crypto')}
				<div class="panel-slot">
					<CryptoPanel />
				</div>
			{/if}

			<!-- Analysis Panels -->
			{#if isPanelVisible('mainchar')}
				<div class="panel-slot">
					<MainCharPanel />
				</div>
			{/if}

			{#if isPanelVisible('correlation')}
				<div class="panel-slot">
					<CorrelationPanel news={allNewsItems} />
				</div>
			{/if}

			{#if isPanelVisible('narrative')}
				<div class="panel-slot">
					<NarrativePanel news={allNewsItems} />
				</div>
			{/if}

			<!-- Custom Monitors -->
			{#if isPanelVisible('monitors')}
				<div class="panel-slot">
					<MonitorsPanel
						monitors={$monitors.monitors}
						matches={$monitors.matches}
						onCreateMonitor={handleCreateMonitor}
						onEditMonitor={handleEditMonitor}
						onDeleteMonitor={handleDeleteMonitor}
						onToggleMonitor={handleToggleMonitor}
					/>
				</div>
			{/if}

			<!-- Intel Panel -->
			{#if isPanelVisible('intel')}
				<div class="panel-slot">
					<IntelPanel />
				</div>
			{/if}

			<!-- Situation Panels -->
			{#if isPanelVisible('venezuela')}
				<div class="panel-slot">
					<SituationPanel
						panelId="venezuela"
						config={{
							title: 'Venezuela Watch',
							subtitle: 'Humanitarian crisis monitoring',
							criticalKeywords: ['maduro', 'caracas', 'venezuela', 'guaido']
						}}
						news={allNewsItems.filter(
							(n) =>
								n.title.toLowerCase().includes('venezuela') ||
								n.title.toLowerCase().includes('maduro')
						)}
					/>
				</div>
			{/if}

			{#if isPanelVisible('greenland')}
				<div class="panel-slot">
					<SituationPanel
						panelId="greenland"
						config={{
							title: 'Greenland Watch',
							subtitle: 'Arctic geopolitics monitoring',
							criticalKeywords: ['greenland', 'arctic', 'nuuk', 'denmark']
						}}
						news={allNewsItems.filter(
							(n) =>
								n.title.toLowerCase().includes('greenland') ||
								n.title.toLowerCase().includes('arctic')
						)}
					/>
				</div>
			{/if}

		{#if isPanelVisible('iran')}
			<div class="panel-slot">
				<SituationPanel
					panelId="iran"
					config={{
						title: 'Iran Crisis',
						subtitle: 'Revolution protests, regime instability & nuclear program',
						criticalKeywords: ['protest', 'uprising', 'revolution', 'crackdown', 'killed', 'nuclear', 'strike', 'attack', 'irgc', 'khamenei']
					}}
					news={allNewsItems.filter(
						(n) =>
							n.title.toLowerCase().includes('iran') ||
							n.title.toLowerCase().includes('tehran') ||
							n.title.toLowerCase().includes('irgc')
					)}
				/>
			</div>
		{/if}

			<!-- Placeholder panels for additional data sources -->
			{#if isPanelVisible('whales')}
				<div class="panel-slot">
					<WhalePanel {whales} />
				</div>
			{/if}

			{#if isPanelVisible('polymarket')}
				<div class="panel-slot">
					<PolymarketPanel {predictions} />
				</div>
			{/if}

			{#if isPanelVisible('contracts')}
				<div class="panel-slot">
					<ContractsPanel {contracts} />
				</div>
			{/if}

			{#if isPanelVisible('layoffs')}
				<div class="panel-slot">
					<LayoffsPanel {layoffs} />
				</div>
			{/if}
		</Dashboard>
	</main>

	<!-- Modals -->
	<SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />
	<MonitorFormModal
		open={monitorFormOpen}
		onClose={() => (monitorFormOpen = false)}
		editMonitor={editingMonitor}
	/>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	.main-content {
		flex: 1;
		padding: 0.5rem;
		overflow-y: auto;
	}

	.panel-slot {
		min-height: 200px;
	}

	.map-slot {
		grid-column: 1 / -1;
		min-height: 300px;
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 0.25rem;
		}
	}
</style>
