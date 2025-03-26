// Initialize the extension when installed
chrome.runtime.onInstalled.addListener(function() {
    // Initialize the tengwarEnabled setting to false
    chrome.storage.sync.set({tengwarEnabled: false});
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getTengwarStatus') {
        chrome.storage.sync.get('tengwarEnabled', function(data) {
            sendResponse({enabled: data.tengwarEnabled || false});
        });
        return true; // Required for async sendResponse
    }
});
