// src/dom-patcher.js
const originalRemoveChild = Element.prototype.removeChild;

Element.prototype.removeChild = function<T extends Node>(this: Element, child: T): T {
    try {
        return originalRemoveChild.call(this, child) as T;
    } catch(e) {
        console.warn("removeChild failed, child may have been already removed");
        return child; // Return the child node anyway
    }
};

// Also override replaceChild since React often uses this
const originalReplaceChild = Element.prototype.replaceChild;

Element.prototype.replaceChild = function<T extends Node>(newChild: Node, oldChild: T): T {
    try {
        return originalReplaceChild.call(this, newChild, oldChild) as T;
    } catch(e) {
        console.warn("replaceChild failed, node may have been already removed");
        return oldChild;
    }
};

// Add insertBefore override for consistency
const originalInsertBefore = Element.prototype.insertBefore;

Element.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch(e) {
        console.warn("insertBefore failed, reference node may no longer exist in the document");
        return newNode as T;
    }
};

console.log("DOM patching applied");
