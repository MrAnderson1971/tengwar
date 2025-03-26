// Import the pronunciation library
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
    'arda': 'i',        // \Tarda
    'lambe': 'j',       // \Tlambe
    'alda': 'k',        // \Talda
    'silme': '8',       // \Tsilme
    'silmenuquerna': 'i', // \Tsilmenuquerna
    'esse': ';',        // \Tesse
    'essenuquerna': ',', // \Tessenuquerna
    'hyarmen': '8',     // \Thyarmen
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

// English mode mapping for phonemes
const phonemeToTengwar = {
    // Vowels
    'AA': {tehta: tengwarMap['three-dots']},  // 'a' in 'father'
    'AE': {tehta: tengwarMap['three-dots']},  // 'a' in 'cat'
    'AH': {tehta: tengwarMap['three-dots']},  // 'u' in 'but'
    'AO': {tehta: tengwarMap['right-curl']},  // 'o' in 'dog'
    'AW': {tehta: tengwarMap['left-curl']},   // 'ow' in 'cow'
    'AY': {tehta: tengwarMap['caron']},       // 'y' in 'fly'
    'EH': {tehta: tengwarMap['acute']},       // 'e' in 'red'
    'ER': {tehta: tengwarMap['acute']},       // 'ur' in 'fur'
    'EY': {tehta: tengwarMap['acute']},       // 'a' in 'day'
    'IH': {tehta: tengwarMap['two-dots-below']}, // 'i' in 'sit'
    'IY': {tehta: tengwarMap['dot']},         // 'ee' in 'see'
    'OW': {tehta: tengwarMap['right-curl']},  // 'o' in 'go'
    'OY': {tehta: tengwarMap['right-curl']},  // 'oy' in 'boy'
    'UH': {tehta: tengwarMap['left-curl']},   // 'oo' in 'book'
    'UW': {tehta: tengwarMap['left-curl']},   // 'oo' in 'food'

    // Silent e
    'E': {tehta: tengwarMap['dot-below']},    // Silent 'e'

    // Consonants
    'B': {char: tengwarMap['umbar']},
    'CH': {char: tengwarMap['calma']},
    'D': {char: tengwarMap['ando']},
    'DH': {char: tengwarMap['ando']},         // 'th' in 'this'
    'F': {char: tengwarMap['formen']},
    'G': {char: tengwarMap['ungwe']},
    'HH': {char: tengwarMap['hyarmen']},      // 'h'
    'JH': {char: tengwarMap['anga']},         // 'j' in 'joy'
    'K': {char: tengwarMap['quesse']},        // Hard 'c' or 'k'
    'L': {char: tengwarMap['lambe']},
    'M': {char: tengwarMap['malta']},
    'N': {char: tengwarMap['nuumen']},
    'NG': {char: tengwarMap['nwalme']},       // 'ng' in 'sing'
    'P': {char: tengwarMap['parma']},
    'R': {char: tengwarMap['oore']},          // Hard 'r'
    'RR': {char: tengwarMap['roomen']},       // Soft 'r'
    'S': {char: tengwarMap['silme']},         // Also for soft 'c'
    'SH': {char: tengwarMap['aha']},          // 'sh'
    'T': {char: tengwarMap['tinco']},
    'TH': {char: tengwarMap['thuule']},       // 'th' in 'thin'
    'V': {char: tengwarMap['ampa']},
    'W': {char: tengwarMap['vala']},
    'Y': {char: tengwarMap['anna']},          // Consonant 'y'
    'Z': {char: tengwarMap['esse']},
    'ZH': {char: tengwarMap['essenuquerna']}, // 's' in 'measure'

    // Nasalized consonants
    'NT': {char: tengwarMap['tinco'] + tengwarMap['nasalizer']},
    'ND': {char: tengwarMap['ando'] + tengwarMap['nasalizer']},
    'MP': {char: tengwarMap['parma'] + tengwarMap['nasalizer']},
    'MB': {char: tengwarMap['umbar'] + tengwarMap['nasalizer']},
    'NK': {char: tengwarMap['quesse'] + tengwarMap['nasalizer']}, // Also for 'nc'
    'NGN': {char: tengwarMap['ungwe'] + tengwarMap['nasalizer']}, // Nasalized 'ng'
};

// Special cases for common English words
const specialWords = {
    'a': tengwarMap['osse'],
    'the': tengwarMap['extended-ando'],
    'of': tengwarMap['extended-umbar'],
    'ofthe': tengwarMap['extended-umbar'] + tengwarMap['doubler'],
    'and': tengwarMap['ando'] + tengwarMap['nasalizer'],
};

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
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
        },
        false
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
        fragments.push({
            text: tengwarMap["extended-umbar"] + tengwarMap["doubler"], // extended umbar doubled
            isTengwar: true,
            original: match
        });
        return "";
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
        if (lowerCaseWord === "a" || lowerCaseWord === "the" ||
            lowerCaseWord === "of" || lowerCaseWord === "and") {
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

// Get phonemes for a word
function getPhonemes(word) {
    const lowerWord = word.toLowerCase();

    // Check cache first
    if (pronunciationCache.has(lowerWord)) {
        return pronunciationCache.get(lowerWord);
    }

    // Get pronunciation from CMU dict
    let phones = [];
    try {
        // Try to get pronunciation from the dictionary
        if (dictionary[lowerWord]) {
            // cmu-pronouncing-dictionary format
            phones = dictionary[lowerWord].split(' ');
        }
    } catch (e) {
        console.error('Error getting pronunciation for:', word, e);
    }

    // If no pronunciation found, use fallback
    if (phones.length === 0) {
        // Use our fallback method
        phones = fallbackPhonemeGenerator(lowerWord);
    }

    // Cache result
    pronunciationCache.set(lowerWord, phones);
    return phones;
}

// Fallback phoneme generator for words not in the dictionary
function fallbackPhonemeGenerator(word) {
    const phones = [];
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const silentPatterns = [
        {pattern: /^p(?=[st])/i, silent: 'p'},  // silent p in psychology, pterodactyl
        {pattern: /^k(?=n)/i, silent: 'k'},    // silent k in knight, know
        {pattern: /^w(?=r)/i, silent: 'w'},    // silent w in write, wrong
        {pattern: /e$/i, silent: 'e'},         // silent e at end of words
    ];

    // Remove silent letters based on patterns
    let processedWord = word;
    for (const {pattern, silent} of silentPatterns) {
        if (pattern.test(processedWord)) {
            processedWord = processedWord.replace(pattern, '');
        }
    }

    // Process each character
    for (let i = 0; i < processedWord.length; i++) {
        const char = processedWord[i];
        const nextChar = i < processedWord.length - 1 ? processedWord[i + 1] : null;
        const prevChar = i > 0 ? processedWord[i - 1] : null;

        if (char === 'c') {
            // Detect soft c (before e, i, y) vs hard c
            if (nextChar && ['e', 'i', 'y'].includes(nextChar)) {
                phones.push('S'); // Soft c sound (like in 'cease')
            } else {
                phones.push('K'); // Hard c sound (like in 'cat')
            }
        } else if (char === 'y') {
            // Consonant y at start of word or syllable
            if (i === 0 || (prevChar && !vowels.includes(prevChar))) {
                phones.push('Y'); // Consonant y
            } else {
                // Vowel y - differentiate between short i and long y
                if (i === processedWord.length - 1 ||
                    (nextChar && vowels.includes(nextChar))) {
                    phones.push('AY'); // Long y sound (hypothesis)
                } else {
                    phones.push('IH'); // Short i sound (quickly)
                }
            }
        } else if (char === 'n' && nextChar === 'g') {
            // Handle ng - check if it's a digraph or separate letters
            const nextNextChar = i < processedWord.length - 2 ? processedWord[i + 2] : null;
            // If ng is at end of word or followed by vowel, likely a digraph
            if (i === processedWord.length - 2 || (nextNextChar && vowels.includes(nextNextChar))) {
                phones.push('NG');
                i++; // Skip the 'g'
            } else {
                phones.push('N'); // Just the 'n' sound
            }
        } else if (char === 'r') {
            // Differentiate between hard and soft r
            if (prevChar && vowels.includes(prevChar) && (!nextChar || !vowels.includes(nextChar))) {
                phones.push('R'); // Hard r (as in 'car')
            } else {
                phones.push('RR'); // Soft r (as in 'room')
            }
        } else if (vowels.includes(char)) {
            // Just add the vowel phone
            phones.push(char.toUpperCase());
        } else {
            // Add any other consonant
            phones.push(char.toUpperCase());
        }
    }

    return phones;
}

// Function to transcribe text to Tengwar
function transcribeToTengwar(text) {
    // Check for special cases
    const lowerText = text.toLowerCase();
    if (specialWords[lowerText]) {
        return specialWords[lowerText];
    }

    // Get phonemes for this word
    const phonemes = getPhonemes(text);

    // Convert phonemes to Tengwar
    const result = [];
    let currentVowelTehta = null;

    // Process phonemes
    for (let i = 0; i < phonemes.length; i++) {
        const phoneme = phonemes[i];
        const mapping = phonemeToTengwar[phoneme];

        if (!mapping) {
            console.warn(`No mapping for phoneme: ${phoneme} in word: ${text}`);
            continue;
        }

        // If this is a vowel tehta, store it for the next consonant
        if (mapping.tehta) {
            if (!phonemeToTengwar[phonemes[i - 1]] || !phonemeToTengwar[phonemes[i - 1]].char) {
                // Previous phoneme isn't a consonant - use telco carrier
                result.push(tengwarMap['telco']);
                result.push(mapping.tehta);
            } else {
                // Store for next consonant or add to previous consonant
                currentVowelTehta = mapping.tehta;

                // If this is the last phoneme, add it to the previous consonant
                if (i === phonemes.length - 1 && result.length > 0) {
                    result.push(currentVowelTehta);
                    currentVowelTehta = null;
                }
            }
        }
        // If this is a consonant
        else if (mapping.char) {
            result.push(mapping.char);

            // Add any pending vowel tehta
            if (currentVowelTehta) {
                result.push(currentVowelTehta);
                currentVowelTehta = null;
            }
        }
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
