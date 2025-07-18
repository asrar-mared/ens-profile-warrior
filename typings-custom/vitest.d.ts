/// <reference types="vitest/globals" />

declare global {
  const after: (fn: () => void) => void
  const fixture: any
}

// Extend vitest Assertion interface to include custom ENS matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    // Custom ENS matchers - these work at runtime via chai plugin setup
    toEmitEvent(event: string, ...args: any[]): any
    toEmitEventFrom(contract: any, event: string, ...args: any[]): any
    toBeRevertedWithCustomError(error: string, ...args: any[]): any
    toBeRevertedWithCustomErrorFrom(
      contract: any,
      error: string,
      ...args: any[]
    ): any
    toBeReverted(): any
    toBeRevertedWithString(reason: string): any
    toBeRevertedWithoutReason(): any
    toBeRevertedWithPanic(code?: bigint): any
    toEqualAddress(address: string): void
    // Add resolves property for promise assertion chaining
    resolves: Assertion<Awaited<T>>
  }

  interface AsymmetricMatchersContaining {
    toBeUndefined(): any
    toBeDefined(): any
    toBe(expected: any): any
    resolves: any
    rejects: any
    toEmitEvent(event: string, ...args: any[]): any
    toBeRevertedWithCustomError(error: string, ...args: any[]): any
    toThrow(error?: string | RegExp): any
  }
}
