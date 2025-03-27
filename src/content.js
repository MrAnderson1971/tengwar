// Import the pronunciation library (only used for certain cases)
import {dictionary} from 'cmu-pronouncing-dictionary';
import {englishToTengwar, specialWords, tengwarMap, vowelPhonemePatterns, vowelPhonemes} from "./mappings";
import {alignLettersToPhonemes} from "./align";

// Track if Tengwar is currently enabled
let tengwarEnabled = false;
let fontInjected = false;

// Cache for pronunciations to improve performance
const pronunciationCache = new Map();

// Check tengwar status when page loads
document.addEventListener('DOMContentLoaded', function () {
    chrome.runtime.sendMessage({action: 'getTengwarStatus'}, function (response) {
        if (response && response.enabled) {
            tengwarEnabled = true;
            injectTengwarFont();
            processPage();
        }
    });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === 'updateTengwarStatus') {
        if (request.enabled && !tengwarEnabled) {
            tengwarEnabled = true;
            injectTengwarFont();
            processPage();
        } else if (!request.enabled && tengwarEnabled) {
            // Reload the page to restore original text
            window.location.reload();
        }
    }
});

// Function to inject Tengwar font
function injectTengwarFont() {
    if (fontInjected) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'tengwar-font-style';
    style.textContent = `
    @font-face {
      font-family: 'TengwarAnnatar';
      src: url('${chrome.runtime.getURL('annatar.ttf')}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    .tengwar-text {
      font-family: 'TengwarAnnatar', serif !important;
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

    // Process initial content
    processContent(document.body);

    // Set up a MutationObserver to handle dynamic content
    setupMutationObserver();
}

// Process content within a container element
function processContent(container) {
    if (!container || isElementToSkip(container)) {
        return;
    }

    // Get all text nodes within the container
    const textNodes = [];
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (!node.nodeValue.trim() || isElementToSkip(node.parentElement)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node;
    // Gather all nodes first to avoid DOM modification during traversal
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    // Process each node
    textNodes.forEach(processTextNode);
}

// Function to determine if an element should be skipped
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

// Process a text node
function processTextNode(textNode) {
    if (!textNode || !textNode.nodeValue || !textNode.parentNode) {
        return;
    }

    let text = textNode.nodeValue;
    const parent = textNode.parentNode;

    // If the parent is already a tengwar-text or has tengwar-text class, skip
    if (parent.classList && parent.classList.contains('tengwar-text')) {
        return;
    }

    // Use regular expression to find all words (sequences of letters)
    const fragments = [];
    let lastIndex = 0;

    // Special case for "of the" phrases before processing individual words
    text = text.replace(/\bof\s+the\b/gi, "ofthe");

    // Find all alphabetical words
    const wordRegex = /[a-zA-Z]+/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
        // Add text before the current word
        if (match.index > lastIndex) {
            fragments.push({
                text: text.substring(lastIndex, match.index),
                isTengwar: false
            });
        }

        fragments.push({
            text: transcribeToTengwar(match[0]),
            isTengwar: true,
            original: match[0]
        });

        lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
        fragments.push({
            text: text.substring(lastIndex),
            isTengwar: false
        });
    }

    // If we have fragments to process
    if (fragments.length > 0) {
        // Create fragment to hold the new content
        const documentFragment = document.createDocumentFragment();

        // Add each fragment
        fragments.forEach(fragment => {
            if (fragment.isTengwar) {
                // Create a span for tengwar text
                const span = document.createElement('span');
                span.className = 'tengwar-text';
                span.textContent = fragment.text;
                span.setAttribute('data-original', fragment.original); // Store original for possible later use
                documentFragment.appendChild(span);
            } else {
                // Regular text nodes for non-tengwar text
                documentFragment.appendChild(document.createTextNode(fragment.text));
            }
        });

        // Replace the original node with our fragment
        try {
            parent.replaceChild(documentFragment, textNode);
        } catch (e) {
            console.error("Error replacing node:", e);
        }
    }
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
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE && !isElementToSkip(node)) {
                        nodesToProcess.add(node);
                    }
                });
            }
        });

        // Process nodes in one batch
        nodesToProcess.forEach(processContent);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Helper functions for heuristics (fallbacks)
function isSoftC(word, position) {
    const nextChar = position < word.length - 1 ? word[position + 1].toLowerCase() : null;
    return nextChar && ['e', 'i', 'y'].includes(nextChar);
}

function removeSilentLetters(word) {
    // Patterns for silent letters
    const silentPatterns = [
        {pattern: /^p(?=[st])/i, silent: 'p'},  // silent p in psychology, pterodactyl
        {pattern: /^k(?=n)/i, silent: 'k'},    // silent k in knight, know
        {pattern: /^w(?=r)/i, silent: 'w'},    // silent w in write, wrong
    ];

    let processedWord = word;
    for (const {pattern} of silentPatterns) {
        if (pattern.test(processedWord)) {
            processedWord = processedWord.replace(pattern, '');
        }
    }

    return processedWord;
}

function isConsonantY(word, position) {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const prevChar = position > 0 ? word[position - 1].toLowerCase() : null;
    return position === 0 || (prevChar && vowels.includes(prevChar));
}

function getYVowelType(word, position, pronunciation) {
    if (pronunciation) {
        return !!pronunciation.includes("AY") ? 'long' : 'short';
    }
    return 'short';
}

function isNgDigraph(word, position) {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const nextNextChar = position < word.length - 2 ? word[position + 2].toLowerCase() : null;
    return position === word.length - 2 || (nextNextChar && vowels.includes(nextNextChar));
}

function isHardR(word, position) {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const prevChar = position > 0 ? word[position - 1].toLowerCase() : null;
    const nextChar = position < word.length - 1 ? word[position + 1].toLowerCase() : null;
    return prevChar && vowels.includes(prevChar) && (!nextChar || !vowels.includes(nextChar));
}

// Improved detection of silent E
function hasSilentEImproved(word, pronunciation) {
    // Quick check - if the word doesn't end with 'e', it's not a silent e
    if (word.length < 2 || word[word.length - 1].toLowerCase() !== 'e') {
        return false;
    }

    // If no pronunciation data, fall back to heuristic
    if (!pronunciation) {
        return hasSilentE(word);
    }

    // Split the pronunciation into phonemes
    const phonemes = pronunciation.split(' ');

    // Check if there's a final 'e' sound in the pronunciation
    const lastPhoneme = phonemes[phonemes.length - 1];

    // A more reliable way to detect silent 'e':
    // 1. Count the number of vowel sounds in the pronunciation
    // 2. Count the number of vowel letters in the word
    // 3. If there are fewer vowel sounds than vowel letters, and the word ends with 'e',
    //    then the 'e' is likely silent

    const vowelLetters = ['a', 'e', 'i', 'o', 'u', 'y'];
    let vowelLetterCount = 0;
    for (let i = 0; i < word.length; i++) {
        if (vowelLetters.includes(word[i].toLowerCase())) {
            vowelLetterCount++;
        }
    }

    let vowelPhonemeCount = 0;
    for (const phoneme of phonemes) {
        // Remove stress markers for comparison
        const basePhoneme = phoneme.replace(/[0-9]$/, '');
        if (vowelPhonemes.includes(basePhoneme)) {
            vowelPhonemeCount++;
        }
    }

    // Final 'e' is likely silent if there are fewer vowel sounds than vowel letters
    if (vowelLetterCount > vowelPhonemeCount) {
        return true;
    }

    // For cases like "make" where the 'a' creates a diphthong with the 'e'
    // but the 'e' itself is silent
    const vowelsBeforeE = [];
    for (let i = 0; i < word.length - 1; i++) {
        if (vowelLetters.includes(word[i].toLowerCase())) {
            vowelsBeforeE.push(word[i].toLowerCase());
        }
    }

    // Check common silent 'e' patterns
    if (vowelsBeforeE.length > 0) {
        const lastVowelBeforeE = vowelsBeforeE[vowelsBeforeE.length - 1];
        const indexOfLastVowel = word.toLowerCase().lastIndexOf(lastVowelBeforeE, word.length - 2);

        // Check if there's a consonant between the last vowel and the final 'e'
        if (indexOfLastVowel >= 0 && indexOfLastVowel < word.length - 2) {
            // This is a classic silent 'e' pattern like "make", "site", "code"
            return true;
        }
    }

    // Last resort check: if the final phoneme is not a vowel sound,
    // the final 'e' is likely silent
    const lastPhonemeBase = lastPhoneme.replace(/[0-9]$/, '');
    return !vowelPhonemes.includes(lastPhonemeBase);
}

function hasSilentE(word) {
    if (word.length < 2) {
        return false;
    }
    if (word[word.length - 1].toLowerCase() !== 'e') {
        return false;
    }
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    let hasEarlierVowel = false;
    for (let i = 0; i < word.length - 1; i++) {
        if (vowels.includes(word[i].toLowerCase())) {
            hasEarlierVowel = true;
            break;
        }
    }
    const secondToLast = word[word.length - 2].toLowerCase();
    const isConsonant = !vowels.includes(secondToLast);
    return hasEarlierVowel && isConsonant;
}

/*
S that sounds like Z.
 */
function isHardS(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    if (!pronunciation || !alignmentEntry) {
        return false; // Cannot determine from pronunciation
    }

    // Check the alignment entry for this position
    if (alignmentEntry.letters.includes('s') || alignmentEntry.letters.includes('S')) { // Check original letter
        return alignmentEntry.phoneme && alignmentEntry.phoneme.startsWith('Z');
    }

    return false; // Letter at position is not 's' according to alignment
}

// Improved disambiguation for NG digraph
function isNgDigraphImproved(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntryN = alignmentByIndex ? alignmentByIndex[position] : null;     // O(1) lookup for 'n'
    const alignmentEntryG = alignmentByIndex ? alignmentByIndex[position + 1] : null; // O(1) lookup for 'g'

    if (!pronunciation || !alignmentEntryN) {
        // Fall back to the original heuristic if no pronunciation or alignment
        return isNgDigraph(word, position);
    }

    // Check if the phoneme for 'n' at this position is 'NG'
    // This implies 'n' and 'g' were treated as one unit mapped to NG.
    if (alignmentEntryN.phoneme && alignmentEntryN.phoneme.startsWith('NG')) {
        // Check if the alignment entry actually covers both 'n' and 'g'
        // (This depends on how alignLettersToPhonemes works)
        // A simpler check is just the phoneme, assuming alignment is reasonable.
        return true;
    }

    // Check if 'n' has its own phoneme (like 'N') and 'g' has its own (like 'G')
    if (alignmentEntryN.phoneme && alignmentEntryN.phoneme.startsWith('N') &&
        alignmentEntryG && alignmentEntryG.phoneme && alignmentEntryG.phoneme.startsWith('G')) {
        return false; // Separate sounds
    }

    // Fall back if alignment is unclear
    return isNgDigraph(word, position);
}

// Improved disambiguation for soft/hard C
function isSoftCImproved(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    if (!pronunciation || !alignmentEntry) {
        // Fall back to the original heuristic
        return isSoftC(word, position);
    }

    // Check the alignment entry for this position
    if (alignmentEntry.letters.includes('c') || alignmentEntry.letters.includes('C')) {
        // In CMU dictionary, soft C typically has an S sound
        return !(alignmentEntry.phoneme && alignmentEntry.phoneme.startsWith('K'));
    }

    // Fall back if 'c' wasn't the letter for this entry or phoneme info missing
    return isSoftC(word, position);
}

// Improved disambiguation for consonant Y
function isConsonantYImproved(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    if (!pronunciation || !alignmentEntry) {
        // Fall back to the original heuristic
        return isConsonantY(word, position);
    }

    // Check the alignment entry for this position
    if (alignmentEntry.letters === 'y' || alignmentEntry.letters === 'Y') {
        // In CMU dictionary, consonant Y is typically a 'Y' phoneme
        return alignmentEntry.phoneme === 'Y';
    }

    // Fall back if 'y' wasn't the letter or phoneme info missing
    return isConsonantY(word, position);
}

// Improved detection of y vowel type (long vs short)
function getYVowelTypeImproved(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    if (!pronunciation || !alignmentEntry) {
        // Fall back to the original implementation's heuristic
        return getYVowelType(word, position, pronunciation); // Pass original pronunciation for heuristic
    }

    // Check the alignment entry for this position
    if (alignmentEntry.letters === 'y' || alignmentEntry.letters === 'Y') {
        // Check the specific phoneme for this 'y'
        if (alignmentEntry.phoneme) {
            // Long Y sounds
            if (alignmentEntry.phoneme.startsWith('AY')) {
                return 'long';
            }
            // Short Y sounds
            if (alignmentEntry.phoneme.startsWith('IY') || alignmentEntry.phoneme.startsWith('IH')) {
                return 'short';
            }
        }
    }

    // Fall back if 'y' wasn't the letter or phoneme didn't match known patterns
    return getYVowelType(word, position, pronunciation);
}

// Improved disambiguation for hard R
function isHardRImproved(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    if (!pronunciation || !alignmentEntry) {
        // Fall back to the original heuristic
        return isHardR(word, position);
    }

    if (alignmentEntry.letters.includes('r') || alignmentEntry.letters.includes('R')) {
        // In CMU, the 'ER' phoneme (like in "bird", "father") often corresponds
        // to the vocalic/syllabic R sound that might use 'oore'.
        // This is an approximation of the original intent based on local info.
        if (position > 0 && alignmentByIndex[position - 1].phoneme &&
            vowelPhonemePatterns.test(alignmentByIndex[position - 1].phoneme.replace(/[0-9]$/, ''))) {
            return true; // Treat ER phoneme as indication for 'oore'
        }
        // If the phoneme is just 'R', it's likely the regular 'romen'
        if (alignmentEntry.phoneme && alignmentEntry.phoneme.startsWith('R')) {
            return false;
        }
    }

    // Fall back to the original heuristic if uncertain
    return isHardR(word, position);
}

// Improved detection of silent E
function isSilentEInMiddle(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    // Check if the letter is actually an 'e'
    if (word[position].toLowerCase() !== 'e') {
        return false;
    }

    // If it's at the end, don't process here
    if (position === word.length - 1) {
        return false;
    }

    const alignmentEntry = alignmentByIndex ? alignmentByIndex[position] : null; // O(1) lookup

    // Use pronunciation data if available
    if (pronunciation && alignmentEntry) {
        if (alignmentEntry.letters === 'e' || alignmentEntry.letters === 'E') {
            // If it has no phoneme or is marked as silent, it's silent
            if (!alignmentEntry.phoneme || alignmentEntry.isSilent) {
                return true;
            }

            // Check if 'e' is mapped to a non-vowel phoneme
            if (alignmentEntry.phoneme && !vowelPhonemePatterns.test(alignmentEntry.phoneme)) {
                // If the phoneme isn't a standard vowel sound, the 'e' might be silent
                // or contributing to a consonant sound (less likely for 'e').
                // This is a heuristic.
                return true;
            }
        }
    }

    return false;
}


// Function to detect if vowels are in the same syllable using pronunciation data
// Similar issue to isHardRImproved - checking relationship between phonemes at pos/pos+1
// requires looking at two alignment entries. This is still O(1) with the index.
function isDiphthong(word, position, pronunciation, alignmentByIndex) { // Modified parameter
    // If not enough characters for a diphthong
    if (position >= word.length - 1) {
        return false;
    }

    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const char = word[position].toLowerCase();
    const nextChar = word[position + 1].toLowerCase();

    // Both characters must be vowels
    if (!vowels.includes(char) || !vowels.includes(nextChar)) {
        return false;
    }

    const possibleDiphthong = char + nextChar;

    if ((possibleDiphthong === 'ia' || possibleDiphthong === 'io' || possibleDiphthong === 'iu') &&
        position > 0 && !vowels.includes(word[position - 1])) {
        return false;
    }

    // Use pronunciation data if available
    const alignmentEntry1 = alignmentByIndex ? alignmentByIndex[position] : null;     // O(1) lookup
    const alignmentEntry2 = alignmentByIndex ? alignmentByIndex[position + 1] : null; // O(1) lookup

    if (pronunciation && alignmentEntry1) {
        const firstVowelPhoneme = alignmentEntry1.phoneme;
        const secondVowelPhoneme = alignmentEntry2 ? alignmentEntry2.phoneme : null; // May be null if second char is silent/merged

        // If the first vowel's alignment entry spans both letters (check indices if available)
        // or if the second letter has no phoneme (silent/merged), check if the first phoneme is a diphthong.
        if (firstVowelPhoneme && (!alignmentEntry2 || !secondVowelPhoneme || alignmentEntry2.isSilent)) {
            // Check if the phoneme assigned to the first vowel IS a diphthong phoneme
            const diphthongPhonemes = ["EY", "AY", "OY", "AW", "OW"]; // UW/IY are usually single vowels
            for (const dp of diphthongPhonemes) {
                // Check base phoneme without stress marker
                if (firstVowelPhoneme.replace(/[0-9]$/, '') === dp) {
                    return true; // e.g., 'oi' in "coin" maps to OY1
                }
            }
        }

        // If both vowels have their OWN vowel phonemes, they are likely separate syllables.
        const vowelPhonemePatterns = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/;
        if (firstVowelPhoneme && secondVowelPhoneme &&
            vowelPhonemePatterns.test(firstVowelPhoneme.replace(/[0-9]$/, '')) &&
            vowelPhonemePatterns.test(secondVowelPhoneme.replace(/[0-9]$/, ''))) {
            // Check stress markers if needed (as in original) for more confidence
            const firstStress = firstVowelPhoneme.match(/[0-9]$/);
            const secondStress = secondVowelPhoneme.match(/[0-9]$/);
            if (firstStress && secondStress && firstStress[0] !== secondStress[0]) {
                return false; // Different stress = different syllables (e.g., creATE)
            }
            // If same stress or one unstressed, assume separate unless proven otherwise
            // (This heuristic might misclassify some diphthongs not in the list below)
            return false;
        }
    }

    // Fallback to known common diphthong letter pairs (O(1))
    const commonDiphthongs = [
        'ae', 'ai', 'ay', 'au', 'aw',
        'ea', 'ei', 'ey',
        'oi', 'oy',
        'ou', 'ow',
        'ue' // Added ue
    ];
    return commonDiphthongs.includes(possibleDiphthong);
}

// Function to get a cached or new pronunciation
function getPronunciation(word) {
    // Check cache first
    if (pronunciationCache.has(word)) {
        return pronunciationCache.get(word);
    }

    // Get from dictionary
    let pronunciation = null;
    if (dictionary[word.toLowerCase()]) {
        pronunciation = dictionary[word.toLowerCase()];
        // Cache the result
        pronunciationCache.set(word, pronunciation);
    }

    return pronunciation;
}

// Get diphthong type based on second vowel
function getDiphthongType(word, position) {
    return word[position + 1].toLowerCase();
}

// Handle diphthongs based on the rules:
// xa = x as diacritic + osse
// xe = x as diacritic + telco + dot underneath
// xi = treat i as consonant y
// xu = treat u as consonant w
// xo = use telco with first vowel diacritic + right-curl for 'o'
function handleDiphthong(word, position, result) {
    const char = word[position].toLowerCase();
    const diphthongType = getDiphthongType(word, position);

    // Store current diacritic for first vowel
    const firstVowelTehta = englishToTengwar[char].tehta;

    switch (diphthongType) {
        case 'a':
            // xa = x as diacritic + osse
            result.push(tengwarMap['osse']);
            result.push(firstVowelTehta);
            return 2; // Skip both vowels

        case 'e':
            // xe = x as diacritic + telco + dot underneath
            result.push(tengwarMap['telco']);
            result.push(firstVowelTehta);
            result.push(tengwarMap['dot-below']); // Silent e marker
            return 2; // Skip both vowels

        case 'i':
            // xi = treat i as consonant y
            result.push(englishToTengwar['y'].char); // Use 'anna' for consonant y
            result.push(firstVowelTehta);
            return 2; // Skip both vowels

        case 'u':
            // xu = treat u as consonant w
            result.push(englishToTengwar['w'].char); // Use 'vala' for consonant w
            result.push(firstVowelTehta);
            return 2; // Skip both vowels

        case 'o':
            // xo = use telco with first vowel diacritic + right-curl for 'o'
            result.push(tengwarMap['telco']);
            result.push(firstVowelTehta);
            result.push(tengwarMap['right-curl']); // 'o' diacritic
            return 2; // Skip both vowels

        default:
            // Not a recognized diphthong type
            return 0; // Don't skip anything
    }
}

const vowelDiacritics = [tengwarMap['three-dots'], tengwarMap['acute'], tengwarMap['dot'], tengwarMap['right-curl'], tengwarMap['right-curl']];

// Update the transcribeToTengwar function by modifying the handling of 'e'
function transcribeToTengwar(text) {
    const lowerText = text.toLowerCase();
    if (specialWords[lowerText]) {
        return specialWords[lowerText];
    }

    const processedText = removeSilentLetters(text);

    // Get pronunciation
    const pronunciation = getPronunciation(processedText);
    const alignmentNaive = alignLettersToPhonemes(processedText, pronunciation);
    const alignment = new Array(processedText.length).fill(null);

    if (alignmentNaive) {
        for (const entry of alignmentNaive) {
            // Ensure the entry has a valid startIndex within the word bounds
            if (entry.startIndex >= 0 && entry.startIndex < processedText.length) {
                // Simple case: Assign the entry to its starting index.
                // If multiple entries share a startIndex (e.g., if aligner grouped letters),
                // this might need refinement, but the current aligner aims for 1 per letter.
                if (alignment[entry.startIndex] === null) { // Prefer the first entry if duplicates somehow occur
                    alignment[entry.startIndex] = entry;
                }
            }
            // Note: This assumes alignLettersToPhonemes provides start/end indices
            // correctly mapping letters to phonemes. If a single phoneme maps
            // to multiple letters (like 'sh' -> 'SH'), this simple mapping works.
            // If multiple phonemes map to one letter, the first phoneme mapping is stored.
        }
    }
    if (document.title === "Tengwar Tests") {
        console.log(pronunciation, alignment);
    }

    const result = [];
    let i = 0;
    let vowelOnTop = null;

    while (i < processedText.length) {
        const char = processedText[i].toLowerCase();
        let found = false;

        // Check for diphthongs
        if ('aeiou'.includes(char) && isDiphthong(processedText, i, pronunciation)) {
            const charsToSkip = handleDiphthong(processedText, i, result);
            if (charsToSkip > 0) {
                i += charsToSkip;
                vowelOnTop = null; // Reset vowel since we've handled it
                found = true;
                continue;
            }
        }

        // Check for multi-letter combinations (digraphs/trigraphs)
        for (let len = 3; len >= 2; len--) {
            if (i + len <= processedText.length) {
                const ngram = processedText.substring(i, i + len).toLowerCase();

                if (ngram === 'ng') {
                    if (isNgDigraphImproved(processedText, i, pronunciation, alignment)) {
                        result.push(englishToTengwar['ng'].char);
                        i += 2;
                        found = true;
                        break;
                    } else {
                        result.push(englishToTengwar['n'].char);
                        i++;
                        found = true;
                        break;
                    }
                } else if (ngram === 'nc' && !isSoftCImproved(processedText, i + 1, pronunciation, alignment)) {
                    result.push(englishToTengwar['nk'].char);
                    i += 2;
                    found = true;
                    break;
                } else if (englishToTengwar[ngram] && englishToTengwar[ngram].char) {
                    result.push(englishToTengwar[ngram].char);
                    i += len;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            if (!'aeiou'.includes(processedText[i]) && i > 0 && (processedText[i] === processedText[i - 1] ||
                processedText[i] === 'k' && processedText[i - 1] === 'c')) {
                result.push(tengwarMap['doubler']);
                i++;
            } else {
                switch (char) {
                    case 'a':
                    case 'i':
                    case 'o':
                    case 'u':
                        if (vowelOnTop) {
                            result.push(tengwarMap['telco']);
                            result.push(vowelOnTop);
                            vowelOnTop = null;
                        }
                        vowelOnTop = englishToTengwar[char].tehta;
                        i++;
                        continue;
                    case 'e':
                        // Check if this 'e' is silent in the middle of the word
                        if (i < processedText.length - 1 && isSilentEInMiddle(processedText, i, pronunciation, alignment)) {
                            // For silent 'e' in the middle of a word, add a dot-below
                            result.push(tengwarMap['dot-below']);
                            i++;
                            break;
                        }
                        // Otherwise, treat as a normal vowel
                        if (vowelOnTop) {
                            result.push(tengwarMap['telco']);
                            result.push(vowelOnTop);
                            vowelOnTop = null;
                        }
                        vowelOnTop = englishToTengwar[char].tehta;
                        i++;
                        continue;
                    case 'c':
                        // Use improved soft c detection
                        if (isSoftCImproved(processedText, i, pronunciation, alignment)) {
                            // Soft c: use silmenuquerna
                            result.push(tengwarMap['silmenuquerna']);
                        } else {
                            // Hard c: use quesse
                            result.push(englishToTengwar['c'].char);
                        }
                        i++;
                        break;
                    case 'y':
                        // Use improved consonantal y detection
                        if (isConsonantYImproved(processedText, i, pronunciation)) {
                            result.push(englishToTengwar['y'].char);
                            i++;
                        } else {
                            // Use improved vowel y type detection
                            const yType = getYVowelTypeImproved(processedText, i, pronunciation, alignment);
                            if (vowelOnTop) {
                                result.push(tengwarMap['telco']);
                                result.push(vowelOnTop);
                                vowelOnTop = null;
                            }
                            if (yType === 'long') {
                                vowelOnTop = tengwarMap['caron'];
                                i++;
                                continue;
                            } else {
                                result.push(tengwarMap['two-dots-below']);
                            }
                            i++;
                        }
                        break;
                    case 'r':
                        // Use improved hard r detection
                        if (isHardRImproved(processedText, i, pronunciation, alignment)) {
                            result.push(tengwarMap['oore']);
                        } else {
                            result.push(englishToTengwar['r'].char);
                        }
                        i++;
                        break;
                    case 's':
                        if (isHardS(processedText, i, pronunciation, alignment)) {
                            result.push(englishToTengwar['z'].char);
                        } else {
                            result.push(englishToTengwar['s'].char);
                        }
                        i++;
                        break;
                    default:
                        if (englishToTengwar[char] && englishToTengwar[char].char) {
                            result.push(englishToTengwar[char].char);
                            i++;
                        } else {
                            result.push(char);
                            i++;
                        }
                }
            }
        }

        if (vowelOnTop) { // add the vowel
            if (result.length === 0 || vowelDiacritics.includes(result.at(-1))) { // add carrier if previous was also a vowel
                result.push(tengwarMap['telco']);
            }
            result.push(vowelOnTop);
            vowelOnTop = null;
        }
    }

    // Handle silent e at the end of words
    if (hasSilentEImproved(processedText, pronunciation)) {
        result.push(tengwarMap['dot-below']);
    } else if (vowelOnTop) {
        if (vowelOnTop !== tengwarMap['two-dots-below']) { // no carrier for y
            result.push(tengwarMap['telco']);
        }
        result.push(vowelOnTop);
    }

    return result.join('');
}

// Check initial Tengwar status when extension loads
chrome.storage.sync.get('tengwarEnabled', function (data) {
    if (data.tengwarEnabled) {
        tengwarEnabled = true;
        // Wait a bit to ensure the page is loaded
        setTimeout(function () {
            injectTengwarFont();
            processPage();
        }, 1000); // Increased delay for better page load
    }
});
