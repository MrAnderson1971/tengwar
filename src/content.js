// Import the pronunciation library (only used for certain cases)
import {dictionary} from 'cmu-pronouncing-dictionary';

// Track if Tengwar is currently enabled
let tengwarEnabled = false;
let fontInjected = false;

// Cache for pronunciations to improve performance
const pronunciationCache = new Map();

// Mapping based on the actual characters from the compiled LaTeX document
// This maps LaTeX commands to their corresponding characters in the Annatar font
const tengwarMap = {
    // Tengwar consonants (from the LaTeX command to actual character output)
    'tinco': '1',       // \Ttinco
    'parma': 'q',       // \Tparma
    'calma': 'a',       // \Tcalma
    'quesse': 'z',      // \Tquesse
    'ando': '2',        // \Tando
    'umbar': 'w',       // \Tumbar
    'anga': 's',        // \Tanga
    'ungwe': 'x',       // \Tungwe
    'thuule': '3',      // \Tthuule
    'formen': 'e',      // \Tformen
    'aha': 'd',         // \Taha
    'hwesta': 'r',      // \Thwesta
    'anto': '4',        // \Tanto
    'ampa': 'r',        // \Tampa
    'anca': 'f',        // \Tanca
    'unque': 'v',       // \Tunque
    'nuumen': '5',      // \Tnuumen
    'malta': 't',       // \Tmalta
    'noldo': 'g',       // \Tnoldo
    'nwalme': 'b',      // \Tnwalme
    'oore': '6',        // \Toore
    'vala': 'y',        // \Tvala
    'anna': 'h',        // \Tanna
    'vilya': 'n',       // \Tvilya
    'roomen': '7',      // \Troomen
    'arda': 'u',        // \Tarda
    'lambe': 'j',       // \Tlambe
    'alda': 'k',        // \Talda
    'silme': '8',       // \Tsilme
    'silmenuquerna': 'i', // \Tsilmenuquerna
    'esse': ';',        // \Tesse
    'essenuquerna': ',', // \Tessenuquerna
    'hyarmen': '9',     // \Thyarmen
    'hwesta-sindarinwa': 'o', // \Thwestasindarinwa
    'yanta': 'm',       // \Tyanta
    'uure': '9',        // \Tuure
    'telco': '`',       // \Ttelco
    'osse': ']',        // \Tosse - Added for the indefinite article "a"

    // Tehtar (diacritical marks)
    'three-dots': 'E',  // \TTthreedots (a)
    'acute': 'R',       // \TTacute (e)
    'dot': 'T',         // \TTdot (i)
    'right-curl': 'Y',  // \TTrightcurl (o)
    'left-curl': 'U',   // \TTleftcurl (u)
    'nasalizer': 'p',   // \TTnasalizer
    'doubler': ';',     // \TTdoubler
    'tilde': 'ê',       // \TTtilde
    'dot-below': 'Ê',   // \TTdotbelow - For silent e's
    'caron': 'Ù',       // \TTcaron - For hard y sound (hypothesis)
    'two-dots-below': 'Í', // \TTtwodotsbelow - For short i sound (quickly)
    'left-hook': '|',   // \Tlefthook

    // Punctuation
    'space': ' ',       // \Ts
    'centered-dot': '=', // \Tcentereddot
    'centered-tilde': '\\', // \Tcenteredtilde

    'extended-ando': '@', // \Textendedando
    'extended-umbar': 'W', // \Textendedumbar
};

// English mode mapping (simplified for this extension)
const englishToTengwar = {
    // Basic vowels
    'a': { tehta: tengwarMap['three-dots'] },
    'e': { tehta: tengwarMap['acute'] },
    'i': { tehta: tengwarMap['dot'] },
    'o': { tehta: tengwarMap['right-curl'] },
    'u': { tehta: tengwarMap['left-curl'] },

    // Basic consonants
    't': { char: tengwarMap['tinco'] },
    'nt': { char: tengwarMap['tinco'] + tengwarMap['nasalizer'] },
    'p': { char: tengwarMap['parma'] },
    'c': { char: tengwarMap['quesse'] }, // Default to hard c; disambiguation will occur below
    'ch': { char: tengwarMap['calma'] },
    'k': { char: tengwarMap['quesse'] },
    'q': { char: tengwarMap['quesse'] },
    'qu': { char: tengwarMap['quesse'] + tengwarMap['tilde'] },
    'd': { char: tengwarMap['ando'] },
    'b': { char: tengwarMap['umbar'] },
    'g': { char: tengwarMap['ungwe'] },
    'ng': { char: tengwarMap['nwalme'] }, // Default, we'll check context
    'th': { char: tengwarMap['thuule'] },
    'f': { char: tengwarMap['formen'] },
    'ph': { char: tengwarMap['formen'] },
    'h': { char: tengwarMap['hyarmen'] },
    'hw': { char: tengwarMap['hwesta'] },
    'wh': { char: tengwarMap['hwesta'] },
    'nd': { char: tengwarMap['ando'] + tengwarMap['nasalizer'] },
    'mb': { char: tengwarMap['umbar'] + tengwarMap['nasalizer'] },
    'mp': { char: tengwarMap['parma'] + tengwarMap['nasalizer'] },
    'nk': { char: tengwarMap['quesse'] + tengwarMap['nasalizer'] },
    'nc': { char: tengwarMap['quesse'] + tengwarMap['nasalizer'] }, // Same as nk
    'nq': { char: tengwarMap['unque'] },
    'n': { char: tengwarMap['nuumen'] },
    'm': { char: tengwarMap['malta'] },
    'r': { char: tengwarMap['roomen'] }, // Default to soft r; disambiguation will occur below
    'v': { char: tengwarMap['ampa'] },
    'w': { char: tengwarMap['vala'] },
    'rd': { char: tengwarMap['arda'] },
    'l': { char: tengwarMap['lambe'] },
    'ld': { char: tengwarMap['alda'] },
    's': { char: tengwarMap['silme'] },
    'z': { char: tengwarMap['essenuquerna'] },
    'sh': { char: tengwarMap['aha'] },
    'y': { char: tengwarMap['anna'] }, // Default to consonant y; disambiguation will occur below
    'gh': { char: tengwarMap['unque'] },
    'x': { char: tengwarMap['quesse'] + tengwarMap['left-hook'] },
    'j': { char: tengwarMap['anga'] },

    // Special vowel carriers for initial vowels
    'initial-a': { char: tengwarMap['telco'], tehta: tengwarMap['three-dots'] },
    'initial-e': { char: tengwarMap['telco'], tehta: tengwarMap['acute'] },
    'initial-i': { char: tengwarMap['telco'], tehta: tengwarMap['dot'] },
    'initial-o': { char: tengwarMap['telco'], tehta: tengwarMap['right-curl'] },
    'initial-u': { char: tengwarMap['telco'], tehta: tengwarMap['left-curl'] },
};

// Special cases for common English words
const specialWords = {
    'a': tengwarMap['osse'],
    'the': tengwarMap['extended-ando'],
    'of': tengwarMap['extended-umbar'],
    'and': tengwarMap['ando'] + tengwarMap['nasalizer'],
    'ofthe': tengwarMap['extended-umbar'] + tengwarMap['doubler'],
};

// Helper functions that use the CMU dictionary when available

function isSoftCUsingDict(word, index, pronunciation) {
    // If we have a dictionary pronunciation, decide based on phoneme content.
    // In CMU entries, a soft "c" is usually rendered as an S sound,
    // while a hard "c" appears as a K sound.
    if (pronunciation) {
        if (pronunciation.includes("S") && !pronunciation.includes("K")) {
            return true;
        }
    }
    // Otherwise, fall back to heuristic based on following letter.
    return isSoftC(word, index);
}

function isConsonantYUsingDict(word, index, pronunciation) {
    // In the CMU dictionary, a consonantal y is usually rendered as "Y"
    // while a vowel y often appears as a different vowel phoneme.
    if (index > 0 && 'aeiou'.includes(word[index - 1])) {
        return true;
    }
    if (pronunciation) {
        return !(!!pronunciation.includes("IY") || !!pronunciation.includes("AY"));
    }
    return isConsonantY(word, index);
}

function isHardRUsingDict(word, index, pronunciation) {
    // For now, we defer to the original heuristic for r.
    return isHardR(word, index);
}

function hasSilentEUsingDict(word, pronunciation) {
    if (pronunciation && word[word.length - 1].toLowerCase() === 'e') {
        // List of vowel phonemes in CMU dictionary
        const vowelsPhonemes = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"];
        const lastPhoneme = pronunciation[pronunciation.length - 1];
        // If the final phoneme is not one of the common vowel sounds,
        // we consider the final "e" to be silent.
        if (!vowelsPhonemes.includes(lastPhoneme)) {
            return true;
        }
    }
    return hasSilentE(word);
}

// Check tengwar status when page loads
document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.sendMessage({action: 'getTengwarStatus'}, function(response) {
        if (response && response.enabled) {
            tengwarEnabled = true;
            injectTengwarFont();
            processPage();
        }
    });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
    if (fontInjected) return;

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
            acceptNode: function(node) {
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
    text = text.replace(/\bof\s+the\b/gi, (match) => {
        return "ofthe";
    });

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

        // Process specific common words
        const lowerCaseWord = match[0].toLowerCase();
        if (specialWords[lowerCaseWord]) {
            fragments.push({
                text: transcribeToTengwar(match[0]),
                isTengwar: true,
                original: match[0]
            });
        } else {
            // Add the tengwar word (regular processing)
            fragments.push({
                text: transcribeToTengwar(match[0]),
                isTengwar: true,
                original: match[0]
            });
        }

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

    observer = new MutationObserver(function(mutations) {
        // Process in batches to improve performance
        const nodesToProcess = new Set();

        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
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
        { pattern: /^p(?=s|t)/i, silent: 'p' },  // silent p in psychology, pterodactyl
        { pattern: /^k(?=n)/i, silent: 'k' },    // silent k in knight, know
        { pattern: /^w(?=r)/i, silent: 'w' },    // silent w in write, wrong
    ];

    let processedWord = word;
    for (const { pattern } of silentPatterns) {
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

// Function to transcribe text to Tengwar
function transcribeToTengwar(text) {
    const lowerText = text.toLowerCase();
    if (specialWords[lowerText]) {
        return specialWords[lowerText];
    }

    const processedText = removeSilentLetters(text);

    // Attempt to get a pronunciation from the CMU dictionary.
    let pronunciation = null;
    if (dictionary[lowerText]) {
        // Assume the dictionary returns an array of pronunciations;
        // choose the first one.
        pronunciation = dictionary[lowerText];
    }

    const result = [];
    let i = 0;
    let vowel = '';

    while (i < processedText.length) {
        const char = processedText[i].toLowerCase();
        let found = false;

        // Check for multi-letter combinations (digraphs/trigraphs)
        for (let len = 3; len >= 2; len--) {
            if (i + len <= processedText.length) {
                const ngram = processedText.substring(i, i + len).toLowerCase();

                if (ngram === 'ng') {
                    if (isNgDigraph(processedText, i)) {
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
                } else if (ngram === 'nc') {
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
            if ('aeiou'.includes(char)) {
                if (vowel !== '') {
                    result.push(tengwarMap['telco']);
                    result.push(vowel);
                    vowel = '';
                }
                vowel = englishToTengwar[char].tehta;
                i++;
                continue;
            } else if (i > 0 && processedText[i] === processedText[i - 1]) {
                result.push(tengwarMap['doubler']);
                i++;
            } else if (char === 'c') {
                // Use the CMU dictionary (if available) to decide soft vs. hard c.
                if (isSoftCUsingDict(processedText, i, pronunciation)) {
                    // Soft c: use silmenuquerna
                    result.push(tengwarMap['silmenuquerna']);
                } else {
                    // Hard c: use quesse
                    result.push(englishToTengwar['c'].char);
                }
                i++;
            } else if (char === 'y') {
                // Use the dictionary to decide if y is consonantal or vowel.
                if (isConsonantYUsingDict(processedText, i, pronunciation)) {
                    result.push(englishToTengwar['y'].char);
                } else {
                    const yType = getYVowelType(processedText, i, pronunciation);
                    if (yType === 'long') {
                        if (vowel !== '') {
                            result.push(tengwarMap['telco']);
                            result.push(vowel);
                            vowel = '';
                        }
                        vowel = tengwarMap['caron'];
                        i++;
                        continue;
                    } else {
                        if (vowel !== '') {
                            result.push(tengwarMap['telco']);
                            result.push(vowel);
                            vowel = '';
                        }
                        vowel = tengwarMap['two-dots-below'];
                        i++;
                        continue;
                    }
                }
                i++;
            } else if (char === 'r') {
                if (isHardRUsingDict(processedText, i, pronunciation)) {
                    result.push(tengwarMap['oore']);
                } else {
                    result.push(englishToTengwar['r'].char);
                }
                i++;
            } else if (englishToTengwar[char] && englishToTengwar[char].char) {
                result.push(englishToTengwar[char].char);
                i++;
            } else {
                result.push(char);
                i++;
            }
        }
        if (vowel !== '') { // add the vowel
            if (i === 0 || !englishToTengwar[processedText[i - 1].toLowerCase()].char) { // add carrier if previous was also a vowel
                result.push(tengwarMap['telco']);
            }
            result.push(vowel);
            vowel = '';
        }
    }

    if (hasSilentEUsingDict(processedText, pronunciation)) {
        result.push(tengwarMap['dot-below']);
    } else if (vowel !== '') {
        if (vowel !== tengwarMap['two-dots-below']) { // no carrier for y
            result.push(tengwarMap['telco']);
        }
        result.push(vowel);
    }

    return result.join('');
}

// Check initial Tengwar status when extension loads
chrome.storage.sync.get('tengwarEnabled', function(data) {
    if (data.tengwarEnabled) {
        tengwarEnabled = true;
        // Wait a bit to ensure the page is loaded
        setTimeout(function() {
            injectTengwarFont();
            processPage();
        }, 1000); // Increased delay for better page load
    }
});
