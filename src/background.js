import {getFragmentsFromText} from "./content";

chrome.runtime.onInstalled.addListener(function() {
    // Initialize with an empty array of enabled domains instead of a global flag
    chrome.storage.sync.set({tengwarEnabledDomains: []});
});

// Listen for tab updates to inform content scripts about their status
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // Only run this when the tab has completed loading
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            const url = new URL(tab.url);
            const domain = url.hostname;

            // Skip non-http(s) URLs
            if (!url.protocol.startsWith('http')) {
                return;
            }

            // Get the current enabled domains and check if this domain is enabled
            chrome.storage.sync.get(['tengwarEnabledDomains', 'tengwarFont'], function(data) {
                const enabledDomains = data.tengwarEnabledDomains || [];
                const isEnabled = enabledDomains.includes(domain);
                const font = data.tengwarFont || 'annatar';

                // Notify the content script
                chrome.tabs.sendMessage(tabId, {
                    action: 'updateTengwarStatus',
                    enabled: isEnabled,
                    font: font
                }).catch(() => {
                    // This can fail if the content script isn't ready yet - that's normal
                    console.log('Content script not ready for tab', tabId);
                });
            });
        } catch (error) {
            console.error('Error processing tab URL:', error);
        }
    }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getTengwarStatus') {
        const domain = request.domain;
        chrome.storage.sync.get('tengwarEnabledDomains', function(data) {
            const enabledDomains = data.tengwarEnabledDomains || [];
            const isEnabled = enabledDomains.includes(domain);
            sendResponse({enabled: isEnabled});
        });
        return true; // Required for async sendResponse
    }
});

// Add this to background.js if not already present
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processBatch') {
        const textBatch = request.textBatch;

        if (!textBatch || !Array.isArray(textBatch)) {
            sendResponse({ error: 'Invalid batch' });
            return true;
        }

        try {
            // Process each text in the batch
            const results = textBatch.map(text => {
                return getFragmentsFromText(text);
            });

            sendResponse({ results: results });
        } catch (error) {
            sendResponse({ error: error.message });
        }

        return true; // Keep message channel open
    }
});
