// onboarding.js - First-visit onboarding experience

import { PRESETS, PANELS } from './constants.js';
import { savePanelSettings, applyPanelSettings } from './panels.js';

const STORAGE_KEY = 'onboardingComplete';
const PRESET_KEY = 'selectedPreset';

/**
 * Check if this is the user's first visit
 */
export function isFirstVisit() {
    return !localStorage.getItem(STORAGE_KEY);
}

/**
 * Get the currently selected preset
 */
export function getSelectedPreset() {
    return localStorage.getItem(PRESET_KEY) || null;
}

/**
 * Show the onboarding modal
 */
export function showOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide the onboarding modal
 */
export function hideOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/**
 * Apply a preset configuration
 */
export function selectPreset(presetId, refreshCallback) {
    const preset = PRESETS[presetId];
    if (!preset) {
        console.error('Unknown preset:', presetId);
        return;
    }

    // Build panel settings - disable all panels first, then enable preset panels
    const settings = {};
    Object.keys(PANELS).forEach(panelId => {
        settings[panelId] = preset.panels.includes(panelId);
    });

    // Save settings
    savePanelSettings(settings);
    localStorage.setItem(PRESET_KEY, presetId);
    localStorage.setItem(STORAGE_KEY, 'true');

    // Apply and refresh
    applyPanelSettings();
    hideOnboarding();

    if (refreshCallback) {
        refreshCallback();
    }
}

/**
 * Reset onboarding to show modal again
 */
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PRESET_KEY);
    showOnboarding();
}

/**
 * Render preset cards into the onboarding modal
 */
export function renderOnboardingCards() {
    const container = document.getElementById('presetCards');
    if (!container) return;

    const presetOrder = ['news-junkie', 'trader', 'geopolitics', 'intel', 'minimal', 'everything'];

    container.innerHTML = presetOrder.map(id => {
        const preset = PRESETS[id];
        return `
            <div class="preset-card" onclick="selectPreset('${id}')">
                <div class="preset-icon">${preset.icon}</div>
                <div class="preset-name">${preset.name}</div>
                <div class="preset-description">${preset.description}</div>
                <div class="preset-panel-count">${preset.panels.length} panels</div>
            </div>
        `;
    }).join('');
}

/**
 * Initialize onboarding - call on DOMContentLoaded
 */
export function initOnboarding(refreshCallback) {
    // Render preset cards
    renderOnboardingCards();

    // Expose selectPreset to window for onclick handlers
    window.selectPreset = (presetId) => selectPreset(presetId, refreshCallback);
    window.resetOnboarding = resetOnboarding;

    // Show modal if first visit
    if (isFirstVisit()) {
        showOnboarding();
    }
}
