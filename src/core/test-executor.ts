import { TestCase } from './dsl-generator';

export interface TestResult {
  status: 'passed' | 'failed' | 'running' | 'skipped';
  message: string;
  duration?: number;
  error?: string;
  stepResults?: StepResult[];
  screenshots?: string[];
}

export interface StepResult {
  stepIndex: number;
  action: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  duration?: number;
  error?: string;
  screenshot?: string;
}

export interface ExecutionOptions {
  timeout?: number;
  headless?: boolean;
  captureScreenshots?: boolean;
  pauseOnFailure?: boolean;
  retryCount?: number;
}

export interface TestExecutor {
  execute(testCase: TestCase, options?: ExecutionOptions): Promise<TestResult>;
  validateTestCase(testCase: TestCase): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Mock executor for browser environments (cannot run actual browser automation)
 */
export class MockTestExecutor implements TestExecutor {
  async execute(testCase: TestCase, options: ExecutionOptions = {}): Promise<TestResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    
    // Validate test case first
    const validation = this.validateTestCase(testCase);
    if (!validation.isValid) {
      return {
        status: 'failed',
        message: 'Test case validation failed',
        error: validation.errors.join(', '),
        duration: Date.now() - startTime
      };
    }

    // Simulate execution with realistic timing
    for (let i = 0; i < testCase.steps.length; i++) {
      const step = testCase.steps[i];
      const stepStartTime = Date.now();
      
      // Simulate step execution time (200-800ms per step)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));
      
      // Simulate failure chance (10% for demo purposes)
      const shouldFail = Math.random() < 0.1;
      
      const stepResult: StepResult = {
        stepIndex: i,
        action: step.action,
        status: shouldFail ? 'failed' : 'passed',
        duration: Date.now() - stepStartTime,
        message: shouldFail ? `Step ${i + 1} failed` : `Step ${i + 1} passed`
      };
      
      if (shouldFail) {
        stepResult.error = this.generateMockError(step);
        stepResults.push(stepResult);
        
        return {
          status: 'failed',
          message: `Test failed at step ${i + 1}: ${step.action}`,
          duration: Date.now() - startTime,
          error: stepResult.error,
          stepResults
        };
      }
      
      stepResults.push(stepResult);
    }

    return {
      status: 'passed',
      message: `Test '${testCase.meta.name}' completed successfully`,
      duration: Date.now() - startTime,
      stepResults
    };
  }

  validateTestCase(testCase: TestCase): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!testCase.meta?.name) {
      errors.push('Test case must have a name');
    }

    if (!testCase.meta?.baseUrl) {
      errors.push('Test case must have a base URL');
    }

    if (!testCase.steps || testCase.steps.length === 0) {
      errors.push('Test case must have at least one step');
    }

    // Step validation
    testCase.steps?.forEach((step, index) => {
      if (!step.action) {
        errors.push(`Step ${index + 1} must have an action`);
      }

      switch (step.action) {
        case 'fill':
          if (!step.locator || !step.text) {
            errors.push(`Step ${index + 1}: Fill action requires locator and text`);
          }
          break;
        
        case 'click':
          if (!step.locator) {
            errors.push(`Step ${index + 1}: Click action requires locator`);
          }
          break;
        
        case 'assert':
          if (!step.assertion) {
            errors.push(`Step ${index + 1}: Assert action requires assertion`);
          }
          break;
      }
    });

    // Warnings
    if (!testCase.steps?.some(step => step.action === 'goto')) {
      warnings.push('Test case should include a navigation step');
    }

    if (!testCase.steps?.some(step => step.action === 'assert')) {
      warnings.push('Test case should include at least one assertion');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateMockError(step: any): string {
    const errors = [
      `Element not found: Could not locate element with selector`,
      `Timeout: Element was not visible within timeout period`,
      `Navigation failed: Page did not load within timeout`,
      `Assertion failed: Expected text was not found`,
      `Element not clickable: Element is obscured by another element`
    ];
    
    return errors[Math.floor(Math.random() * errors.length)];
  }
}

/**
 * Real-world executor interface for server environments
 * This would be implemented to actually run Playwright, Selenium, etc.
 */
export class ServerTestExecutor implements TestExecutor {
  constructor(private executorType: 'playwright' | 'selenium' | 'cypress') {}

  async execute(testCase: TestCase, options: ExecutionOptions = {}): Promise<TestResult> {
    throw new Error('ServerTestExecutor requires server environment - not available in browser');
  }

  validateTestCase(testCase: TestCase): ValidationResult {
    // Reuse the mock validator for now
    return new MockTestExecutor().validateTestCase(testCase);
  }
}

/**
 * Factory function to create appropriate executor based on environment
 */
export function createTestExecutor(type: 'mock' | 'server' | 'real-url' = 'real-url'): TestExecutor {
  if (type === 'server') {
    return new ServerTestExecutor('playwright');
  }
  if (type === 'real-url') {
    return new RealUrlTestExecutor();
  }
  return new MockTestExecutor();
}

/**
 * Real URL Test Executor that actually navigates and tests the user's URL
 */
export class RealUrlTestExecutor implements TestExecutor {
  async execute(testCase: TestCase, options: ExecutionOptions = {}): Promise<TestResult> {
    const { RealUrlExecutor } = await import('./real-url-executor');
    const executor = new RealUrlExecutor(options);
    return await executor.execute(testCase);
  }

  validateTestCase(testCase: TestCase): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Enhanced validation for real URL testing
    if (!testCase.meta?.baseUrl) {
      errors.push('Base URL is required for real URL testing');
    } else {
      try {
        new URL(testCase.meta.baseUrl);
      } catch {
        errors.push('Base URL must be a valid URL (include http:// or https://)');
      }
    }

    // Validate steps have specific requirements for real execution
    testCase.steps?.forEach((step, index) => {
      switch (step.action) {
        case 'fill':
          if (!step.locator?.value && !step.locator?.name) {
            errors.push(`Step ${index + 1}: Fill action needs specific locator (label text, ID, or CSS selector)`);
          }
          if (!step.text || step.text.includes('// TODO')) {
            errors.push(`Step ${index + 1}: Fill action needs actual text value (no TODO placeholders)`);
          }
          break;
        
        case 'click':
          if (!step.locator?.name && !step.locator?.value) {
            errors.push(`Step ${index + 1}: Click action needs specific locator (button text, ID, or CSS selector)`);
          }
          break;
        
        case 'assert':
          if (!step.assertion?.value || step.assertion.value.includes('// TODO')) {
            errors.push(`Step ${index + 1}: Assert action needs specific expected value (no TODO placeholders)`);
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Utility functions for test execution
 */
export const TestUtils = {
  /**
   * Generate test statistics from results
   */
  generateStats(results: TestResult[]): TestStats {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      totalDuration,
      avgDuration
    };
  },

  /**
   * Format duration for display
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  /**
   * Generate test report
   */
  generateReport(results: TestResult[], format: 'json' | 'html' | 'text' = 'json'): string {
    const stats = this.generateStats(results);
    
    switch (format) {
      case 'json':
        return JSON.stringify({ stats, results }, null, 2);
      
      case 'html':
        return this.generateHtmlReport(stats, results);
      
      case 'text':
        return this.generateTextReport(stats, results);
      
      default:
        return JSON.stringify({ stats, results }, null, 2);
    }
  },

  generateHtmlReport(stats: TestStats, results: TestResult[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .stats { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .skipped { border-left: 5px solid #ff9800; }
    </style>
</head>
<body>
    <h1>Test Execution Report</h1>
    <div class="stats">
        <h2>Summary</h2>
        <p>Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Skipped: ${stats.skipped}</p>
        <p>Pass Rate: ${stats.passRate.toFixed(1)}% | Total Duration: ${this.formatDuration(stats.totalDuration)}</p>
    </div>
    ${results.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.status.toUpperCase()}</h3>
            <p><strong>Message:</strong> ${result.message}</p>
            ${result.duration ? `<p><strong>Duration:</strong> ${this.formatDuration(result.duration)}</p>` : ''}
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  },

  generateTextReport(stats: TestStats, results: TestResult[]): string {
    let report = `Test Execution Report\n${'='.repeat(50)}\n\n`;
    report += `Summary:\n`;
    report += `  Total: ${stats.total}\n`;
    report += `  Passed: ${stats.passed}\n`;
    report += `  Failed: ${stats.failed}\n`;
    report += `  Skipped: ${stats.skipped}\n`;
    report += `  Pass Rate: ${stats.passRate.toFixed(1)}%\n`;
    report += `  Total Duration: ${this.formatDuration(stats.totalDuration)}\n\n`;
    
    report += `Results:\n${'-'.repeat(30)}\n`;
    results.forEach((result, index) => {
      report += `${index + 1}. ${result.status.toUpperCase()}\n`;
      report += `   Message: ${result.message}\n`;
      if (result.duration) report += `   Duration: ${this.formatDuration(result.duration)}\n`;
      if (result.error) report += `   Error: ${result.error}\n`;
      report += '\n';
    });
    
    return report;
  }
};

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  totalDuration: number;
  avgDuration: number;
}