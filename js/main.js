// main.js - Application entry point

// Import all modules
import { FEEDS } from './constants.js';
import { setStatus } from './utils.js';
import {
    fetchCategory, fetchMarkets, fetchSectors, fetchCommodities,
    fetchEarthquakes, fetchWhaleTransactions,
    fetchGovContracts, fetchAINews, fetchFedBalance, fetchPolymarket,
    fetchLayoffs, fetchSituationNews, fetchIntelFeed, fetchGDELTNews
} from './data.js';
import { renderGlobalMap } from './map.js';
import {
    isPanelEnabled, togglePanel, toggleSettings, applyPanelSettings,
    initPanels, resetPanelOrder
} from './panels.js';
import {
    renderNews, renderMarkets, renderHeatmap, renderCommodities,
    renderPolymarket, renderWhaleWatch,
    renderMainCharacter, renderGovContracts, renderAINews,
    renderMoneyPrinter, renderIntelFeed, renderLayoffs, renderSituation
} from './renderers.js';
import {
    analyzeCorrelations, renderCorrelationEngine,
    analyzeNarratives, renderNarrativeTracker,
    calculateMainCharacter
} from './intelligence.js';
import {
    renderMonitorsList, openMonitorForm, closeMonitorForm,
    selectMonitorColor, saveMonitor, editMonitor, deleteMonitor,
    renderMonitorsPanel
} from './monitors.js';
import { initOnboarding, isFirstVisit } from './onboarding.js';

// Expose functions to window for onclick handlers
window.togglePanel = (id) => togglePanel(id, refreshAll);
window.toggleSettings = () => toggleSettings(renderMonitorsList);
window.resetPanelOrder = resetPanelOrder;
window.openMonitorForm = openMonitorForm;
window.closeMonitorForm = closeMonitorForm;
window.selectMonitorColor = selectMonitorColor;
window.saveMonitor = () => saveMonitor(refreshAll);
window.editMonitor = editMonitor;
window.deleteMonitor = (id) => deleteMonitor(id, refreshAll);

// Mobile menu functions
function getMobileMenuElements() {
    return {
        menu: document.getElementById('mobileMenu'),
        btn: document.getElementById('hamburgerBtn')
    };
}

function toggleMobileMenu() {
    const { menu, btn } = getMobileMenuElements();
    menu?.classList.toggle('open');
    btn?.classList.toggle('active');
}

function closeMobileMenu() {
    const { menu, btn } = getMobileMenuElements();
    menu?.classList.remove('open');
    btn?.classList.remove('active');
}

// Close mobile menu on outside click or resize to desktop
document.addEventListener('click', (e) => {
    const { menu, btn } = getMobileMenuElements();
    const isOpen = menu?.classList.contains('open');
    const clickedOutside = !menu?.contains(e.target) && !btn?.contains(e.target);
    if (isOpen && clickedOutside) closeMobileMenu();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
});

window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// Staged refresh - loads critical data first for faster perceived startup
async function refreshAll() {
    console.log('refreshAll started');
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.disabled = true;
    setStatus('Loading critical...', true);

    let allNews = [];
    let politics = [], tech = [], finance = [], markets = [], sectors = [];
    let gov = [], commodities = [], polymarket = [], fedBalance = { value: 0, change: 0, changePercent: 0, percentOfMax: 0 }, earthquakes = [];

    // STAGE 1: Critical data (news + markets) - loads first
    try {
        const stage1Promise = Promise.allSettled([
            isPanelEnabled('politics') ? fetchCategory(FEEDS.politics) : Promise.resolve([]),
            isPanelEnabled('tech') ? fetchCategory(FEEDS.tech) : Promise.resolve([]),
            isPanelEnabled('finance') ? fetchCategory(FEEDS.finance) : Promise.resolve([]),
            isPanelEnabled('markets') ? fetchMarkets() : Promise.resolve([]),
            isPanelEnabled('heatmap') ? fetchSectors() : Promise.resolve([])
        ]);

        const results = await stage1Promise;
        politics = results[0].status === 'fulfilled' ? results[0].value : [];
        tech = results[1].status === 'fulfilled' ? results[1].value : [];
        finance = results[2].status === 'fulfilled' ? results[2].value : [];
        markets = results[3].status === 'fulfilled' ? results[3].value : [];
        sectors = results[4].status === 'fulfilled' ? results[4].value : [];
    } catch (e) {
        console.error('Stage 1 error:', e);
    }

    // Render Stage 1 immediately
    if (isPanelEnabled('politics')) renderNews(politics, 'politicsPanel', 'politicsCount');
    if (isPanelEnabled('tech')) renderNews(tech, 'techPanel', 'techCount');
    if (isPanelEnabled('finance')) renderNews(finance, 'financePanel', 'financeCount');
    if (isPanelEnabled('markets')) renderMarkets(markets);
    if (isPanelEnabled('heatmap')) renderHeatmap(sectors);

    allNews = [...politics, ...tech, ...finance];
    setStatus('Loading more...', true);

    // STAGE 2: Secondary data
    try {
        const stage2Promise = Promise.allSettled([
            isPanelEnabled('gov') ? fetchCategory(FEEDS.gov) : Promise.resolve([]),
            isPanelEnabled('commodities') ? fetchCommodities() : Promise.resolve([]),
            isPanelEnabled('polymarket') ? fetchPolymarket() : Promise.resolve([]),
            isPanelEnabled('printer') ? fetchFedBalance() : Promise.resolve({ value: 0, change: 0, changePercent: 0, percentOfMax: 0 }),
            isPanelEnabled('map') ? fetchEarthquakes() : Promise.resolve([])
        ]);

        const results = await stage2Promise;
        gov = results[0].status === 'fulfilled' ? results[0].value : [];
        commodities = results[1].status === 'fulfilled' ? results[1].value : [];
        polymarket = results[2].status === 'fulfilled' ? results[2].value : [];
        fedBalance = results[3].status === 'fulfilled' ? results[3].value : { value: 0, change: 0, changePercent: 0, percentOfMax: 0 };
        earthquakes = results[4].status === 'fulfilled' ? results[4].value : [];
    } catch (e) {
        console.error('Stage 2 error:', e);
    }

    if (isPanelEnabled('gov')) {
        renderNews(gov, 'govPanel', 'govCount');
        allNews = [...allNews, ...gov];
    }
    if (isPanelEnabled('commodities')) renderCommodities(commodities);
    if (isPanelEnabled('polymarket')) renderPolymarket(polymarket);
    if (isPanelEnabled('printer')) renderMoneyPrinter(fedBalance);

    // Render map
    if (isPanelEnabled('map')) {
        try {
            await renderGlobalMap();
        } catch (mapError) {
            console.error('Map render error:', mapError);
        }
    }

    // If RSS feeds failed, use GDELT as fallback for analysis panels
    if (allNews.length < 10) {
        try {
            const gdeltNews = await fetchGDELTNews();
            allNews = [...allNews, ...gdeltNews];
            console.log(`Added ${gdeltNews.length} GDELT articles as fallback`);
        } catch (e) {
            console.error('GDELT fallback error:', e);
        }
    }

    if (isPanelEnabled('mainchar')) {
        try {
            const mainCharRankings = calculateMainCharacter(allNews);
            renderMainCharacter(mainCharRankings);
        } catch (e) { console.error('mainchar error:', e); }
    }

    if (isPanelEnabled('correlation')) {
        try {
            const correlations = analyzeCorrelations(allNews);
            renderCorrelationEngine(correlations);
        } catch (e) { console.error('correlation error:', e); }
    }

    if (isPanelEnabled('narrative')) {
        try {
            const narratives = analyzeNarratives(allNews);
            renderNarrativeTracker(narratives);
        } catch (e) { console.error('narrative error:', e); }
    }

    setStatus('Loading extras...', true);

    // STAGE 3: Extra data - lowest priority
    let whales = [], contracts = [], aiNews = [], layoffs = [], venezuelaNews = [], greenlandNews = [], intelFeed = [];
    try {
        const stage3Promise = Promise.allSettled([
            isPanelEnabled('whales') ? fetchWhaleTransactions() : Promise.resolve([]),
            isPanelEnabled('contracts') ? fetchGovContracts() : Promise.resolve([]),
            isPanelEnabled('ai') ? fetchAINews() : Promise.resolve([]),
            isPanelEnabled('layoffs') ? fetchLayoffs() : Promise.resolve([]),
            isPanelEnabled('venezuela') ? fetchSituationNews('venezuela maduro caracas crisis') : Promise.resolve([]),
            isPanelEnabled('greenland') ? fetchSituationNews('greenland denmark trump arctic') : Promise.resolve([]),
            isPanelEnabled('intel') ? fetchIntelFeed() : Promise.resolve([])
        ]);

        const results = await stage3Promise;
        whales = results[0].status === 'fulfilled' ? results[0].value : [];
        contracts = results[1].status === 'fulfilled' ? results[1].value : [];
        aiNews = results[2].status === 'fulfilled' ? results[2].value : [];
        layoffs = results[3].status === 'fulfilled' ? results[3].value : [];
        venezuelaNews = results[4].status === 'fulfilled' ? results[4].value : [];
        greenlandNews = results[5].status === 'fulfilled' ? results[5].value : [];
        intelFeed = results[6].status === 'fulfilled' ? results[6].value : [];
    } catch (e) {
        console.error('Stage 3 error:', e);
    }

    if (isPanelEnabled('whales')) renderWhaleWatch(whales);
    if (isPanelEnabled('contracts')) renderGovContracts(contracts);
    if (isPanelEnabled('ai')) renderAINews(aiNews);
    if (isPanelEnabled('layoffs')) renderLayoffs(layoffs);
    if (isPanelEnabled('intel')) renderIntelFeed(intelFeed);
    if (isPanelEnabled('venezuela')) {
        renderSituation('venezuelaPanel', 'venezuelaStatus', venezuelaNews, {
            title: 'Venezuela Crisis',
            subtitle: 'Political instability & humanitarian situation',
            criticalKeywords: ['invasion', 'military', 'coup', 'violence', 'sanctions', 'arrested']
        });
    }
    if (isPanelEnabled('greenland')) {
        renderSituation('greenlandPanel', 'greenlandStatus', greenlandNews, {
            title: 'Greenland Dispute',
            subtitle: 'US-Denmark tensions over Arctic territory',
            criticalKeywords: ['purchase', 'trump', 'military', 'takeover', 'independence', 'referendum']
        });
    }

    // Render My Monitors panel with all news
    if (isPanelEnabled('monitors')) {
        renderMonitorsPanel(allNews);
    }

    const now = new Date();
    setStatus(`Updated ${now.toLocaleTimeString()}`);

    if (btn) btn.disabled = false;
}

// Expose refreshAll to window
window.refreshAll = refreshAll;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize panels
    initPanels(renderMonitorsList);

    // Initialize onboarding (shows modal on first visit)
    initOnboarding(refreshAll);

    // Only load data if not first visit (onboarding will trigger refreshAll after preset selection)
    if (!isFirstVisit()) {
        refreshAll();
    }

    // Auto-refresh every hour (users can manually refresh anytime)
    setInterval(refreshAll, 60 * 60 * 1000);
});
