import Tab = chrome.tabs.Tab;

document.addEventListener('DOMContentLoaded', function () {
    const checkbox = document.getElementById('tengwarEnabled') as HTMLInputElement;
    const fontSelect = document.getElementById('tengwarFont') as HTMLSelectElement;

    // Get the current tab to determine the current domain
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs: Tab[]) {
        if (tabs[0]) {
            const url = new URL(tabs[0].url ?? "");
            const domain = url.hostname;

            // Load current settings
            chrome.storage.sync.get(['tengwarEnabledDomains', 'tengwarFont'], function (data) {
                const enabledDomains = data.tengwarEnabledDomains || [];
                checkbox.checked = enabledDomains.includes(domain);
                fontSelect.value = data.tengwarFont || 'annatar';
            });

            // Toggle Tengwar conversion on checkbox change
            checkbox.addEventListener('change', function () {
                chrome.storage.sync.get('tengwarEnabledDomains', function (data) {
                    let enabledDomains = data.tengwarEnabledDomains || [];

                    if (checkbox.checked && !enabledDomains.includes(domain)) {
                        // Add current domain to enabled list
                        enabledDomains.push(domain);
                    } else if (!checkbox.checked && enabledDomains.includes(domain)) {
                        // Remove current domain from enabled list
                        enabledDomains = enabledDomains.filter((d: string) => d !== domain);
                    }

                    // Save the updated list
                    chrome.storage.sync.set({tengwarEnabledDomains: enabledDomains});

                    // Send message to active tab to update transcription status
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'updateTengwarStatus',
                            enabled: checkbox.checked
                        });
                    }
                });
            });
        }
    });

    // Handle font selection change
    fontSelect.addEventListener('change', function () {
        const selectedFont = fontSelect.value;

        // Save the selected font
        chrome.storage.sync.set({tengwarFont: selectedFont});

        // Send message to active tab to update font
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateTengwarFont',
                    font: selectedFont
                });
            }
        });
    });
});
