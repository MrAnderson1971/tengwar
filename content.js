// Store original text for each element
const originalTextMap = new WeakMap();
let fontInjected = false;

// Check tengwar status when page loads
document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({action: 'getTengwarStatus'}, function(response) {
    if (response && response.enabled) {
      transcribePageToTengwar();
    }
  });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateTengwarStatus') {
    if (request.enabled) {
      transcribePageToTengwar();
    } else {
      location.reload();
    }
  }
});

// Function to inject Tengwar font and additional CSS
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
    
    /* Create styles for punctuation and numbers with custom classes */
    .tengwar-text .tengwar-num-0 { font-family: sans-serif !important; content: '0'; }
    .tengwar-text .tengwar-num-1 { font-family: sans-serif !important; content: '1'; }
    .tengwar-text .tengwar-num-2 { font-family: sans-serif !important; content: '2'; }
    .tengwar-text .tengwar-num-3 { font-family: sans-serif !important; content: '3'; }
    .tengwar-text .tengwar-num-4 { font-family: sans-serif !important; content: '4'; }
    .tengwar-text .tengwar-num-5 { font-family: sans-serif !important; content: '5'; }
    .tengwar-text .tengwar-num-6 { font-family: sans-serif !important; content: '6'; }
    .tengwar-text .tengwar-num-7 { font-family: sans-serif !important; content: '7'; }
    .tengwar-text .tengwar-num-8 { font-family: sans-serif !important; content: '8'; }
    .tengwar-text .tengwar-num-9 { font-family: sans-serif !important; content: '9'; }
    
    /* Add additional CSS to exclude numbers from Tengwar transformation */
    .tengwar-text span.original-char {
      font-family: inherit !important; 
    }
  `;
  document.head.appendChild(style);
  fontInjected = true;
}

// Function to transcribe all text on the page
function transcribePageToTengwar() {
  // Inject Tengwar font
  injectTengwarFont();

  // Process all text nodes
  processTextNodesInElement(document.body);

  // Check for mutations to handle dynamically added content
  setupMutationObserver();
}

// Set up a MutationObserver to handle dynamically added content
let observer = null;
function setupMutationObserver() {
  if (observer) return;

  observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        // Process newly added nodes
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              !node.classList.contains('original-char')) {
            processTextNodesInElement(node);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process text nodes in a specific element
function processTextNodesInElement(element) {
  if (isElementToSkip(element)) return;

  // For elements that shouldn't have their structure changed
  if (element.nodeName.toLowerCase() === 'input' ||
      element.nodeName.toLowerCase() === 'textarea') {
    return;
  }

  // First process child elements
  Array.from(element.children).forEach(child => {
    processTextNodesInElement(child);
  });

  // Then process direct text nodes
  const childNodes = element.childNodes;
  const textNodes = [];

  // Collect text nodes first
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
      textNodes.push(node);
    }
  }

  // Then process each text node
  textNodes.forEach(node => {
    processTextNode(node);
  });
}

// Process a single text node
function processTextNode(textNode) {
  // Store the original text
  if (!originalTextMap.has(textNode)) {
    originalTextMap.set(textNode, textNode.nodeValue);
  }

  const text = textNode.nodeValue;
  const parent = textNode.parentNode;

  // Don't process if parent is already processed or should be skipped
  if (parent.hasAttribute('data-tengwar-processed') || isElementToSkip(parent)) {
    return;
  }

  // Set the flag to indicate this element has been processed
  parent.setAttribute('data-tengwar-processed', 'true');

  // Create a document fragment to hold our processed content
  const fragment = document.createDocumentFragment();

  // Split the text into segments (words and non-words)
  // This regex matches words (sequences of letters) and non-words (everything else)
  const segments = text.split(/([a-zA-Z]+|[^a-zA-Z]+)/g).filter(Boolean);

  segments.forEach(segment => {
    // Check if segment is a word (contains only letters)
    if (/^[a-zA-Z]+$/.test(segment)) {
      // This is a word - create a span with tengwar-text class
      const wordSpan = document.createElement('span');
      wordSpan.classList.add('tengwar-text');
      wordSpan.textContent = transcribeToTengwar(segment);
      fragment.appendChild(wordSpan);
    } else {
      // This is punctuation, whitespace, or numbers - keep as is
      fragment.appendChild(document.createTextNode(segment));
    }
  });

  // Replace the original text node with our processed fragment
  parent.replaceChild(fragment, textNode);
}

// Function to check if an element should be skipped
function isElementToSkip(element) {
  if (!element) return true;

  const tagName = element.tagName.toLowerCase();
  const skipTags = ['script', 'style', 'noscript', 'iframe', 'canvas', 'svg', 'math', 'code', 'pre', 'textarea', 'input', 'select', 'option'];

  return skipTags.includes(tagName) ||
      element.classList.contains('tengwar-skip') ||
      element.classList.contains('original-char') ||
      element.contentEditable === 'true';
}

// Function to transcribe text to Tengwar
function transcribeToTengwar(text) {
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

    // Tehtar (diacritical marks)
    'three-dots': 'E',  // \TTthreedots (a)
    'acute': 'R',       // \TTacute (e)
    'dot': 'T',         // \TTdot (i)
    'right-curl': 'Y',  // \TTrightcurl (o)
    'left-curl': 'U',   // \TTleftcurl (u)
    'nasalizer': 'p',   // \TTnasalizer
    'doubler': ';',     // \TTdoubler
    'tilde': 'ê',       // \TTtilde
    'dot-below': 'Ê',   // \TTdotbelow
    'caron': 'Ù',       // \TTcaron
    'two-dots-below': 'Í', // \TTtwodotsbelow
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
    'nt' : {char : tengwarMap['tinco'] + tengwarMap['nasalizer']},
    'p': { char: tengwarMap['parma'] },
    'c': { char: tengwarMap['silmenuquerna'] },
    'ch': {char: tengwarMap['calma']},
    'k': { char: tengwarMap['quesse'] },
    'q': { char: tengwarMap['quesse'] },
    'qu': {char: tengwarMap['quesse'] + tengwarMap['tilde'] },
    'd': { char: tengwarMap['ando'] },
    'b': { char: tengwarMap['umbar'] },
    'g': { char: tengwarMap['ungwe'] },
    'ng': { char: tengwarMap['nwalme'] },
    'th': { char: tengwarMap['thuule'] },
    'f': { char: tengwarMap['formen'] },
    'ph': {char: tengwarMap['formen']},
    'h': { char: tengwarMap['hyarmen'] },
    'hw': { char: tengwarMap['hwesta'] },
    'wh': { char: tengwarMap['hwesta'] },
    'nd': { char: tengwarMap['ando'] + tengwarMap['nasalizer'] },
    'mb': { char: tengwarMap['umbar'] + tengwarMap['nasalizer'] },
    'mp' : {char : tengwarMap['parma'] + tengwarMap['nasalizer'] },
    'nk': { char: tengwarMap['quesse'] + tengwarMap['nasalizer'] },
    'nq': { char: tengwarMap['unque'] },
    'n': { char: tengwarMap['nuumen'] },
    'm': { char: tengwarMap['malta'] },
    //'ny': { char: tengwarMap['noldo'] },
    //'nw': { char: tengwarMap['nwalme'] },
    'r': { char: tengwarMap['oore'] },
    'v': { char: tengwarMap['ampa'] },
    'w': { char: tengwarMap['vala'] },
    //'ro': { char: tengwarMap['roomen'] },
    'rd': { char: tengwarMap['arda'] },
    'l': { char: tengwarMap['lambe'] },
    'ld': { char: tengwarMap['alda'] },
    's': { char: tengwarMap['silme'] },
    'z': { char: tengwarMap['essenuquerna'] },
    'sh': { char: tengwarMap['aha'] },
    'y': { char: tengwarMap['anna'] },
    'gh' : {char: tengwarMap['unque'] },
    'x' : {char: tengwarMap['quesse'] + tengwarMap['left-hook']},
    'j': {char: tengwarMap['anga']},

    // Special vowel carriers for initial vowels
    'initial-a': { char: tengwarMap['telco'], tehta: tengwarMap['three-dots'] },
    'initial-e': { char: tengwarMap['telco'], tehta: tengwarMap['acute'] },
    'initial-i': { char: tengwarMap['telco'], tehta: tengwarMap['dot'] },
    'initial-o': { char: tengwarMap['telco'], tehta: tengwarMap['right-curl'] },
    'initial-u': { char: tengwarMap['telco'], tehta: tengwarMap['left-curl'] },
  };

  // Process the text word by word - only process letters
  if (!/^[a-zA-Z]+$/.test(text)) {
    return text; // Do not process if it contains non-letters
  }

  const processedWord = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i].toLowerCase();

    // Check if this character is a vowel
    if ('aeiou'.includes(char)) {
      // If this is a vowel, we need to determine where to place it

      // Case 1: It's the last character in the word - use carrier
      if (i === text.length - 1) {
        processedWord.push(tengwarMap['telco']);
        processedWord.push(englishToTengwar[char].tehta);
        i++;
        continue;
      }

      // Case 2: It's followed by another vowel - use carrier
      if ('aeiou'.includes(text[i + 1].toLowerCase())) {
        processedWord.push(tengwarMap['telco']);
        processedWord.push(englishToTengwar[char].tehta);
        i++;
        continue;
      }

      // Case 3: It's followed by a consonant - the tehta goes on the following consonant
      // We'll handle this in the consonant processing, so just save the vowel and move on
      const vowelTehta = englishToTengwar[char].tehta;
      i++;

      // Look for consonant digraphs/trigraphs that follow this vowel
      let found = false;
      for (let len = 3; len >= 2; len--) {
        if (i + len <= text.length) {
          const ngram = text.substring(i, i + len).toLowerCase();
          if (englishToTengwar[ngram] && englishToTengwar[ngram].char) {
            processedWord.push(englishToTengwar[ngram].char);
            processedWord.push(vowelTehta); // Add the vowel tehta to this consonant
            i += len;
            found = true;
            break;
          }
        }
      }

      // If we didn't find a consonant digraph/trigraph, look for a single consonant
      if (!found && i < text.length) {
        const nextChar = text[i].toLowerCase();
        if (englishToTengwar[nextChar] && englishToTengwar[nextChar].char) {
          processedWord.push(englishToTengwar[nextChar].char);
          processedWord.push(vowelTehta); // Add the vowel tehta to this consonant
          i++;
        } else {
          // If we can't find a consonant (unusual), use a carrier
          processedWord.push(tengwarMap['telco']);
          processedWord.push(vowelTehta);
        }
      }
    } else {
      // This is a consonant (or other character)

      // Check for consonant digraphs/trigraphs
      let found = false;
      for (let len = 3; len >= 2; len--) {
        if (i + len <= text.length) {
          const ngram = text.substring(i, i + len).toLowerCase();
          if (englishToTengwar[ngram] && englishToTengwar[ngram].char) {
            processedWord.push(englishToTengwar[ngram].char);
            i += len;
            found = true;
            break;
          }
        }
      }

      // If not a digraph/trigraph, handle as a single character
      if (!found) {
        if (i >= 1 && text[i - 1] === text[i]) { // doubled consonant
          processedWord.push(tengwarMap['doubler']);
        } else if (englishToTengwar[char] && englishToTengwar[char].char) {
          processedWord.push(englishToTengwar[char].char);
        } else {
          // Non-mapped character
          processedWord.push(char);
        }
        i++;
      }
    }
  }

  return processedWord.join('');
}

// Check for initial Tengwar status
chrome.storage.sync.get('tengwarEnabled', function(data) {
  if (data.tengwarEnabled) {
    // Wait a bit to ensure the page is loaded
    setTimeout(transcribePageToTengwar, 500);
  }
});
