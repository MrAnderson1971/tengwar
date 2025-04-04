// This function aligns CMU dictionary phonemes with English spelling
import {commonPatterns, phonemeToLetterPatterns, vowelPhonemes} from "./mappings";

const MATCH_SCORE = 2;       // Score for a likely letter-phoneme match
const MISMATCH_SCORE = -1;   // Penalty for an unlikely letter-phoneme mismatch
const GAP_PENALTY = -1;      // Penalty for inserting a gap (silent letter or multi-letter sound)
const VOWEL_GAP_PENALTY = -1.5; // Higher penalty for making vowels silent
// Bonus for matching a pre-defined multi-character pattern (higher score encourages using known patterns)
// Make it dependent on pattern length to prioritize longer, more specific patterns.
const PATTERN_MATCH_BASE_BONUS = 2.5; // Base bonus (reduced from 3)
const PATTERN_MATCH_LEN_BONUS = 0.8; // Additional bonus per character in the pattern (reduced from 1)
// --- DP Pointer Constants ---
const PTR_DIAGONAL = 1; // Match/Mismatch
const PTR_UP = 2;       // Gap in Phonemes (delete letter)
const PTR_LEFT = 3;     // Gap in Letters (insert phoneme)
const PTR_PATTERN = 4;  // Matched a commonPattern

/**
 * Modified scoring function for aligning a single letter and a single phoneme.
 * Considers phonemeToLetterPatterns for matches with improved vowel handling.
 */
function getSingleScore(letter, phoneme) {
    if (!letter || !phoneme) {
        return GAP_PENALTY; // Should be handled by gap logic, but as fallback
    }
    const basePhoneme = phoneme.replace(/[0-9]$/, ''); // Ignore stress for matching

    // Check if this letter is a common representation for this phoneme
    if (phonemeToLetterPatterns[basePhoneme] && phonemeToLetterPatterns[basePhoneme].includes(letter.toLowerCase())) {
        // Give higher score for vowel matches to prioritize them
        if (vowelPhonemes.includes(basePhoneme) && "aeiou".includes(letter.toLowerCase())) {
            return MATCH_SCORE + 1.5; // Boost vowel matches significantly
        }
        return MATCH_SCORE;
    }

    // Add common phonetic equivalents that might not be in the simple map
    if ((letter === 'f' || letter === 'ph') && basePhoneme === 'F') return MATCH_SCORE;
    if ((letter === 'k' || letter === 'c' || letter === 'q') && basePhoneme === 'K') return MATCH_SCORE;
    if (letter === 's' && basePhoneme === 'S') return MATCH_SCORE;
    if (letter === 'c' && basePhoneme === 'S') return MATCH_SCORE - 1; // Less likely than 's' but possible soft C
    if (letter === 'z' && basePhoneme === 'Z') return MATCH_SCORE;
    if (letter === 's' && basePhoneme === 'Z') return MATCH_SCORE - 1; // Less likely than 'z'

    // Basic vowel check (less reliable, but better than nothing)
    const vowels = "aeiou";
    const vowelPhonemePattern = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/;
    if (vowels.includes(letter.toLowerCase()) && vowelPhonemePattern.test(basePhoneme)) {
        return MATCH_SCORE - 0.5; // Improved score for generic vowel match
    }

    return MISMATCH_SCORE;
}

/**
 * Aligns letters of a word to its pronunciation phonemes using Needleman-Wunsch.
 * Incorporates commonPatterns for better multi-character alignment.
 * @param {string} word The word to align.
 * @param {string} pronunciation The CMU dictionary pronunciation (space-separated phonemes).
 * @returns {Array<{
 *   letters: string,
 *   startIndex: number,
 *   endIndex: number,
 *   phoneme: string|null,
 *   isSilent: boolean,
 *   pattern?: string,
 *   isMissingLetter?: boolean
 * }>|null} An array of alignment objects or null if inputs are invalid.
 */
export function alignLettersToPhonemes(word, pronunciation) {
    if (!word || !pronunciation) {
        return null;
    }

    const letters = word.toLowerCase().split('');
    const phonemes = pronunciation.split(' ');
    const N = letters.length;
    const M = phonemes.length;

    // DP table: dp[i][j] = max score aligning letters[0..i-1] and phonemes[0..j-1]
    const dp = Array(N + 1).fill(null).map(() => Array(M + 1).fill(-Infinity));
    // Pointer table: ptr[i][j] stores how dp[i][j] was achieved
    const ptr = Array(N + 1).fill(null).map(() => Array(M + 1).fill(null));

    // --- Initialization ---
    dp[0][0] = 0;
    for (let i = 1; i <= N; i++) {
        dp[i][0] = dp[i - 1][0] + GAP_PENALTY; // Aligning letters with gaps
        ptr[i][0] = {type: PTR_UP};
    }
    for (let j = 1; j <= M; j++) {
        dp[0][j] = dp[0][j - 1] + GAP_PENALTY; // Aligning phonemes with gaps
        ptr[0][j] = {type: PTR_LEFT};
    }

    // --- Fill DP Table ---
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
            let maxScore = -Infinity;
            let bestPtr = null;
            let patternInfo = null; // To store matched pattern details

            // 1. Check for pre-defined commonPatterns ending at (i, j)
            // Iterate commonPatterns from longest to shortest for better priority
            const sortedPatterns = [...commonPatterns].sort((a, b) => b.letters.length - a.letters.length);

            for (const pattern of sortedPatterns) {
                const p_letters = pattern.letters;
                const p_phonemes = pattern.phonemes;
                const p_len_l = p_letters.length;
                const p_len_p = p_phonemes.length;

                // Check if the pattern fits within the current indices
                if (i >= p_len_l && j >= p_len_p && p_len_l > 0) { // Ensure pattern has letters
                    // Special case for the "ed" pattern when it's being used as a past tense suffix
                    // If the "ed" pattern has single phoneme ['D'] or ['T'] and it's not at the end of a word, skip it
                    if (p_letters.toLowerCase() === 'ed' &&
                        p_phonemes.length === 1 &&
                        (p_phonemes[0] === 'D' || p_phonemes[0] === 'T') &&
                        i !== N) {
                        continue; // Skip this pattern if it's not at the end of the word
                    }

                    // Extract substrings/slices to check for match
                    const wordSegment = letters.slice(i - p_len_l, i).join('');
                    const phonemeSegment = phonemes.slice(j - p_len_p, j);

                    // Compare (case-insensitive for letters)
                    // Ensure phoneme lengths match OR pattern has zero phonemes (e.g., silent 'gh')
                    if (wordSegment.toLowerCase() === p_letters.toLowerCase() &&
                        (p_len_p === 0 || (p_len_p === phonemeSegment.length && p_phonemes.every((p, idx) => p === phonemeSegment[idx])))
                    ) {

                        const patternBonus = PATTERN_MATCH_BASE_BONUS + (PATTERN_MATCH_LEN_BONUS * p_len_l);
                        // Handle zero-phoneme patterns (like silent gh) - ensure we don't access dp[-1]
                        const prev_dp_score = (i - p_len_l >= 0 && j - p_len_p >= 0) ? dp[i - p_len_l][j - p_len_p] : dp[0][0];
                        const score = prev_dp_score + patternBonus;

                        if (score > maxScore) {
                            maxScore = score;
                            bestPtr = PTR_PATTERN;
                            patternInfo = {letters: p_letters, phonemes: p_phonemes, len_l: p_len_l, len_p: p_len_p};
                        }
                    }
                }
            } // End pattern check loop

            // 2. Consider standard single-step moves (match/mismatch, gaps) only if a pattern wasn't the best choice OR equally good
            // Diagonal: Match/Mismatch letter[i-1] with phoneme[j-1]
            const scoreDiag = dp[i - 1][j - 1] + getSingleScore(letters[i - 1], phonemes[j - 1]);
            if (scoreDiag >= maxScore) { // Use >= to allow diagonal match if equal to pattern
                // Avoid overriding a *better* pattern match found above
                if (scoreDiag > maxScore || bestPtr !== PTR_PATTERN) {
                    maxScore = scoreDiag;
                    bestPtr = PTR_DIAGONAL;
                    patternInfo = null; // Reset pattern info if standard move is better or equal
                }
            }

            // Up: Gap in phonemes (letter[i-1] is silent or part of multi-letter sound)
            // Apply higher penalty for vowels being silent
            const isVowel = "aeiou".includes(letters[i - 1].toLowerCase());
            const gapPenalty = isVowel ? VOWEL_GAP_PENALTY : GAP_PENALTY;
            const scoreUp = dp[i - 1][j] + gapPenalty;

            if (scoreUp >= maxScore) { // Use >=
                if (scoreUp > maxScore || (bestPtr !== PTR_PATTERN && bestPtr !== PTR_DIAGONAL)) {
                    maxScore = scoreUp;
                    bestPtr = PTR_UP;
                    patternInfo = null;
                }
            }

            // Left: Gap in letters (phoneme[j-1] spans multiple letters or missing letter)
            // Apply higher penalty for vowel phonemes with missing letters
            const isVowelPhoneme = phonemes[j - 1].match(/^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[0-9]?/);
            const phonemeGapPenalty = isVowelPhoneme ? VOWEL_GAP_PENALTY : GAP_PENALTY;
            const scoreLeft = dp[i][j - 1] + phonemeGapPenalty;

            if (scoreLeft >= maxScore) { // Use >=
                if (scoreLeft > maxScore || (bestPtr !== PTR_PATTERN && bestPtr !== PTR_DIAGONAL && bestPtr !== PTR_UP)) {
                    maxScore = scoreLeft;
                    bestPtr = PTR_LEFT;
                    patternInfo = null;
                }
            }

            // Store results for dp[i][j]
            dp[i][j] = maxScore;
            // Ensure ptr[i][j] is assigned a valid pointer type
            switch (bestPtr) {
                case PTR_PATTERN:
                    ptr[i][j] = {type: PTR_PATTERN, info: patternInfo};
                    break;
                case PTR_DIAGONAL:
                    ptr[i][j] = {type: PTR_DIAGONAL};
                    break;
                case PTR_UP:
                    ptr[i][j] = {type: PTR_UP};
                    break;
                case PTR_LEFT:
                    ptr[i][j] = {type: PTR_LEFT};
                    break;
                default:
                    // Should not happen if initialization is correct, but as a fallback
                    console.warn("No valid pointer found for dp[", i, "][", j, "]");
                    // Default to diagonal as a guess, or handle error
                    ptr[i][j] = {type: PTR_DIAGONAL};
            }
        } // end for j
    } // end for i

    // --- Traceback ---
    const alignment = [];
    let current_i = N;
    let current_j = M;
    let currentWordIndex = word.length; // Keep track of original word index

    while (current_i > 0 || current_j > 0) {
        if (!ptr[current_i] || !ptr[current_i][current_j]) {
            console.error("Alignment error: Hit null or invalid pointer during traceback at", current_i, current_j);
            // Attempt recovery or break; returning partial might be okay?
            break; // Avoid infinite loop
        }
        const move = ptr[current_i][current_j];

        if (move.type === PTR_PATTERN) {
            const {info} = move;
            // Ensure info exists (it should if type is PTR_PATTERN)
            if (!info) {
                console.error("Alignment Error: PTR_PATTERN move without info at", current_i, current_j);
                // Fallback: treat as diagonal? Or break. Let's break.
                break;
            }
            const patternLetters = info.letters;
            const patternPhonemes = info.phonemes;
            const len_l = info.len_l;
            const len_p = info.len_p;

            // Add alignment entries for each letter in the pattern
            for (let k = len_l - 1; k >= 0; k--) {
                const letterIndex = current_i - len_l + k;
                // Simple 1-to-1 within pattern, null phoneme if letters > phonemes
                // Ensure we don't access negative phoneme index if len_p is 0
                const phoneme = (len_p > 0 && k < len_p) ? patternPhonemes[k] : null;
                const letter = letters[letterIndex];
                currentWordIndex--;
                alignment.push({
                    letters: letter,
                    startIndex: currentWordIndex,
                    endIndex: currentWordIndex,
                    phoneme: phoneme,
                    // isSilent based on whether a phoneme was assigned OR if the pattern is explicitly silent (len_p == 0)
                    isSilent: phoneme === null || len_p === 0,
                    pattern: patternLetters // Mark which pattern it belongs to
                });
            }
            current_i -= len_l;
            current_j -= len_p;

        } else if (move.type === PTR_DIAGONAL) {
            // Ensure we don't go out of bounds
            if (current_i <= 0 || current_j <= 0) {
                console.error("Alignment Error: Diagonal move attempted at boundary", current_i, current_j);
                break;
            }
            currentWordIndex--;
            alignment.push({
                letters: letters[current_i - 1],
                startIndex: currentWordIndex,
                endIndex: currentWordIndex,
                phoneme: phonemes[current_j - 1],
                isSilent: false
            });
            current_i--;
            current_j--;
        } else if (move.type === PTR_UP) {
            if (current_i <= 0) {
                console.error("Alignment Error: Up move attempted at boundary", current_i, current_j);
                break;
            }
            // Gap in phonemes -> letter is silent
            currentWordIndex--;
            alignment.push({
                letters: letters[current_i - 1],
                startIndex: currentWordIndex,
                endIndex: currentWordIndex,
                phoneme: null, // Explicitly null
                isSilent: true
            });
            current_i--;
        } else if (move.type === PTR_LEFT) {
            if (current_j <= 0) {
                console.error("Alignment Error: Left move attempted at boundary", current_i, current_j);
                break;
            }
            // Gap in letters -> phoneme spans multiple letters or issue
            // Add placeholder. Might need refinement based on usage.
            alignment.push({
                letters: '', // No specific letter
                startIndex: currentWordIndex, // Position 'before' this phoneme would map
                endIndex: currentWordIndex,
                phoneme: phonemes[current_j - 1],
                isSilent: false, // It's a sound, just not clearly mapped to one letter here
                isMissingLetter: true // Flag this situation
            });
            current_j--;
        } else {
            console.error("Alignment error: Unknown pointer type during traceback at", current_i, current_j, "Type:", move.type);
            break; // Avoid infinite loop
        }
    } // End while loop

    // The traceback builds the alignment in reverse order
    return alignment.reverse();
}
