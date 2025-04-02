import {tengwarMap} from "./mappings";
import {transcribeToTengwar} from "./worker";

function tengwarToString(...tengwar) {
    let output = "";
    for (const tengwa of tengwar) {
        output += tengwarMap[tengwa];
    }
    return output;
}

test("account", () => {
    expect(transcribeToTengwar("account", true)).toBe(tengwarToString("quesse", "three-dots", "doubler", "vala", "right-curl", "tinco", "nasalizer"));
})

test("build", () => {
    expect(transcribeToTengwar("build", true)).toBe(tengwarToString("umbar", "anna", "left-curl", "alda"));
})

test("café", () => {
    expect(transcribeToTengwar("café", true)).toBe(tengwarToString("quesse", "formen", "three-dots", "telco", "acute"))
})
