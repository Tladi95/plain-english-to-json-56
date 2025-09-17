import { TestCase, TestStep } from './testGenerator';

export interface TestResult {
  status: 'passed' | 'failed' | 'running';
  message: string;
  duration?: number;
  error?: string;
}

export function generatePlaywrightCode(testCase: TestCase): string {
  const code = `import { test, expect } from '@playwright/test';

test('${testCase.meta.name}', async ({ page }) => {
${testCase.steps.map(step => generateStepCode(step, 2)).join('\n')}
});`;
  
  return code;
}

function generateStepCode(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  
  switch (step.action) {
    case 'goto':
      return `${spaces}await page.goto('${step.path || '/'}');`;
    
    case 'fill':
      const fillLocator = generateLocator(step.locator!);
      return `${spaces}await page.locator('${fillLocator}').fill('${step.text}');`;
    
    case 'click':
      const clickLocator = generateLocator(step.locator!);
      return `${spaces}await page.locator('${clickLocator}').click();`;
    
    case 'assert':
      return generateAssertCode(step, indent);
    
    default:
      return `${spaces}// Unknown action: ${step.action}`;
  }
}

function generateLocator(locator: any): string {
  switch (locator.type) {
    case 'label':
      return `label:has-text("${locator.value}")`;
    case 'id':
      return `#${locator.value}`;
    case 'role':
      return `role=${locator.role}[name="${locator.name}"]`;
    case 'text':
      return `text=${locator.value}`;
    case 'css':
      return locator.value;
    default:
      return locator.value || '';
  }
}

function generateAssertCode(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  const assertion = step.assertion!;
  
  switch (assertion.type) {
    case 'containsText':
      const textLocator = assertion.locator ? generateLocator(assertion.locator) : 'body';
      return `${spaces}await expect(page.locator('${textLocator}')).toContainText('${assertion.value}');`;
    
    case 'visible':
      const visibleLocator = assertion.locator ? generateLocator(assertion.locator) : 'body';
      return `${spaces}await expect(page.locator('${visibleLocator}')).toBeVisible();`;
    
    case 'urlContains':
      return `${spaces}await expect(page).toHaveURL(new RegExp('.*${assertion.value}.*'));`;
    
    default:
      return `${spaces}// Unknown assertion: ${assertion.type}`;
  }
}

export async function executeTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate test execution since we can't run actual Playwright in the browser
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    // Simulate random pass/fail for demo purposes
    const shouldPass = Math.random() > 0.3; // 70% chance of passing
    
    if (shouldPass) {
      return {
        status: 'passed',
        message: `Test '${testCase.meta.name}' passed successfully`,
        duration: Date.now() - startTime
      };
    } else {
      return {
        status: 'failed',
        message: `Test '${testCase.meta.name}' failed`,
        duration: Date.now() - startTime,
        error: 'Element not found: Login button was not visible within 5000ms'
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      message: `Test '${testCase.meta.name}' failed with error`,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}