
// Mocked logic for verification
const EDUCATIONAL_SEGMENTS = new Set(["INSTITUTION", "UNIVERSITY"]);

const normalizeUpper = (v) => (v || "").trim().toUpperCase();

const resolveCustomerTaxSegment = (customer) => {
    return normalizeUpper(
        customer.organizationType ||
        customer.customerType ||
        customer.institutionType ||
        customer.institution?.type
    );
};

const resolveJournalSubscriptionMode = (value) => {
    const normalized = normalizeUpper(value).replace(/[\s+-]+/g, "_");
    if (!normalized) return "PRINT";
    if (normalized.includes("PRINT_DIGITAL") || normalized.includes("HYBRID")) return "PRINT_DIGITAL";
    if (normalized.includes("DIGITAL") || normalized.includes("ONLINE")) return "DIGITAL";
    if (normalized.includes("PRINT")) return "PRINT";
    return "PRINT";
};

const getJournalDomesticTaxRate = ({ customer, subscriptionMode, taxCategory }) => {
    const segment = resolveCustomerTaxSegment(customer);
    if (segment === "INSTITUTION" || segment === "UNIVERSITY") return 0;
    
    const mode = resolveJournalSubscriptionMode(subscriptionMode);
    if (mode === "PRINT_DIGITAL" || mode === "DIGITAL") return 18;
    if (taxCategory === "DIGITAL_ACCESS") return 18;
    if (mode === "PRINT" || taxCategory === "PRINT_JOURNAL") return 0;
    return 18;
};

// Test Cases
const cases = [
    { desc: "Print only", mode: "PRINT", cat: "PRINT_JOURNAL", expected: 0 },
    { desc: "Digital only", mode: "DIGITAL", cat: "DIGITAL_ACCESS", expected: 18 },
    { desc: "Print + Digital (Mode)", mode: "PRINT_DIGITAL", cat: "PRINT_JOURNAL", expected: 18 },
    { desc: "Print mode with Digital signal in cat", mode: "PRINT", cat: "DIGITAL_ACCESS", expected: 18 },
    { desc: "Print mode with Standard cat", mode: "PRINT", cat: "STANDARD", expected: 0 },
];

console.log("Starting GST Logic Verification...");
cases.forEach(c => {
    const rate = getJournalDomesticTaxRate({
        customer: { customerType: 'COMPANY' },
        subscriptionMode: c.mode,
        taxCategory: c.cat
    });
    const passed = rate === c.expected;
    console.log(`${passed ? '✅' : '❌'} ${c.desc}: Got ${rate}%, Expected ${c.expected}%`);
});
