// Core exports for test automation DSL and code generation
export * from './dsl-generator';
export * from './code-generator';
export * from './test-executor';

// STRICT MODE exports for zero-deviation code generation
export {
  type LockedValue,
  type ValidationResult as StrictValidationResult,
  validateStrictMode,
  extractLockedValues,
  performFinalValidation
} from './strict-validator';

export {
  type StrictGenerationResult,
  generateStrictCode
} from './strict-mode-generator';

export {
  type UniversalStrictResult,
  generateFromPlainEnglish
} from './universal-strict-generator';

// Page analysis and test data management
export {
  type PageElement,
  type PageAnalysis,
  generateSmartLocator,
  matchFieldToPageElement,
  generateDataPlaceholder,
  createPageDataTemplate
} from './page-analyzer';

export {
  type TestDataSet,
  type TestDataConfig,
  TestDataManager,
  createDefaultTestDataManager,
  createTestDataTemplate
} from './test-data-manager';

// Re-export commonly used types and functions
export {
  type TestStep,
  type TestCase,
  type GenerationOptions,
  generateTestCase,
  exampleTestCases
} from './dsl-generator';

export {
  type CodeGenerationOptions,
  type GeneratedCode,
  generateCode
} from './code-generator';

export {
  type TestResult,
  type TestExecutor,
  type ExecutionOptions,
  createTestExecutor,
  TestUtils
} from './test-executor';

// Default configuration
export const DEFAULT_CONFIG = {
  generation: {
    includeNavigation: true,
    defaultTimeout: 30000,
    includeScreenshots: false,
    generateAssertions: true
  },
  
  codeGeneration: {
    framework: 'playwright' as const,
    language: 'typescript' as const,
    includeComments: true,
    includeScreenshots: false,
    timeout: 30000,
    headless: true
  },
  
  execution: {
    timeout: 30000,
    headless: true,
    captureScreenshots: false,
    pauseOnFailure: false,
    retryCount: 0
  }
};