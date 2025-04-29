// src/dom-patcher.js
const originalRemoveChild = Element.prototype.removeChild;

Element.prototype.removeChild = function(child) {
    try {
        return originalRemoveChild.call(this, child);
    } catch(e) {
        console.warn("removeChild failed, child may have been already removed");
        return child; // Return the child node anyway
    }
};

// Also override replaceChild since React often uses this
const originalReplaceChild = Element.prototype.replaceChild;

Element.prototype.replaceChild = function(newChild, oldChild) {
    try {
        return originalReplaceChild.call(this, newChild, oldChild);
    } catch(e) {
        console.warn("replaceChild failed, node may have been already removed");
        return oldChild;
    }
};

console.log("DOM patching applied");
