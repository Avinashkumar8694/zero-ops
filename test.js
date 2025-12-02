const jsonDiff = require('./jsonDiff');

const testCases = [
    {
        name: 'Identical objects',
        obj1: { a: 1, b: 2 },
        obj2: { a: 1, b: 2 },
        expected: undefined
    },
    {
        name: 'Simple modification',
        obj1: { a: 1 },
        obj2: { a: 2 },
        expected: { a: { __old: 1, __new: 2 } }
    },
    {
        name: 'Addition',
        obj1: { a: 1 },
        obj2: { a: 1, b: 2 },
        expected: { b: { __new: 2 } }
    },
    {
        name: 'Deletion',
        obj1: { a: 1, b: 2 },
        obj2: { a: 1 },
        expected: { b: { __old: 2 } }
    },
    {
        name: 'Nested object change',
        obj1: { a: { x: 10, y: 20 } },
        obj2: { a: { x: 10, y: 25 } },
        expected: { a: { y: { __old: 20, __new: 25 } } }
    },
    {
        name: 'Array modification',
        obj1: { list: [1, 2, 3] },
        obj2: { list: [1, 5, 3] },
        expected: { list: { '1': { __old: 2, __new: 5 } } }
    },
    {
        name: 'Type mismatch',
        obj1: { a: 1 },
        obj2: { a: "1" },
        expected: { a: { __old: 1, __new: "1" } }
    }
];

function runTests() {
    console.log('Running JSON Diff Tests...\n');
    let passed = 0;
    let failed = 0;

    testCases.forEach((test, index) => {
        const result = jsonDiff(test.obj1, test.obj2);
        const resultStr = JSON.stringify(result);
        const expectedStr = JSON.stringify(test.expected);

        if (resultStr === expectedStr) {
            console.log(`✅ Test ${index + 1}: ${test.name} PASSED`);
            passed++;
        } else {
            console.log(`❌ Test ${index + 1}: ${test.name} FAILED`);
            console.log(`   Expected: ${expectedStr}`);
            console.log(`   Actual:   ${resultStr}`);
            failed++;
        }
    });

    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
}

runTests();
