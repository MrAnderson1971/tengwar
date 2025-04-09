// Track if Tengwar is currently enabled
let tengwarEnabled = false;
let fontInjected = false;
let currentFont = 'annatar';

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function (request) {
    // --- THIS LISTENER REMAINS LARGELY THE SAME ---
    // It handles messages *after* initialization or user interaction
    if (request.action === 'updateTengwarStatus') {
        // Status update FROM background/popup (e.g., tab update or popup interaction)
        const shouldBeEnabled = request.enabled;
        const newFont = request.font || currentFont; // Use font from message or current

        if (shouldBeEnabled && !tengwarEnabled) {
            // Enable transcription
            tengwarEnabled = true;
            currentFont = newFont;
            injectTengwarFont(currentFont); // Ensure font is injected/updated
            processPage(); // Process now that it's enabled
        } else if (!shouldBeEnabled && tengwarEnabled) {
            // Disable transcription - reload to revert simply
            disableTengwar();
        } else if (shouldBeEnabled && tengwarEnabled && newFont !== currentFont) {
            // Already enabled, but font changed via background message
            updateTengwarFont(newFont);
        } else if (shouldBeEnabled && tengwarEnabled) {
            // If it's already enabled and status update confirms enabled,
            // ensure observer is running (might be needed if navigation happened weirdly)
            setupMutationObserver();
        }
        // If shouldBeEnabled === tengwarEnabled and font is the same, do nothing.
    } else if (request.action === 'updateTengwarFont') {
        // Font update specifically FROM popup
        const newFont = request.font || 'annatar';
        if (tengwarEnabled) { // Only apply if currently enabled
            updateTengwarFont(newFont);
        } else {
            // Store font preference even if not enabled now,
            // so it's used if enabled later.
            currentFont = newFont;
            // Update the font definition even if not processing,
            // so it's ready if activated.
            if (fontInjected) {
                updateTengwarFont(newFont); // Update the @font-face rule
            }
        }
    }
});

function updateTengwarFont(fontName) {
    // Make sure font is valid
    if (!fontName || (fontName !== 'annatar' && fontName !== 'parmaite')) {
        fontName = 'annatar'; // Default to Annatar if invalid
    }

    currentFont = fontName;
    const styleEl = document.getElementById('tengwar-font-style');

    if (styleEl) {
        // Update the existing style element
        styleEl.textContent = `
    @font-face {
      font-family: 'TengwarFont';
      src: url('${chrome.runtime.getURL(fontName + '.ttf')}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    .tengwar-text {
      font-family: 'TengwarFont', serif !important;
    }
  `;
    } else {
        // If style doesn't exist yet, call injectTengwarFont() which will
        // now use the current font setting
        injectTengwarFont(fontName);
    }

    // If Tengwar is enabled, re-process the page with the new font
    if (tengwarEnabled) {
        processPage();
    }
}

// Modify your existing injectTengwarFont function to accept a font parameter
function injectTengwarFont(fontName) {
    if (fontInjected) {
        return;
    }

    // If no font name is provided, get it from storage
    if (!fontName) {
        chrome.storage.sync.get('tengwarFont', function (data) {
            const font = data.tengwarFont || 'annatar';
            injectTengwarFont(font);
        });
        return;
    }

    const style = document.createElement('style');
    style.id = 'tengwar-font-style';
    style.textContent = `
    @font-face {
      font-family: 'TengwarFont';
      src: url('${chrome.runtime.getURL(fontName + '.ttf')}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    .tengwar-text {
      font-family: 'TengwarFont', serif !important;
    }
  `;
    document.head.appendChild(style);
    fontInjected = true;
}

// Main function to process the page
function processPage() {
    if (!tengwarEnabled) {
        return;
    }

    injectTengwarFont(currentFont);
    // Process initial content
    processContent(document.body);

    // Set up a MutationObserver to handle dynamic content
    setupMutationObserver();
}

/**
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isElementVisible(element) {
    if (!element) {
        return false;
    }

    // Get computed style
    const style = window.getComputedStyle(element);

    // Check basic visibility properties
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
    }

    // Check for zero dimensions (often indicates hidden elements)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return false;
    }

    // Check aria-hidden attribute
    if (element.getAttribute('aria-hidden') === 'true') {
        return false;
    }

    // Check for hidden attribute
    return !element.hasAttribute('hidden');
}

// Process content within a container element
function processContent(container) {
    if (!container || isElementToSkip(container)) {
        return;
    }

    const textNodes = [];
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (!node.nodeValue.trim() || isElementToSkip(node.parentElement)) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Add visibility check for the parent
                if (!isElementVisible(node.parentElement)) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    textNodes.forEach(processTextNode);
}

/** Function to determine if an element should be skipped
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isElementToSkip(element) {
    if (!element) {
        return true;
    }

    // Skip if already processed or in skip list
    if (element.classList && (
        element.classList.contains('tengwar-text') ||
        element.classList.contains('tengwar-skip'))) {
        return true;
    }

    // Skip if parent already processed
    if (element.parentElement && element.parentElement.classList &&
        element.parentElement.classList.contains('tengwar-text')) {
        return true;
    }

    // Skip certain tag types
    const skipTags = ['script', 'style', 'noscript', 'iframe', 'canvas', 'svg',
        'math', 'code', 'pre', 'textarea', 'input', 'select', 'option'];
    if (element.tagName && skipTags.includes(element.tagName.toLowerCase())) {
        return true;
    }

    // Skip editable content
    return element.isContentEditable || element.contentEditable === 'true';
}

const tengwarNodeQueue = [];
let tengwarProcessingActive = false;
let tengwarProcessingIndex = 0;
let tengwarProcessedCount = 0;

// Time limits for processing batches
const TENGWAR_MAX_PROCESSING_TIME = 50; // ms before yielding to UI thread
const TENGWAR_UI_REFRESH_DELAY = 16; // ms pause for UI refresh (1 frame @60fps)

/** Process a text node
 *
 * @param {Text} textNode
 */
function processTextNode(textNode) {
    if (!textNode || !textNode.nodeValue || !textNode.parentNode) {
        return;
    }

    const parent = textNode.parentNode;

    // Skip if already processed
    if (parent.classList && parent.classList.contains('tengwar-text')) {
        return;
    }

    // Add to queue
    tengwarNodeQueue.push({
        node: textNode,
        text: textNode.nodeValue,
        parent: parent
    });

    // Start processing if not already running
    if (!tengwarProcessingActive) {
        tengwarProcessingActive = true;
        processTengwarBatchWithYield();
    }
}

// Process as many nodes as possible within the time limit
function processTengwarBatchWithYield() {
    // Exit conditions
    if (!tengwarEnabled || tengwarNodeQueue.length === 0) {
        tengwarProcessingActive = false;
        console.log(`Tengwar processing completed: ${tengwarProcessedCount} nodes processed`);
        return;
    }

    const startTime = performance.now();
    const nodesToProcess = [];
    const textsToProcess = [];

    // Collect as many unprocessed nodes as possible within the time limit
    // This just collects node references, not actually processing yet
    while (tengwarProcessingIndex < tengwarNodeQueue.length &&
    performance.now() - startTime < TENGWAR_MAX_PROCESSING_TIME) {

        const nodeData = tengwarNodeQueue[tengwarProcessingIndex++];

        // Skip nodes no longer in DOM
        if (!nodeData.node.parentNode) {
            continue;
        }

        nodesToProcess.push(nodeData);
        textsToProcess.push(nodeData.text);
    }

    // If we reached the end of the queue, reset index
    if (tengwarProcessingIndex >= tengwarNodeQueue.length) {
        tengwarProcessingIndex = 0;
        tengwarNodeQueue.length = 0; // Clear the processed queue
    }

    // If no nodes to process, yield and continue
    if (nodesToProcess.length === 0) {
        setTimeout(processTengwarBatchWithYield, TENGWAR_UI_REFRESH_DELAY);
        return;
    }

    // Process the collected nodes in the background script
    chrome.runtime.sendMessage(
        {
            action: 'processBatch',
            textBatch: textsToProcess
        },
        response => {
            if (!response || response.error) {
                console.error("Error processing batch:", response?.error || "No response");

                // Continue processing with the next batch
                setTimeout(processTengwarBatchWithYield, TENGWAR_UI_REFRESH_DELAY);
                return;
            }

            // Apply results to nodes
            const results = response.results;
            for (let i = 0; i < nodesToProcess.length; i++) {
                const nodeData = nodesToProcess[i];
                const fragments = results[i];

                // Skip if node is no longer in DOM
                if (!nodeData.node.parentNode) {
                    continue;
                }

                // Create and insert processed content
                if (fragments && fragments.length > 0) {
                    const documentFragment = document.createDocumentFragment();

                    fragments.forEach(fragment => {
                        if (fragment.isTengwar) {
                            const span = document.createElement('span');
                            span.className = 'tengwar-text';
                            span.textContent = fragment.text;
                            span.setAttribute('data-original', fragment.original);
                            documentFragment.appendChild(span);
                        } else {
                            documentFragment.appendChild(document.createTextNode(fragment.text));
                        }
                    });

                    try {
                        nodeData.parent.replaceChild(documentFragment, nodeData.node);
                        tengwarProcessedCount++;
                    } catch (e) {
                        console.error("Error replacing node:", e);
                    }
                }
            }

            // Yield to UI thread before continuing
            setTimeout(processTengwarBatchWithYield, TENGWAR_UI_REFRESH_DELAY);
        }
    );
}

// Clean up processing
function cleanupTengwarProcessing() {
    tengwarProcessingActive = false;
    tengwarProcessingIndex = 0;
    tengwarNodeQueue.length = 0;
    tengwarProcessedCount = 0;
}

// Make sure we add this to your existing disableTengwar
function disableTengwar() {
    tengwarEnabled = false;
    cleanupTengwarProcessing();
    // Rest of your cleanup...
    window.location.reload();
}

// Setup mutation observer to handle dynamic content
let observer = null;

function setupMutationObserver() {
    if (observer) {
        return;
    }

    observer = new MutationObserver(function (mutations) {
        // Process in batches to improve performance
        const nodesToProcess = new Set();

        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
                // Handle new nodes being added
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        nodesToProcess.add(node);
                    }
                });
            } else if (mutation.type === 'attributes') {
                const target = mutation.target;

                // Only process if it's an element
                if (target.nodeType === Node.ELEMENT_NODE) {
                    nodesToProcess.add(target);
                }
            } else if (mutation.type === 'characterData') {
                // Process text content changes
                if (mutation.target.nodeType === Node.TEXT_NODE) {
                    const parent = mutation.target.parentElement;
                    if (parent && !isElementToSkip(parent)) {
                        processTextNode(mutation.target);
                    }
                }
            }
        });

        // Process nodes in one batch
        nodesToProcess.forEach(processContent);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] // Common attributes affecting visibility
    });
}

// Check initial Tengwar status when extension loads
chrome.storage.sync.get(['tengwarEnabled', 'tengwarFont'], function (data) {
    if (data.tengwarEnabled) {
        tengwarEnabled = true;
        injectTengwarFont(data.tengwarFont || 'annatar');
        processPage();
    }
});

function initializeTengwar() {
    // Prevent running on frames like ads?
    // if (window.self !== window.top) {
    //     console.log("Tengwar skipping non-top frame:", window.location.href);
    //     return;
    // }
    try {
        // Ensure runs only once
        if (window.tengwarInitialized) return;
        window.tengwarInitialized = true;

        const currentDomain = window.location.hostname;
        // Exclude empty domains (e.g., about:blank, initial empty tabs)
        if (!currentDomain) {
            console.log("Tengwar skipping page with no domain.");
            return;
        }

        chrome.storage.sync.get(['tengwarEnabledDomains', 'tengwarFont'], function (data) {
            if (chrome.runtime.lastError) {
                console.error("Error getting storage:", chrome.runtime.lastError);
                return;
            }

            const enabledDomains = data.tengwarEnabledDomains || [];
            currentFont = data.tengwarFont || 'annatar'; // Store initially loaded font

            if (enabledDomains.includes(currentDomain)) {
                console.log(`Tengwar automatically enabled for ${currentDomain}`);
                tengwarEnabled = true;
                // Inject font immediately
                injectTengwarFont(currentFont);
                // Use requestAnimationFrame to delay processing slightly,
                // allowing the page layout and styles (like the font) to settle.
                requestAnimationFrame(() => {
                    if (document.readyState === 'loading') {
                        // If DOM is still loading, wait for it
                        document.addEventListener('DOMContentLoaded', processPage);
                    } else {
                        // If DOM is already interactive or complete, process now
                        processPage();
                    }
                });
            } else {
                console.log(`Tengwar not enabled for ${currentDomain}`);
                tengwarEnabled = false;
                // Ensure observer is stopped if script somehow loads on a disabled page
                // after being on an enabled one without full reload.
                if (observer) {
                    observer.disconnect();
                    observer = null; // Important to allow setup later if enabled
                    console.log("MutationObserver disconnected on init (domain disabled).");
                }
            }
        });
    } catch (error) {
        console.error("Error during Tengwar initialization:", error);
        tengwarEnabled = false; // Ensure it's disabled on error
    }
}

// Run the initialization logic when the script loads
initializeTengwar();
