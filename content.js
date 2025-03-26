// Track if Tengwar is currently enabled
let tengwarEnabled = false;
let fontInjected = false;


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
  'r': { char: tengwarMap['oore'] },
  'v': { char: tengwarMap['ampa'] },
  'w': { char: tengwarMap['vala'] },
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
  if (!tengwarEnabled) return;

  // Process initial content
  processContent(document.body);

  // Set up a MutationObserver to handle dynamic content
  setupMutationObserver();
}

// Process content within a container element
function processContent(container) {
  if (!container || isElementToSkip(container)) return;

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
  if (!element) return true;

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
  if (element.isContentEditable || element.contentEditable === 'true') {
    return true;
  }

  return false;
}

// Process a text node
function processTextNode(textNode) {
  if (!textNode || !textNode.nodeValue || !textNode.parentNode) {
    return;
  }

  let text = textNode.nodeValue;
  const parent = textNode.parentNode;

  // If the parent is already a tengwar-text or has tengwar-text class, skip
  if (parent.classList && parent.classList.contains('tengwar-text')) return;

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
  if (observer) return;

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

// Function to transcribe text to Tengwar
function transcribeToTengwar(text) {
  // Special cases for common English words
  if (text.toLowerCase() === "a") {
    return tengwarMap["osse"];
  }
  if (text.toLowerCase() === "the") {
    return tengwarMap["extended-ando"];
  }
  if (text.toLowerCase() === "of") {
    return tengwarMap["extended-umbar"];
  }
  if (text.toLowerCase() === "of the" || text.toLowerCase() === "ofthe") {
    return tengwarMap["extended-umbar"] + tengwarMap["doubler"];
  }
  if (text.toLowerCase() === "and") {
    return tengwarMap["ando"] + tengwarMap["nasalizer"];
  }

  // Process the text (only alphabetical words)
  const processedWord = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i].toLowerCase();

    // Check if this character is a vowel
    if ('aeiou'.includes(char)) {
      // If this is a vowel, we need to determine where to place it

      // Case 2: It's the last character in the word - use carrier
      if (i === text.length - 1) {
        processedWord.push(tengwarMap['telco']);
        processedWord.push(englishToTengwar[char].tehta);
        i++;
        continue;
      }

      // Case 3: It's followed by another vowel - use carrier
      if ('aeiou'.includes(text[i + 1].toLowerCase())) {
        processedWord.push(tengwarMap['telco']);
        processedWord.push(englishToTengwar[char].tehta);
        i++;
        continue;
      }

      // Case 4: It's followed by a consonant - the tehta goes on the following consonant
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
          // Non-mapped character (shouldn't happen with alphabetic-only words)
          processedWord.push(char);
        }
        i++;
      }
    }
  }

  return processedWord.join('');
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
