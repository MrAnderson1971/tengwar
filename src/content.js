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

// This function aligns English spelling with CMU dictionary phonemes
// It returns an array of {letter, phoneme} pairs for better disambiguation
function alignLettersToPhonemes(word, pronunciation) {
    if (!pronunciation) return null;

    const result = [];
    let letterIndex = 0;
    let phonemeIndex = 0;
    const phonemes = pronunciation.split(' ');

    // Convert word to lowercase for processing
    const lowercaseWord = word.toLowerCase();

    while (letterIndex < lowercaseWord.length && phonemeIndex < phonemes.length) {
        // Handle digraphs and trigraphs first (check ahead for multi-character sequences)
        let matched = false;

        // Check for known digraphs/trigraphs
        const digraphs = ['ng', 'th', 'sh', 'ch', 'ph', 'wh', 'qu', 'ck'];
        const trigraphs = ['tch'];

        // Try trigraphs first
        for (const trigraph of trigraphs) {
            if (letterIndex + trigraph.length <= lowercaseWord.length &&
                lowercaseWord.substring(letterIndex, letterIndex + trigraph.length) === trigraph) {

                // For example 'tch' corresponds to the 'CH' phoneme
                result.push({
                    letters: trigraph,
                    startIndex: letterIndex,
                    endIndex: letterIndex + trigraph.length - 1,
                    phoneme: phonemes[phonemeIndex]
                });

                letterIndex += trigraph.length;
                phonemeIndex++;
                matched = true;
                break;
            }
        }

        // If no trigraph matched, try digraphs
        if (!matched) {
            for (const digraph of digraphs) {
                if (letterIndex + digraph.length <= lowercaseWord.length &&
                    lowercaseWord.substring(letterIndex, letterIndex + digraph.length) === digraph) {

                    // Special handling for 'ng' digraph
                    if (digraph === 'ng') {
                        // Check if it's a true 'ng' digraph (NG) or n+g (N G)
                        // In the CMU dict, 'ng' digraph is typically represented as "NG"
                        if (phonemes[phonemeIndex] === 'NG') {
                            result.push({
                                letters: digraph,
                                startIndex: letterIndex,
                                endIndex: letterIndex + digraph.length - 1,
                                phoneme: 'NG',
                                isDigraph: true
                            });
                            letterIndex += 2;
                            phonemeIndex++;
                        } else {
                            // It's n+g, not a digraph
                            result.push({
                                letters: 'n',
                                startIndex: letterIndex,
                                endIndex: letterIndex,
                                phoneme: phonemes[phonemeIndex],
                                isDigraph: false
                            });
                            letterIndex++;
                            phonemeIndex++;
                            // We don't increment phonemeIndex again as 'g' will be handled in the next iteration
                        }
                    } else {
                        // Handle other digraphs
                        result.push({
                            letters: digraph,
                            startIndex: letterIndex,
                            endIndex: letterIndex + digraph.length - 1,
                            phoneme: phonemes[phonemeIndex],
                            isDigraph: true
                        });
                        letterIndex += digraph.length;
                        phonemeIndex++;
                    }

                    matched = true;
                    break;
                }
            }
        }

        // If no multi-character sequence matched, process single letter
        if (!matched) {
            // Skip silent letters (like k in 'know', e in 'make')
            if (isSilentLetter(lowercaseWord, letterIndex, phonemes, phonemeIndex)) {
                result.push({
                    letters: lowercaseWord[letterIndex],
                    startIndex: letterIndex,
                    endIndex: letterIndex,
                    phoneme: null,
                    isSilent: true
                });
                letterIndex++;
                // Don't increment phonemeIndex for silent letters
            } else {
                // Regular letter-to-phoneme mapping
                result.push({
                    letters: lowercaseWord[letterIndex],
                    startIndex: letterIndex,
                    endIndex: letterIndex,
                    phoneme: phonemes[phonemeIndex]
                });
                letterIndex++;
                phonemeIndex++;
            }
        }

        // Handle special case where one letter represents multiple phonemes
        // (like 'x' which is 'K S')
        if (lowercaseWord[letterIndex - 1] === 'x' && phonemes[phonemeIndex - 1] === 'K' &&
            phonemeIndex < phonemes.length && phonemes[phonemeIndex] === 'S') {
            // Update the previous entry
            result[result.length - 1].phoneme = 'K S';
            result[result.length - 1].isMultiPhoneme = true;
            phonemeIndex++; // Skip the next phoneme since we've handled it
        }
    }

    return result;
}

// Function to detect silent letters
function isSilentLetter(word, position, phonemes, phonemeIndex) {
    const letter = word[position];

    // Common silent letter patterns
    if (position === 0 && letter === 'k' && position + 1 < word.length && word[position + 1] === 'n') {
        return true; // Silent k in 'knight', 'know'
    }

    if (position === 0 && letter === 'p' && position + 1 < word.length &&
        (word[position + 1] === 's' || word[position + 1] === 't')) {
        return true; // Silent p in 'psychology', 'pterodactyl'
    }

    if (position === 0 && letter === 'g' && position + 1 < word.length && word[position + 1] === 'n') {
        return true; // Silent g in 'gnome'
    }

    return letter === 'e' && position === word.length - 1;
}

// Improved disambiguation for NG digraph
function isNgDigraphImproved(word, position, pronunciation) {
    if (!pronunciation) {
        // Fall back to the original heuristic if no pronunciation available
        return isNgDigraph(word, position);
    }

    const alignment = alignLettersToPhonemes(word, pronunciation);
    if (!alignment) {
        return isNgDigraph(word, position);
    }

    // First, check if there's a direct 'ng' entry at this position
    for (const entry of alignment) {
        if (entry.startIndex === position && entry.letters === 'ng') {
            // It's a digraph if it maps to a single NG phoneme
            return entry.isDigraph === true;
        }
    }

    // If we didn't find a direct 'ng' entry, check if there's an 'n' at this position
    // followed by a 'g' at the next position - this means it's NOT a digraph
    for (let i = 0; i < alignment.length - 1; i++) {
        if (alignment[i].startIndex === position && alignment[i].letters === 'n' &&
            alignment[i+1].startIndex === position + 1 && alignment[i+1].letters === 'g') {
            // We found separate 'n' and 'g' entries, so it's not a digraph
            return false;
        }
    }

    // Fall back to the original heuristic if we couldn't determine from alignment
    return isNgDigraph(word, position);
}

// Improved disambiguation for soft/hard C
function isSoftCImproved(word, position, pronunciation) {
    if (!pronunciation) {
        // Fall back to the original heuristic if no pronunciation available
        return isSoftC(word, position);
    }

    const alignment = alignLettersToPhonemes(word, pronunciation);
    if (!alignment) return isSoftC(word, position);

    // Find the entry for this position
    for (const entry of alignment) {
        if (entry.startIndex === position && entry.letters === 'c') {
            // In CMU dictionary, soft C typically has an S sound
            return entry.phoneme && entry.phoneme.startsWith('S');
        }
    }

    // Fall back to the original heuristic
    return isSoftC(word, position);
}

// Improved disambiguation for consonant Y
function isConsonantYImproved(word, position, pronunciation) {
    if (!pronunciation) {
        // Fall back to the original heuristic if no pronunciation available
        return isConsonantY(word, position);
    }

    const alignment = alignLettersToPhonemes(word, pronunciation);
    if (!alignment) return isConsonantY(word, position);

    // Find the entry for this position
    for (const entry of alignment) {
        if (entry.startIndex === position && entry.letters === 'y') {
            // In CMU dictionary, consonant Y is typically a 'Y' phoneme
            return entry.phoneme === 'Y';
        }
    }

    // Fall back to the original heuristic
    return isConsonantY(word, position);
}

// Improved detection of y vowel type (long vs short)
function getYVowelTypeImproved(word, position, pronunciation) {
    if (!pronunciation) {
        // Fall back to the original implementation
        return getYVowelType(word, position, pronunciation);
    }

    const alignment = alignLettersToPhonemes(word, pronunciation);
    if (!alignment) return getYVowelType(word, position, pronunciation);

    // Find the entry for this position
    for (const entry of alignment) {
        if (entry.startIndex === position && entry.letters === 'y') {
            // Check the specific phoneme for this 'y'
            if (entry.phoneme) {
                // Long Y sounds in CMU dict: 'AY', 'AY0', 'AY1', 'AY2'
                // These correspond to the 'y' sound in words like "my", "why", "sky"
                if (entry.phoneme.startsWith('AY')) {
                    return 'long';
                }

                // Short Y sounds in CMU dict: 'IY', 'IY0', 'IY1', 'IY2', 'IH', 'IH0', 'IH1', 'IH2'
                // These correspond to the 'y' sound in words like "happy", "quickly"
                if (entry.phoneme.startsWith('IY') || entry.phoneme.startsWith('IH')) {
                    return 'short';
                }
            }
        }
    }

    // Fall back to the original implementation
    return getYVowelType(word, position, pronunciation);
}

// Improved disambiguation for hard R
function isHardRImproved(word, position, pronunciation) {
    if (!pronunciation) {
        // Fall back to the original heuristic if no pronunciation available
        return isHardR(word, position);
    }

    const alignment = alignLettersToPhonemes(word, pronunciation);
    if (!alignment) return isHardR(word, position);

    // Find the entry for this position
    for (const entry of alignment) {
        if (entry.startIndex === position && entry.letters === 'r') {
            // Check surrounding phonetic context
            // Hard R typically appears in certain positions like post-vowel pre-consonant
            const phonemeIndex = alignment.indexOf(entry);
            const prevPhoneme = phonemeIndex > 0 ? alignment[phonemeIndex - 1].phoneme : null;
            const nextPhoneme = phonemeIndex < alignment.length - 1 ? alignment[phonemeIndex + 1].phoneme : null;

            // If previous phoneme is a vowel sound and next is not a vowel sound
            const isVowelPhoneme = (p) => p && /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/.test(p);

            return isVowelPhoneme(prevPhoneme) && (!nextPhoneme || !isVowelPhoneme(nextPhoneme));
        }
    }

    // Fall back to the original heuristic
    return isHardR(word, position);
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

    // List of vowel phonemes in CMU dictionary
    const vowelPhonemes = [
        "AA", "AA0", "AA1", "AA2",
        "AE", "AE0", "AE1", "AE2",
        "AH", "AH0", "AH1", "AH2",
        "AO", "AO0", "AO1", "AO2",
        "AW", "AW0", "AW1", "AW2",
        "AY", "AY0", "AY1", "AY2",
        "EH", "EH0", "EH1", "EH2",
        "ER", "ER0", "ER1", "ER2",
        "EY", "EY0", "EY1", "EY2",
        "IH", "IH0", "IH1", "IH2",
        "IY", "IY0", "IY1", "IY2",
        "OW", "OW0", "OW1", "OW2",
        "OY", "OY0", "OY1", "OY2",
        "UH", "UH0", "UH1", "UH2",
        "UW", "UW0", "UW1", "UW2"
    ];

    // Check if there's a final 'e' sound in the pronunciation
    const lastPhoneme = phonemes[phonemes.length - 1];
    const secondLastPhoneme = phonemes.length > 1 ? phonemes[phonemes.length - 2] : null;

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

// Function to detect if vowels are in the same syllable using pronunciation data
function isDiphthong(word, position, pronunciation) {
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

    // Common known diphthongs in English
    const knownDiphthongs = [
        'ai', 'ay', 'au', 'aw',
        'ei', 'ey', 'ea', 'eu', 'ew',
        'oi', 'oy', 'ou', 'ow',
        'ui', 'uy', 'ue'
    ];

    const possibleDiphthong = char + nextChar;

    // ALWAYS exclude common patterns that are never diphthongs
    // regardless of pronunciation data

    // 1. Specific words we know have syllable breaks
    const noTreatAsDiphthong = [
        'wikipedia', 'piano', 'video', 'radio', 'violin',
        'diet', 'quiet', 'client', 'dial', 'trial',
        'create', 'react', 'reality', 'theatre', 'area',
        'biography', 'geology', 'theology', 'theory'
    ];

    // Check if our word is in the blacklist or contains one of these words
    for (const exclude of noTreatAsDiphthong) {
        if (word.toLowerCase() === exclude ||
            word.toLowerCase().includes(exclude)) {
            return false;
        }
    }

    // 2. Pattern for ia/io/iu where typically i forms its own syllable
    // e.g., "di-a-" in "diagram", "biography", "di-o-" in "dioxide"
    if ((possibleDiphthong === 'ia' || possibleDiphthong === 'io' || possibleDiphthong === 'iu') &&
        position > 0 && !vowels.includes(word[position-1])) {
        // The pattern consonant+i+a/o/u is usually separate syllables
        return false;
    }

    // 3. Common prefixes with syllable breaks
    const prefixesWithBreaks = ['geo', 'neo', 'theo', 'bio'];
    for (const prefix of prefixesWithBreaks) {
        if (word.substring(0, prefix.length).toLowerCase() === prefix &&
            position === prefix.length - 1) {
            return false;
        }
    }

    // Use pronunciation data if available
    if (pronunciation) {
        // Split into phonemes
        const phonemes = pronunciation.split(' ');

        // We need a proper mapping to determine which letter corresponds to which phoneme
        const alignment = alignLettersToPhonemes(word, pronunciation);
        if (alignment) {
            // Check if the two vowels map to a single phoneme (true diphthong)
            // or map to separate phonemes (separate syllables)
            let foundFirstVowel = false;
            let firstVowelPhoneme = null;
            let secondVowelPhoneme = null;

            for (const entry of alignment) {
                if (entry.startIndex === position) {
                    foundFirstVowel = true;
                    firstVowelPhoneme = entry.phoneme;
                } else if (entry.startIndex === position + 1 && foundFirstVowel) {
                    secondVowelPhoneme = entry.phoneme;
                    break;
                }
            }

            // If both vowels map to the same phoneme, they're likely a diphthong
            if (firstVowelPhoneme && !secondVowelPhoneme) {
                // Check if the phoneme is a known diphthong phoneme
                const diphthongPhonemes = ["EY", "AY", "OY", "AW", "OW", "UW"];
                for (const dp of diphthongPhonemes) {
                    if (firstVowelPhoneme.startsWith(dp)) {
                        return true;
                    }
                }
            }

            // If both vowels have their own phonemes with different stress markers,
            // they're in different syllables
            if (firstVowelPhoneme && secondVowelPhoneme) {
                // Extract stress markers (0, 1, 2)
                const firstStress = firstVowelPhoneme.match(/[0-9]$/);
                const secondStress = secondVowelPhoneme.match(/[0-9]$/);

                // If both vowels have stress markers and they're different,
                // we know they're in separate syllables
                if (firstStress && secondStress && firstStress[0] !== secondStress[0]) {
                    return false;
                }

                // If they have the same stress or one is unstressed,
                // it's harder to determine
            }
        }
    }

    // Fallback to our list of known diphthongs
    // Let's only consider known diphthongs that frequently
    // appear as true diphthongs in English
    const commonDiphthongs = [
        'ai', 'ay', 'au', 'aw',  // as in "sail", "ray", "caught", "claw"
        'ei', 'ey',              // as in "vein", "they"
        'oi', 'oy',              // as in "coin", "boy"
        'ou', 'ow'               // as in "out", "cow"
    ];

    return commonDiphthongs.includes(possibleDiphthong);
}

// Get diphthong type based on second vowel
function getDiphthongType(word, position) {
    const nextChar = word[position + 1].toLowerCase();
    return nextChar;
}

// Handle diphthongs based on the rules:
// xa = x as diacritic + osse
// xe = x as diacritic + telco + dot underneath
// xi = treat i as consonant y
// xu = treat u as consonant w
// xo = use telco with first vowel diacritic + right-curl for 'o'
function handleDiphthong(word, position, result, vowel) {
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

// Update the main transcribeToTengwar function to use the improved disambiguation methods
function transcribeToTengwar(text) {
    const lowerText = text.toLowerCase();
    if (specialWords[lowerText]) {
        return specialWords[lowerText];
    }

    const processedText = removeSilentLetters(text);

    // Get pronunciation
    const pronunciation = getPronunciation(lowerText);

    const result = [];
    let i = 0;
    let vowel = '';

    while (i < processedText.length) {
        const char = processedText[i].toLowerCase();
        let found = false;

        // Check for diphthongs
        if ('aeiou'.includes(char) && isDiphthong(processedText, i, pronunciation)) {
            const charsToSkip = handleDiphthong(processedText, i, result, vowel);
            if (charsToSkip > 0) {
                i += charsToSkip;
                vowel = ''; // Reset vowel since we've handled it
                found = true;
                continue;
            }
        }

        // Check for multi-letter combinations (digraphs/trigraphs)
        for (let len = 3; len >= 2; len--) {
            if (i + len <= processedText.length) {
                const ngram = processedText.substring(i, i + len).toLowerCase();

                if (ngram === 'ng') {
                    if (isNgDigraphImproved(processedText, i, pronunciation)) {
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
            } else if (i > 0 && (processedText[i] === processedText[i - 1] ||
                    processedText[i] === 'k' && processedText[i - 1] === 'c')) {
                result.push(tengwarMap['doubler']);
                i++;
            } else if (char === 'c') {
                // Use improved soft c detection
                if (isSoftCImproved(processedText, i, pronunciation)) {
                    // Soft c: use silmenuquerna
                    result.push(tengwarMap['silmenuquerna']);
                } else {
                    // Hard c: use quesse
                    result.push(englishToTengwar['c'].char);
                }
                i++;
            } else if (char === 'y') {
                // Use improved consonantal y detection
                if (isConsonantYImproved(processedText, i, pronunciation)) {
                    result.push(englishToTengwar['y'].char);
                    i++;
                } else {
                    // Use improved vowel y type detection
                    const yType = getYVowelTypeImproved(processedText, i, pronunciation);
                    if (vowel !== '') {
                        result.push(tengwarMap['telco']);
                        result.push(vowel);
                        vowel = '';
                    }
                    if (yType === 'long') {
                        vowel = tengwarMap['caron'];
                    } else {
                        vowel = tengwarMap['two-dots-below'];
                    }
                    i++;
                    continue;
                }
            } else if (char === 'r') {
                // Use improved hard r detection
                if (isHardRImproved(processedText, i, pronunciation)) {
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

    // Handle silent e at the end of words
    if (hasSilentEImproved(processedText, pronunciation)) {
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
