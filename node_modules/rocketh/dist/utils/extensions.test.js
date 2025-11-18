import { withEnvironment } from './extensions.js';
// Mock environment for testing
const mockEnv = {};
// Example functions that take environment as first parameter
const exampleExtensions = {
    deploy: (env) => async (contractName, args) => {
        return Promise.resolve();
    },
    verify: (env) => async (address) => {
        return Promise.resolve(true);
    },
    getBalance: (env) => async (address) => {
        return Promise.resolve(BigInt(0));
    },
    syncFunction: (env) => (value) => {
        return value * 2;
    },
    provider: (env) => env.network.provider,
};
// Test the currying function
const enhancedEnv = withEnvironment(mockEnv, exampleExtensions);
// Type tests - these should compile without errors
async function testTypes() {
    // These calls should work without passing env
    await enhancedEnv.deploy('MyContract', []);
    const isVerified = await enhancedEnv.verify('0x123...');
    const balance = await enhancedEnv.getBalance('0x456...');
    const doubled = enhancedEnv.syncFunction(42);
    const provider = enhancedEnv.provider;
    console.log('Type tests passed!');
    console.log({ isVerified, balance, doubled, provider });
}
// Export for potential use in actual tests
export { testTypes, enhancedEnv, exampleExtensions };
//# sourceMappingURL=extensions.test.js.map