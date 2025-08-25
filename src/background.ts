import {transcribeToTengwar} from "./worker";
import OnUpdatedInfo = chrome.tabs.OnUpdatedInfo;
import Tab = chrome.tabs.Tab;
import {ProcessBatchResponse} from "./types";

const wordRegex = /\p{L}+(?:'\p{L}+)*/gu;

interface TengwarEnabledDomains {
    tengwarEnabledDomains: string[];
}

chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.sync.get('tengwarEnabledDomains', function (data: TengwarEnabledDomains) {
        if (data.tengwarEnabledDomains === undefined) {
            chrome.storage.sync.set({tengwarEnabledDomains: []});
        }
    });
});

// Listen for tab updates to inform content scripts about their status
chrome.tabs.onUpdated.addListener(function (tabId: number, changeInfo: OnUpdatedInfo, tab: Tab) {
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
            chrome.storage.sync.get(['tengwarEnabledDomains', 'tengwarFont'], function (data: { tengwarEnabledDomains: string[]; tengwarFont: string; }) {
                const enabledDomains = data.tengwarEnabledDomains || [];
                const isEnabled = enabledDomains.includes(domain);
                const font = data.tengwarFont || 'annatar';

                // Notify the content script
                chrome.tabs.sendMessage(tabId, {
                    action: 'updateTengwarStatus',
                    enabled: isEnabled,
                    font: font
                }).catch(() => {
                });
            });
        } catch (error) {
            console.error('Error processing tab URL:', error);
        }
    }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function (request: { action: string; domain: any; },
                                               sender: any,
                                               sendResponse: (arg0: { enabled: any; }) => void): boolean {
    if (request.action === 'getTengwarStatus') {
        const domain = request.domain;
        chrome.storage.sync.get('tengwarEnabledDomains', function (data: TengwarEnabledDomains) {
            const enabledDomains = data.tengwarEnabledDomains || [];
            const isEnabled = enabledDomains.includes(domain);
            sendResponse({enabled: isEnabled});
        });
        return true; // Required for async sendResponse
    }
    return false;
});

// Add this to background.js if not already present
chrome.runtime.onMessage.addListener((request: { action: string; textBatch: any; },
                                      sender: any,
                                      sendResponse: (response: ProcessBatchResponse) => void): boolean => {
    if (request.action === 'processBatch') {
        const textBatch = request.textBatch;

        if (!textBatch || !Array.isArray(textBatch)) {
            sendResponse({error: 'Invalid batch'});
            return true;
        }

        try {
            // Process each text in the batch
            const results = textBatch.map(text => {
                // Special case for "of the" phrases
                let processedText = text.replace(/\bof\s+the\b/gi, "ofthe");

                const fragments = [];
                let lastIndex = 0;
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

            sendResponse({results: results});
        } catch (error: any) {
            sendResponse({error: error.message});
        }

        return true; // Keep message channel open
    }
    return false;
});
