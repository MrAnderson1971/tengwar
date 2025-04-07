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

test("accident", () => {
    expect(transcribeToTengwar("accident")).toBe(tengwarToString("quesse", "three-dots", "silme-nuquerna", "ando", "dot", "tinco", "nasalizer", "acute"));
})

test("build", () => {
    expect(transcribeToTengwar("build")).toBe(tengwarToString("umbar", "anna", "left-curl", "alda"));
})

test("café", () => {
    expect(transcribeToTengwar("café")).toBe(tengwarToString("quesse", "formen", "three-dots", "telco", "acute"));
})

test("cake", () => {
    expect(transcribeToTengwar("cake")).toBe(tengwarToString("quesse", "quesse", "three-dots", "dot-below"));
})

test("psychology", () => {
    expect(transcribeToTengwar("psychology")).toBe(tengwarToString("silme", "calma", "caron", "lambe", "right-curl", "ungwe", "right-curl", "two-dots-below"));
})

test("know", () => {
    expect(transcribeToTengwar("know")).toBe(tengwarToString("nuumen", "vala", "right-curl"));
})

test("vanquish", () => {
    expect(transcribeToTengwar("vanquish")).toBe(tengwarToString("ampa", "nuumen", "three-dots", "quesse", "tilde", "aha", "dot"));
})

test("beautiful", () => {
    expect(transcribeToTengwar("beautiful")).toBe(tengwarToString("umbar", "osse", "acute", "tinco", "left-curl", "formen", "dot", "lambe", "left-curl"));
})

test("bureau", () => {
    expect(transcribeToTengwar("bureau")).toBe(tengwarToString("umbar", "roomen", "left-curl", "telco", "right-curl"));
})

test("rifle", () => {
    expect(transcribeToTengwar("rifle")).toBe(tengwarToString("roomen", "formen", "dot", "lambe", "dot-below"));
})

test("able", () => {
    expect(transcribeToTengwar("able")).toBe(tengwarToString("umbar", "three-dots", "lambe", "dot-below"));
})

test("treasure", () => {
    expect(transcribeToTengwar("treasure")).toBe(tengwarToString("tinco", "roomen", "osse", "acute", "esse-nuquerna", "oore", "left-curl", "dot-below"));
})

test("explore", () => {
    expect(transcribeToTengwar("explore")).toBe(tengwarToString("quesse", "left-hook", "acute", "parma", "lambe", "oore", "right-curl", "dot-below"));
})

test("Syria", () => {
    expect(transcribeToTengwar("Syria")).toBe(tengwarToString("silme", "two-dots-below", "roomen", "telco", "dot", "telco", "three-dots"));
})

test("Iraq", () => {
    expect(transcribeToTengwar("Iraq")).toBe(tengwarToString("roomen", "dot", "quesse", "three-dots"));
})

test("colour", () => {
    expect(transcribeToTengwar("colour")).toBe(transcribeToTengwar("color"));
})

test("programme", () => {
    expect(transcribeToTengwar("programme")).toBe(transcribeToTengwar("program"));
})

test('lactase', () => {
    expect(transcribeToTengwar("lactase")).toBe(tengwarToString("lambe", "quesse", 'three-dots', 'tinco', 'esse-nuquerna', 'three-dots', 'dot-below'));
})

test('heart', () => {
    expect(transcribeToTengwar('heart')).toBe(tengwarToString('hyarmen', 'osse', 'acute', 'oore', 'tinco'));
})

test('carry', () => {
    expect(transcribeToTengwar('carry')).toBe(tengwarToString('quesse', 'roomen', 'three-dots', 'doubler', 'two-dots-below'));
})

test('purr', () => {
    expect(transcribeToTengwar('purr')).toBe(tengwarToString('parma', 'oore', 'left-curl', 'doubler'));
})

test('rhyme', () => {
    expect(transcribeToTengwar('rhyme')).toBe(tengwarToString('roomen', 'hyarmen', 'malta', 'caron', 'dot-below'));
})

test('perhaps', () => {
    expect(transcribeToTengwar('perhaps')).toBe(tengwarToString('parma', 'oore', 'acute', 'hyarmen', 'parma', 'three-dots', 'silme'));
})

test('Science', () => {
    expect(transcribeToTengwar('Science')).toBe(tengwarToString('silme', 'silme-nuquerna', 'telco', 'dot', 'nuumen', 'acute', 'silme-nuquerna', 'dot-below'));
})

test('social', () => {
    expect(transcribeToTengwar('social')).toBe(tengwarToString('silme', 'silme-nuquerna', 'right-curl', 'telco', 'dot', 'lambe', 'three-dots'));
})

test('ocean', () => {
    expect(transcribeToTengwar('ocean')).toBe(tengwarToString('silme-nuquerna', 'right-curl', 'osse', 'acute', 'nuumen'));
})

test('ancient', () => {
    expect(transcribeToTengwar('ancient')).toBe(tengwarToString('nuumen', 'three-dots', 'silme-nuquerna', 'telco', 'dot', 'dot-below', 'tinco', 'nasalizer'));
})

test('scene', () => {
    expect(transcribeToTengwar('scene')).toBe(tengwarToString('silme', 'silme-nuquerna', 'nuumen', 'acute', 'dot-below'));
})

test('pneumonia', () => {
    expect(transcribeToTengwar('pneumonia')).toBe(tengwarToString('nuumen', 'dot-below', 'malta', 'left-curl', 'nuumen', 'right-curl', 'telco', 'dot', 'telco', 'three-dots'));
})
