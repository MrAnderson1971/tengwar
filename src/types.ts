/** A single piece of text, either original or transcribed into Tengwar. */
interface TextFragment {
    text: string;
    isTengwar: boolean;
    original?: string; // The original text, only present for Tengwar fragments
}

/** The response sent from the background script back to the content script. */
export interface ProcessBatchResponse {
    error?: string;
    results?: TextFragment[][]; // An array of results, one for each string in the input batch
}
