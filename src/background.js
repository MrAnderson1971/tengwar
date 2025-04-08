// Initialize the extension when installed
import {transcribeToTengwar} from "./worker";

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
                // Special case for "of the" phrases
                let processedText = text.replace(/\bof\s+the\b/gi, "ofthe");

                const fragments = [];
                let lastIndex = 0;
                const wordRegex = /\p{L}+/gu;
                let match;

                while ((match = wordRegex.exec(processedText)) !== null) {
                    if (match.index > lastIndex) {
                        fragments.push({
                            text: processedText.substring(lastIndex, match.index),
                            isTengwar: false
                        });
                    }

                    fragments.push({
                        text: transcribeToTengwar(match[0], false),
                        isTengwar: true,
                        original: match[0]
                    });

                    lastIndex = match.index + match[0].length;
                }

                if (lastIndex < processedText.length) {
                    fragments.push({
                        text: processedText.substring(lastIndex),
                        isTengwar: false
                    });
                }

                return fragments;
            });

            sendResponse({ results: results });
        } catch (error) {
            sendResponse({ error: error.message });
        }

        return true; // Keep message channel open
    }
});
