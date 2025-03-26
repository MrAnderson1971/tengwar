document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.getElementById('tengwarEnabled');

    // Load saved state
    chrome.storage.sync.get('tengwarEnabled', function(data) {
        checkbox.checked = data.tengwarEnabled || false;
    });

    // Save state when checkbox changes
    checkbox.addEventListener('change', function() {
        chrome.storage.sync.set({tengwarEnabled: checkbox.checked});

        // Send message to active tab to update transcription status
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateTengwarStatus',
                    enabled: checkbox.checked
                });
            }
        });
    });
});
