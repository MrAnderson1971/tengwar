import {transcribeToTengwar} from "./worker";

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
            cleanupTengwarProcessing();
            window.location.reload();
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

// Add this to your content script
const textNodeQueue = [];
let isProcessing = false;
let processingPaused = false;
let processedCount = 0;
let totalCount = 0;
let batchSize = 5; // Start with small batches
let timeoutId = null;

// Better node processing function
function processTextNode(textNode) {
    if (!textNode || !textNode.nodeValue || !textNode.parentNode) {
        return;
    }

    const parent = textNode.parentNode;

    if (parent.classList && parent.classList.contains('tengwar-text')) {
        return;
    }

    // Priority based on visibility
    const rect = textNode.parentElement?.getBoundingClientRect();
    const isVisible = rect &&
        rect.top < window.innerHeight * 2 &&
        rect.bottom > -window.innerHeight &&
        rect.width > 0 &&
        rect.height > 0;

    // Add to appropriate queue position (visible first)
    if (isVisible) {
        textNodeQueue.unshift(textNode); // Add to front
    } else {
        textNodeQueue.push(textNode); // Add to back
    }

    totalCount++;

    // Start processing if not already running
    if (!isProcessing) {
        isProcessing = true;
        timeoutId = setTimeout(processNextBatch, 0);
    }
}

// Process nodes in adaptive batches
function processNextBatch() {
    const startTime = performance.now();
    const targetTime = 16; // ms (1 frame @ 60fps)
    let nodesProcessed = 0;

    // Adaptive batch size
    // Start small, but increase as we process more without problems
    if (processedCount > 100 && batchSize < 20) {
        batchSize = Math.min(20, batchSize + 3);
    }

    // Process batch
    while (textNodeQueue.length > 0 &&
    nodesProcessed < batchSize &&
    performance.now() - startTime < targetTime) {

        const textNode = textNodeQueue.shift();

        // Skip if node no longer in DOM
        if (!textNode.parentNode) {
            continue;
        }

        processIndividualNode(textNode);
        nodesProcessed++;
        processedCount++;
    }

    // Continue processing with adaptive timing
    if (textNodeQueue.length > 0) {
        // Check if we need to pause to let the UI catch up
        if (processedCount % 100 === 0) {
            // Give the UI thread a longer break every 100 nodes
            timeoutId = setTimeout(processNextBatch, 50);
        } else {
            // Dynamic timing based on how long processing took
            const elapsed = performance.now() - startTime;
            const delay = elapsed > targetTime ? 20 : 0;
            timeoutId = setTimeout(processNextBatch, delay);
        }
    } else {
        isProcessing = false;
        console.log(`Tengwar processing complete: ${processedCount}/${totalCount} nodes processed`);
        // Reset counters for next time
        processedCount = 0;
        totalCount = 0;
        batchSize = 5;
    }
}

// Break out the individual node processing for clarity
function processIndividualNode(textNode) {
    let text = textNode.nodeValue;
    const parent = textNode.parentNode;

    // Standard processing logic
    text = text.replace(/\bof\s+the\b/gi, "ofthe");

    const fragments = [];
    let lastIndex = 0;
    const wordRegex = /\p{L}+/gu;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            fragments.push({
                text: text.substring(lastIndex, match.index),
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

    if (lastIndex < text.length) {
        fragments.push({
            text: text.substring(lastIndex),
            isTengwar: false
        });
    }

    // Apply changes to DOM
    if (fragments.length > 0) {
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
            parent.replaceChild(documentFragment, textNode);
        } catch (e) {
            console.error("Error replacing node:", e);
        }
    }
}

// Add these functions for better control
function pauseTengwarProcessing() {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    processingPaused = true;
    isProcessing = false;
}

function resumeTengwarProcessing() {
    if (processingPaused && textNodeQueue.length > 0) {
        processingPaused = false;
        isProcessing = true;
        timeoutId = setTimeout(processNextBatch, 0);
    }
}

// Add this to your cleanup when disabling
function cleanupTengwarProcessing() {
    pauseTengwarProcessing();
    textNodeQueue.length = 0; // Clear queue
    processedCount = 0;
    totalCount = 0;
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
                    if (node.nodeType === Node.ELEMENT_NODE && !isElementToSkip(node)) {
                        nodesToProcess.add(node);
                    }
                });
            } else if (mutation.type === 'attributes') {
                // For attribute changes that might affect visibility
                const target = mutation.target;

                // Only process if it's an element
                if (target.nodeType === Node.ELEMENT_NODE) {
                    // Check if the element or any of its children might need processing
                    const wasHidden = target.hasAttribute('data-tengwar-was-hidden');
                    const isVisible = isElementVisible(target);

                    // If element transitioned from hidden to visible
                    if (wasHidden && isVisible) {
                        target.removeAttribute('data-tengwar-was-hidden');
                        if (!isElementToSkip(target)) {
                            nodesToProcess.add(target);
                        }
                    }
                    // If element is now hidden, mark it for future reference
                    else if (!isVisible) {
                        target.setAttribute('data-tengwar-was-hidden', 'true');
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
