import {tengwarToString} from "./mappings";
import {transcribeToTengwar} from "./worker";

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
    expect(transcribeToTengwar('pneumonia')).toBe(tengwarToString('nuumen', 'vala', 'acute', 'malta', 'nuumen', 'right-curl', 'telco', 'dot', 'telco', 'three-dots'));
})

test('unknown', () => {
    expect(transcribeToTengwar('unknown')).toBe(tengwarToString('nuumen', 'left-curl', 'doubler', 'vala', 'right-curl', 'nuumen'));
})

test('acknowledge', () => {
    expect(transcribeToTengwar('acknowledge')).toBe(tengwarToString('quesse', 'three-dots', 'doubler', 'nuumen', 'vala', 'right-curl', 'lambe', 'ando', 'acute', 'ungwe', 'dot-below'));
})

test('Europe', () => {
    expect(transcribeToTengwar('Europe')).toBe(tengwarToString('vala', 'acute', 'roomen', 'parma', 'right-curl', 'dot-below'));
})

test('employee', () => {
    expect(transcribeToTengwar('employee')).toBe(tengwarToString('parma', 'nasalizer', 'acute', 'lambe', 'anna', 'right-curl', 'telco', 'acute', 'dot-below'));
})

test('tree', () => {
    expect(transcribeToTengwar('tree')).toBe(tengwarToString('tinco', 'roomen', 'telco', 'acute', 'dot-below'));
})

test('ongoing', () => {
    expect(transcribeToTengwar('ongoing')).toBe(tengwarToString('nuumen', 'right-curl', 'ungwe', 'telco', 'right-curl', 'nwalme', 'dot'));
})

test('mysterious', () => {
    expect(transcribeToTengwar('mysterious')).toBe(tengwarToString('malta', 'two-dots-below', 'silme', 'tinco', 'roomen', 'acute', 'telco', 'dot', 'vala', 'right-curl', 'silme'));
})

test('finally', () => {
    expect(transcribeToTengwar('finally')).toBe(tengwarToString('formen', 'nuumen', 'dot', 'lambe', 'three-dots', 'doubler', 'two-dots-below'));
})

test('firearm', () => {
    expect(transcribeToTengwar('firearm')).toBe(tengwarToString('formen', 'oore', 'dot', 'dot-below', 'oore', 'three-dots', 'malta'));
})

test('Rwanda', () => {
    expect(transcribeToTengwar("Rwanda")).toBe(tengwarToString('roomen', 'nwale', 'ando', 'three-dots', 'nasalizer', 'telco', 'three-dots'))
})
