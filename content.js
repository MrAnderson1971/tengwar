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
      restoreOriginalText();
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

// Function to transcribe all text on the page
function transcribePageToTengwar() {
  // Inject Tengwar font
  injectTengwarFont();

  // Process all text nodes
  const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip empty text nodes and nodes in elements to skip
          if (!node.nodeValue.trim() || isElementToSkip(node.parentElement)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
  );

  let node;
  while((node = walker.nextNode())) {
    // Store the original text if not already stored
    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, node.nodeValue);
    }

    // Apply the transcription
    node.nodeValue = transcribeToTengwar(node.nodeValue);

    // Add the Tengwar font class to the parent element
    if (node.parentElement) {
      node.parentElement.classList.add('tengwar-text');
    }
  }

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
          if (node.nodeType === Node.ELEMENT_NODE) {
            processTextNodesInElement(node);
          } else if (node.nodeType === Node.TEXT_NODE && !isElementToSkip(node.parentElement)) {
            // Store original text
            originalTextMap.set(node, node.nodeValue);
            // Transcribe text
            node.nodeValue = transcribeToTengwar(node.nodeValue);
            if (node.parentElement) {
              node.parentElement.classList.add('tengwar-text');
            }
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
  const walker = document.createTreeWalker(
      element,
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
  while((node = walker.nextNode())) {
    // Store original text
    originalTextMap.set(node, node.nodeValue);
    // Transcribe text
    node.nodeValue = transcribeToTengwar(node.nodeValue);
    if (node.parentElement) {
      node.parentElement.classList.add('tengwar-text');
    }
  }
}

// Function to restore original text
function restoreOriginalText() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  const tengwarElements = document.querySelectorAll('.tengwar-text');
  tengwarElements.forEach(element => {
    element.classList.remove('tengwar-text');

    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while((node = walker.nextNode())) {
      const originalText = originalTextMap.get(node);
      if (originalText) {
        node.nodeValue = originalText;
      }
    }
  });
}

// Function to check if an element should be skipped
function isElementToSkip(element) {
  if (!element) return true;

  const tagName = element.tagName.toLowerCase();
  const skipTags = ['script', 'style', 'noscript', 'iframe', 'canvas', 'svg', 'math', 'code', 'pre', 'textarea', 'input', 'select', 'option'];

  return skipTags.includes(tagName) ||
      element.classList.contains('tengwar-skip') ||
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
    'ampa': 'u',        // \Tampa
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
    'silme': 'l',       // \Tsilme
    'silmenuquerna': '¡', // \Tsilmenuquerna
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
    'p': { char: tengwarMap['parma'] },
    'c': { char: tengwarMap['calma'] },
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
    //'v': { char: tengwarMap['vala'] },
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

    // Special vowel carriers for initial vowels
    'initial-a': { char: tengwarMap['telco'], tehta: tengwarMap['three-dots'] },
    'initial-e': { char: tengwarMap['telco'], tehta: tengwarMap['acute'] },
    'initial-i': { char: tengwarMap['telco'], tehta: tengwarMap['dot'] },
    'initial-o': { char: tengwarMap['telco'], tehta: tengwarMap['right-curl'] },
    'initial-u': { char: tengwarMap['telco'], tehta: tengwarMap['left-curl'] },
  };

  // Process the text word by word
  return text.replace(/\b[a-zA-Z]+\b/g, function(word) {
    if (word.length === 0) {
      return word;
    }

    const processedWord = [];
    let i = 0;

    while (i < word.length) {
      const char = word[i].toLowerCase();

      // Check if this character is a vowel
      if ('aeiou'.includes(char)) {
        // If this is a vowel, we need to determine where to place it

        // Case 1: It's the last character in the word - use carrier
        if (i === word.length - 1) {
          processedWord.push(tengwarMap['telco']);
          processedWord.push(englishToTengwar[char].tehta);
          i++;
          continue;
        }

        // Case 2: It's followed by another vowel - use carrier
        if ('aeiou'.includes(word[i + 1].toLowerCase())) {
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
          if (i + len <= word.length) {
            const ngram = word.substring(i, i + len).toLowerCase();
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
        if (!found && i < word.length) {
          const nextChar = word[i].toLowerCase();
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
          if (i + len <= word.length) {
            const ngram = word.substring(i, i + len).toLowerCase();
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
          if (i >= 1 && word[i - 1] === word[i]) { // doubled consonant
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
  });
}

// Check for initial Tengwar status
chrome.storage.sync.get('tengwarEnabled', function(data) {
  if (data.tengwarEnabled) {
    // Wait a bit to ensure the page is loaded
    setTimeout(transcribePageToTengwar, 500);
  }
});
