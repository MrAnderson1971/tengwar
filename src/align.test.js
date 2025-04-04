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
    expect(transcribeToTengwar("account")).toBe(tengwarToString("quesse", "three-dots", "doubler", "vala", "right-curl", "tinco", "nasalizer"));
})

test("build", () => {
    expect(transcribeToTengwar("build")).toBe(tengwarToString("umbar", "anna", "left-curl", "alda"));
})

test("café", () => {
    expect(transcribeToTengwar("café")).toBe(tengwarToString("quesse", "formen", "three-dots", "telco", "acute"))
})

test("cake", () => {
    expect(transcribeToTengwar("cake")).toBe(tengwarToString("quesse", "quesse", "three-dots", "dot-below"))
})

test("psychology", () => {
    expect(transcribeToTengwar("psychology")).toBe(tengwarToString("silme", "calma", "caron", "lambe", "right-curl", "ungwe", "right-curl", "two-dots-below"))
})

test("know", () => {
    expect(transcribeToTengwar("know")).toBe(tengwarToString("nuumen", "vala", "right-curl"));
})
