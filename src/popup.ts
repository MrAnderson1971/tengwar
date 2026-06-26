document.addEventListener('DOMContentLoaded', function () {
    const checkbox = document.getElementById('tengwarEnabled') as HTMLInputElement;
    const fontSelect = document.getElementById('tengwarFont') as HTMLSelectElement;

    // Get the current tab to determine the current domain
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs[0]) {
            const url = new URL(tabs[0].url ?? "");
            const domain = url.hostname;

            // Load current settings
            chrome.storage.sync.get(['tengwarEnabledDomains', 'tengwarFont'], (data: {
                    tengwarEnabledDomains?: string[];
                    tengwarFont?: string
                }) => {
                    const enabledDomains = data.tengwarEnabledDomains ?? [];
                    checkbox.checked = enabledDomains.includes(domain);
                    fontSelect.value = data.tengwarFont || 'annatar';
                }
            );

            // Toggle Tengwar conversion on checkbox change
            checkbox.addEventListener('change', () => {
                chrome.storage.sync.get('tengwarEnabledDomains', (data: { tengwarEnabledDomains?: string[] }) => {
                    let enabledDomains = data.tengwarEnabledDomains ?? [];

                    if (checkbox.checked && !enabledDomains.includes(domain)) {
                        // Add current domain to enabled list
                        enabledDomains.push(domain);
                    } else if (!checkbox.checked && enabledDomains.includes(domain)) {
                        // Remove current domain from enabled list
                        enabledDomains = enabledDomains.filter(d => d !== domain);
                    }

                    // Save the updated list
                    chrome.storage.sync.set({tengwarEnabledDomains: enabledDomains})
                        .catch((err: unknown) => console.error(err));

                    // Send message to active tab to update transcription status
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'updateTengwarStatus',
                            enabled: checkbox.checked
                        }).catch((err: unknown) => console.error(err));
                    }
                });
            });
        }
    });

    // Handle font selection change
    fontSelect.addEventListener('change', () => {
        const selectedFont = fontSelect.value;

        // Save the selected font
        chrome.storage.sync.set({tengwarFont: selectedFont})
            .catch((err: unknown) => console.error(err));

        // Send message to active tab to update font
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateTengwarFont',
                    font: selectedFont
                }).catch((err: unknown) => console.error(err));
            }
        });
    });
});
