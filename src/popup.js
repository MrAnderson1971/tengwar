document.addEventListener('DOMContentLoaded', function () {
    const checkbox = document.getElementById('tengwarEnabled');
    const fontSelect = document.getElementById('tengwarFont');

    chrome.storage.sync.get(['tengwarEnabled', 'tengwarFont'], function (data) {
        checkbox.checked = data.tengwarEnabled || false;
        fontSelect.value = data.tengwarFont;
    });

    // Toggle Tengwar conversion on checkbox change
    checkbox.addEventListener('change', function () {
        chrome.storage.sync.set({tengwarEnabled: checkbox.checked});

        // Send message to active tab to update transcription status
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateTengwarStatus',
                    enabled: checkbox.checked
                });
            }
        });
    });

    // Handle font selection change
    fontSelect.addEventListener('change', function () {
        const selectedFont = fontSelect.value;

        // Save the selected font
        chrome.storage.sync.set({tengwarFont: selectedFont});

        // Send message to active tab to update font
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateTengwarFont',
                    font: selectedFont
                });
            }
        });
    });
});
