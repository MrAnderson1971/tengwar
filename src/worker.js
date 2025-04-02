// Helper functions for heuristics (fallbacks)
import {
    commonDiphthongs,
    englishToTengwar,
    specialWords,
    tengwarMap,
    vowelPhonemePatterns,
    vowelPhonemes
} from "./mappings";
import {dictionary} from "cmu-pronouncing-dictionary";
import {alignLettersToPhonemes} from "./align";

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
            // ER is not silent
            if (alignmentByIndex[position + 1].phoneme && alignmentByIndex[position + 1].phoneme.includes('R')) {
                return false;
            }

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

    return commonDiphthongs.includes(possibleDiphthong);
}

// Function to get a cached or new pronunciation
function getPronunciation(word) {
    // Get from dictionary
    let pronunciation = null;
    if (dictionary[word.toLowerCase()]) {
        pronunciation = dictionary[word.toLowerCase()];
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

const cache = new Map();

function removeDiacritics(str) {
    return str.normalize('NFD')           // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
        .normalize('NFC');          // Normalize back (optional)
}

// Update the transcribeToTengwar function by modifying the handling of 'e'
export function transcribeToTengwar(text, debug = false) {
    if (cache.has(text)) {
        return cache.get(text);
    }
    const lowerText = text.toLowerCase();
    if (specialWords[lowerText]) {
        return specialWords[lowerText];
    }

    const processedText = removeDiacritics(removeSilentLetters(text));

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
    if (debug) {
        console.log(pronunciation, alignment);
    }

    const result = [];
    let i = 0;
    let vowelOnTop = null;

    while (i < processedText.length) {
        const char = processedText[i].toLowerCase();
        let found = false;

        // Check for diphthongs
        if ('aeiou'.includes(char) && isDiphthong(processedText, i, pronunciation, alignment)) {
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
                    if (ngram === 'nt' && i + 2 < processedText.length && processedText[i + 2] === 'h') { // nth case
                        break;
                    }
                    if (ngram === 'mp' && i + 2 < processedText.length && processedText[i + 2] === 'h') { // mph case
                        break;
                    }
                    result.push(englishToTengwar[ngram].char);
                    i += len;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            /*
            Not a vowel
            CK
            If both are C both pronunciations match
            */
            if (!'aeiou'.includes(processedText[i]) && i > 0 && (processedText[i] === processedText[i - 1] ||
                    processedText[i] === 'k' && processedText[i - 1] === 'c') &&
                !(processedText[i] === 'c' && processedText[i - 1] === 'c' &&
                    isSoftCImproved(processedText, i, pronunciation, alignment) !== isSoftCImproved(processedText, i - 1, pronunciation, alignment))) {
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

    const output = result.join('');
    cache.set(text, output);
    return output;
}
