
// Mapping based on the actual characters from the compiled LaTeX document
// This maps LaTeX commands to their corresponding characters in the Annatar font
export const tengwarMap = {
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
    'alda': 'm',        // \Talda
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
    'dot-below': 'É',   // \TTdotbelow - For silent e's
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
export const englishToTengwar = {
    // Basic vowels
    'a': {tehta: tengwarMap['three-dots']},
    'e': {tehta: tengwarMap['acute']},
    'i': {tehta: tengwarMap['dot']},
    'o': {tehta: tengwarMap['right-curl']},
    'u': {tehta: tengwarMap['left-curl']},

    // Basic consonants
    't': {char: tengwarMap['tinco']},
    'nt': {char: tengwarMap['tinco'] + tengwarMap['nasalizer']},
    'p': {char: tengwarMap['parma']},
    'c': {char: tengwarMap['quesse']}, // Default to hard c; disambiguation will occur below
    'nch': {char: tengwarMap['nuumen'] + tengwarMap['calma']}, // handle this case separately
    'ch': {char: tengwarMap['calma']},
    'k': {char: tengwarMap['quesse']},
    'q': {char: tengwarMap['quesse']},
    'qu': {char: tengwarMap['quesse'] + tengwarMap['tilde']},
    'd': {char: tengwarMap['ando']},
    'b': {char: tengwarMap['umbar']},
    'g': {char: tengwarMap['ungwe']},
    'ng': {char: tengwarMap['nwalme']}, // Default, we'll check context
    'th': {char: tengwarMap['thuule']},
    'f': {char: tengwarMap['formen']},
    'ph': {char: tengwarMap['formen']},
    'h': {char: tengwarMap['hyarmen']},
    'hw': {char: tengwarMap['hwesta']},
    'wh': {char: tengwarMap['hwesta-sindarinwa']},
    'nd': {char: tengwarMap['ando'] + tengwarMap['nasalizer']},
    'mb': {char: tengwarMap['umbar'] + tengwarMap['nasalizer']},
    'mp': {char: tengwarMap['parma'] + tengwarMap['nasalizer']},
    'nk': {char: tengwarMap['quesse'] + tengwarMap['nasalizer']},
    //'nc': { char: tengwarMap['quesse'] + tengwarMap['nasalizer'] }, // Same as nk
    'nq': {char: tengwarMap['unque']},
    'n': {char: tengwarMap['nuumen']},
    'm': {char: tengwarMap['malta']},
    'r': {char: tengwarMap['roomen']}, // Default to soft r; disambiguation will occur below
    'v': {char: tengwarMap['ampa']},
    'w': {char: tengwarMap['vala']},
    'rd': {char: tengwarMap['arda']},
    'l': {char: tengwarMap['lambe']},
    'ld': {char: tengwarMap['alda']},
    's': {char: tengwarMap['silme']},
    'z': {char: tengwarMap['essenuquerna']},
    'sh': {char: tengwarMap['aha']},
    'y': {char: tengwarMap['anna']}, // Default to consonant y; disambiguation will occur below
    'gh': {char: tengwarMap['unque']},
    'x': {char: tengwarMap['quesse'] + tengwarMap['left-hook']},
    'j': {char: tengwarMap['anga']},
};

// Special cases for common English words
export const specialWords = {
    'a': tengwarMap['osse'],
    'the': tengwarMap['extended-ando'],
    'of': tengwarMap['extended-umbar'],
    'and': tengwarMap['ando'] + tengwarMap['nasalizer'],
    'ofthe': tengwarMap['extended-umbar'] + tengwarMap['doubler'],
};


// Special multi-phoneme patterns (handling sounds that span multiple phonemes)
export const multiPhonemePatterns = {
    'EH1 R': ['air', 'are', 'ear', 'ere', 'eir', 'ar'],
    'EH0 R': ['air', 'are', 'ear', 'ere', 'eir', 'ar'],
    'EH2 R': ['air', 'are', 'ear', 'ere', 'eir', 'ar'],
    'AO1 R': ['or', 'ore', 'oor', 'our', 'oar'],
    'AO0 R': ['or', 'ore', 'oor', 'our', 'oar'],
    'AO2 R': ['or', 'ore', 'oor', 'our', 'oar'],
    'ER0': ['er', 'ir', 'ur', 'ear', 'or'],
    'ER1': ['er', 'ir', 'ur', 'ear', 'or'],
    'ER2': ['er', 'ir', 'ur', 'ear', 'or'],
    'IH0 R': ['eer', 'ear', 'ere', 'ir', 'ier'],
    'IH1 R': ['eer', 'ear', 'ere', 'ir', 'ier'],
    'IH2 R': ['eer', 'ear', 'ere', 'ir', 'ier'],
    'UH0 R': ['oor', 'our', 'ur'],
    'UH1 R': ['oor', 'our', 'ur'],
    'UH2 R': ['oor', 'our', 'ur'],
    'AY1 R': ['ire', 'ier', 'iar'],
    'AY0 R': ['ire', 'ier', 'iar'],
    'AY2 R': ['ire', 'ier', 'iar'],
    'AW1 R': ['our', 'ower'],
    'AW0 R': ['our', 'ower'],
    'AW2 R': ['our', 'ower'],
    'K S': ['x']
};

// Individual phoneme patterns
export const phonemeToLetterPatterns = {
    // Vowel phonemes
    'AA0': ['a', 'o'], 'AA1': ['a', 'o'], 'AA2': ['a', 'o'],
    'AE0': ['a'], 'AE1': ['a'], 'AE2': ['a'],
    'AH0': ['a', 'e', 'i', 'o', 'u'], 'AH1': ['a', 'e', 'i', 'o', 'u'], 'AH2': ['a', 'e', 'i', 'o', 'u'],
    'AO0': ['o', 'a', 'au', 'aw'], 'AO1': ['o', 'a', 'au', 'aw'], 'AO2': ['o', 'a', 'au', 'aw'],
    'AW0': ['ou', 'ow'], 'AW1': ['ou', 'ow'], 'AW2': ['ou', 'ow'],
    'AY0': ['i', 'y', 'ie', 'igh'], 'AY1': ['i', 'y', 'ie', 'igh'], 'AY2': ['i', 'y', 'ie', 'igh'],
    'EH0': ['e', 'ea', 'a'], 'EH1': ['e', 'ea', 'a'], 'EH2': ['e', 'ea', 'a'],
    'EY0': ['a', 'ai', 'ay', 'ei', 'ey'], 'EY1': ['a', 'ai', 'ay', 'ei', 'ey'], 'EY2': ['a', 'ai', 'ay', 'ei', 'ey'],
    'IH0': ['i', 'y', 'e'], 'IH1': ['i', 'y', 'e'], 'IH2': ['i', 'y', 'e'],
    'IY0': ['e', 'ee', 'ea', 'y', 'i'], 'IY1': ['e', 'ee', 'ea', 'y', 'i'], 'IY2': ['e', 'ee', 'ea', 'y', 'i'],
    'OW0': ['o', 'oa', 'ow'], 'OW1': ['o', 'oa', 'ow'], 'OW2': ['o', 'oa', 'ow'],
    'OY0': ['oi', 'oy'], 'OY1': ['oi', 'oy'], 'OY2': ['oi', 'oy'],
    'UH0': ['u', 'oo'], 'UH1': ['u', 'oo'], 'UH2': ['u', 'oo'],
    'UW0': ['oo', 'u', 'ew', 'ue', 'ui'], 'UW1': ['oo', 'u', 'ew', 'ue', 'ui'], 'UW2': ['oo', 'u', 'ew', 'ue', 'ui'],

    // Consonant phonemes
    'B': ['b'],
    'CH': ['ch', 'tch'],
    'D': ['d', 'ed'],
    'DH': ['th'],
    'F': ['f', 'ph', 'gh'],
    'G': ['g', 'gg', 'gh'],
    'HH': ['h'],
    'JH': ['j', 'g', 'dg', 'dge'],
    'K': ['c', 'k', 'ck', 'ch', 'q'],
    'L': ['l', 'll'],
    'M': ['m', 'mm'],
    'N': ['n', 'nn', 'kn', 'gn'],
    'NG': ['ng', 'n'],
    'P': ['p', 'pp'],
    'R': ['r', 'rr', 'wr'],
    'S': ['s', 'c', 'ss', 'ce', 'se'],
    'SH': ['sh', 'ti', 'ci', 'si', 'ch'],
    'T': ['t', 'tt', 'ed'],
    'TH': ['th'],
    'V': ['v', 'f'],
    'W': ['w', 'wh'],
    'Y': ['y', 'i', 'j'],
    'Z': ['z', 's', 'zz', 'x', 'ss'],
    'ZH': ['s', 'z', 'g']
};
