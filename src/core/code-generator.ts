import { TestCase, TestStep } from './dsl-generator';

export interface CodeGenerationOptions {
  framework: 'playwright' | 'selenium' | 'cypress';
  language: 'typescript' | 'javascript' | 'python' | 'java';
  includeComments?: boolean;
  includeScreenshots?: boolean;
  timeout?: number;
  headless?: boolean;
}

export interface GeneratedCode {
  code: string;
  framework: string;
  language: string;
  dependencies: string[];
  setupInstructions: string[];
}

/**
 * Enhanced code generator supporting multiple frameworks and languages
 */
export function generateCode(
  testCase: TestCase, 
  options: CodeGenerationOptions = { 
    framework: 'playwright', 
    language: 'typescript' 
  }
): GeneratedCode {
  switch (options.framework) {
    case 'playwright':
      return generatePlaywrightCode(testCase, options);
    case 'selenium':
      return generateSeleniumCode(testCase, options);
    case 'cypress':
      return generateCypressCode(testCase, options);
    default:
      throw new Error(`Unsupported framework: ${options.framework}`);
  }
}

function generatePlaywrightCode(testCase: TestCase, options: CodeGenerationOptions): GeneratedCode {
  const { language, includeComments = true, includeScreenshots = false, timeout = 30000 } = options;
  
  const isTypeScript = language === 'typescript';
  const fileExt = isTypeScript ? '.ts' : '.js';
  
  const imports = isTypeScript 
    ? `import { test, expect, Page } from '@playwright/test';`
    : `const { test, expect } = require('@playwright/test');`;

  const testFunction = isTypeScript
    ? `test('${testCase.meta.name}', async ({ page }: { page: Page }) => {`
    : `test('${testCase.meta.name}', async ({ page }) => {`;

  let code = `${imports}

${includeComments ? `// Test: ${testCase.meta.description || testCase.meta.name}` : ''}
${includeComments ? `// Base URL: ${testCase.meta.baseUrl}` : ''}
${includeComments && testCase.meta.tags ? `// Tags: ${testCase.meta.tags.join(', ')}` : ''}

${testFunction}
${includeComments ? '  // Set timeout for the test' : ''}
  test.setTimeout(${timeout});
  
${testCase.steps.map((step, index) => generatePlaywrightStep(step, 2, includeComments, includeScreenshots, index)).join('\n')}
});`;

  return {
    code,
    framework: 'playwright',
    language,
    dependencies: [
      '@playwright/test',
      ...(isTypeScript ? ['typescript', '@types/node'] : [])
    ],
    setupInstructions: [
      'npm install @playwright/test',
      'npx playwright install',
      `Save the test as ${testCase.meta.name}${fileExt}`,
      'Run with: npx playwright test'
    ]
  };
}

function generateSeleniumCode(testCase: TestCase, options: CodeGenerationOptions): GeneratedCode {
  const { language, includeComments = true } = options;
  
  if (language === 'python') {
    let code = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import unittest

class ${capitalizeFirst(testCase.meta.name)}Test(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
    
    def tearDown(self):
        self.driver.quit()
    
    def test_${testCase.meta.name}(self):
        ${includeComments ? `"""${testCase.meta.description || testCase.meta.name}"""` : ''}
        driver = self.driver
        
${testCase.steps.map(step => generateSeleniumPythonStep(step, 8)).join('\n')}

if __name__ == "__main__":
    unittest.main()`;

    return {
      code,
      framework: 'selenium',
      language: 'python',
      dependencies: ['selenium'],
      setupInstructions: [
        'pip install selenium',
        'Download ChromeDriver',
        'Save as test_' + testCase.meta.name + '.py',
        'Run with: python test_' + testCase.meta.name + '.py'
      ]
    };
  }
  
  // Default to Java
  let code = `import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class ${capitalizeFirst(testCase.meta.name)}Test {
    private WebDriver driver;
    private WebDriverWait wait;
    
    @Before
    public void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, 10);
    }
    
    @After
    public void tearDown() {
        driver.quit();
    }
    
    @Test
    public void test${capitalizeFirst(testCase.meta.name)}() {
${testCase.steps.map(step => generateSeleniumJavaStep(step, 8)).join('\n')}
    }
}`;

  return {
    code,
    framework: 'selenium',
    language: 'java',
    dependencies: ['selenium-java', 'junit'],
    setupInstructions: [
      'Add selenium-java and junit to dependencies',
      'Download ChromeDriver',
      'Save as ' + capitalizeFirst(testCase.meta.name) + 'Test.java',
      'Run with JUnit'
    ]
  };
}

function generateCypressCode(testCase: TestCase, options: CodeGenerationOptions): GeneratedCode {
  const { language, includeComments = true, includeScreenshots = false } = options;
  
  const isTypeScript = language === 'typescript';
  
  let code = `${includeComments ? `// Test: ${testCase.meta.description || testCase.meta.name}` : ''}
${includeComments ? `// Base URL: ${testCase.meta.baseUrl}` : ''}

describe('${testCase.meta.name}', () => {
  it('${testCase.meta.description || testCase.meta.name}', () => {
${testCase.steps.map(step => generateCypressStep(step, 4, includeScreenshots)).join('\n')}
  });
});`;

  return {
    code,
    framework: 'cypress',
    language,
    dependencies: ['cypress', ...(isTypeScript ? ['typescript'] : [])],
    setupInstructions: [
      'npm install cypress',
      `Save as cypress/e2e/${testCase.meta.name}.cy.${isTypeScript ? 'ts' : 'js'}`,
      'Run with: npx cypress open'
    ]
  };
}

function generatePlaywrightStep(
  step: TestStep, 
  indent: number, 
  includeComments: boolean, 
  includeScreenshots: boolean, 
  index: number
): string {
  const spaces = ' '.repeat(indent);
  let code = '';
  
  if (includeComments) {
    code += `${spaces}// Step ${index + 1}: ${step.action}\n`;
  }
  
  switch (step.action) {
    case 'goto':
      code += `${spaces}await page.goto('${step.path || '/'}');`;
      break;
    
    case 'fill':
      const fillLocator = generatePlaywrightLocator(step.locator!);
      code += `${spaces}await page.locator('${fillLocator}').fill('${step.text}');`;
      break;
    
    case 'click':
      const clickLocator = generatePlaywrightLocator(step.locator!);
      code += `${spaces}await page.locator('${clickLocator}').click();`;
      break;
    
    case 'assert':
      code += generatePlaywrightAssertion(step, indent);
      break;
    
    default:
      code += `${spaces}// Unknown action: ${step.action}`;
  }
  
  if (includeScreenshots) {
    code += `\n${spaces}await page.screenshot({ path: 'step-${index + 1}-${step.action}.png' });`;
  }
  
  return code;
}

function generatePlaywrightLocator(locator: any): string {
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
    case 'xpath':
      return `xpath=${locator.value}`;
    default:
      return locator.value || '';
  }
}

function generatePlaywrightAssertion(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  const assertion = step.assertion!;
  
  switch (assertion.type) {
    case 'containsText':
      const textLocator = assertion.locator ? generatePlaywrightLocator(assertion.locator) : 'body';
      return `${spaces}await expect(page.locator('${textLocator}')).toContainText('${assertion.value}');`;
    
    case 'visible':
      const visibleLocator = assertion.locator ? generatePlaywrightLocator(assertion.locator) : 'body';
      return `${spaces}await expect(page.locator('${visibleLocator}')).toBeVisible();`;
    
    case 'urlContains':
      return `${spaces}await expect(page).toHaveURL(new RegExp('.*${assertion.value}.*'));`;
    
    case 'hasValue':
      const valueLocator = assertion.locator ? generatePlaywrightLocator(assertion.locator) : 'input';
      return `${spaces}await expect(page.locator('${valueLocator}')).toHaveValue('${assertion.value}');`;
    
    case 'isEnabled':
      const enabledLocator = assertion.locator ? generatePlaywrightLocator(assertion.locator) : 'button';
      return `${spaces}await expect(page.locator('${enabledLocator}')).toBeEnabled();`;
    
    case 'isDisabled':
      const disabledLocator = assertion.locator ? generatePlaywrightLocator(assertion.locator) : 'button';
      return `${spaces}await expect(page.locator('${disabledLocator}')).toBeDisabled();`;
    
    default:
      return `${spaces}// Unknown assertion: ${assertion.type}`;
  }
}

function generateSeleniumPythonStep(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  
  switch (step.action) {
    case 'goto':
      return `${spaces}driver.get("${step.path || '/'}")`;
    
    case 'fill':
      const fillBy = generateSeleniumPythonLocator(step.locator!);
      return `${spaces}driver.find_element(${fillBy}).send_keys("${step.text}")`;
    
    case 'click':
      const clickBy = generateSeleniumPythonLocator(step.locator!);
      return `${spaces}driver.find_element(${clickBy}).click()`;
    
    case 'assert':
      return generateSeleniumPythonAssertion(step, indent);
    
    default:
      return `${spaces}# Unknown action: ${step.action}`;
  }
}

function generateSeleniumPythonLocator(locator: any): string {
  switch (locator.type) {
    case 'id':
      return `By.ID, "${locator.value}"`;
    case 'css':
      return `By.CSS_SELECTOR, "${locator.value}"`;
    case 'xpath':
      return `By.XPATH, "${locator.value}"`;
    case 'text':
      return `By.XPATH, "//*[contains(text(), '${locator.value}')]"`;
    default:
      return `By.CSS_SELECTOR, "${locator.value}"`;
  }
}

function generateSeleniumPythonAssertion(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  const assertion = step.assertion!;
  
  switch (assertion.type) {
    case 'containsText':
      return `${spaces}self.assertIn("${assertion.value}", driver.page_source)`;
    case 'urlContains':
      return `${spaces}self.assertIn("${assertion.value}", driver.current_url)`;
    default:
      return `${spaces}# Unknown assertion: ${assertion.type}`;
  }
}

function generateSeleniumJavaStep(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  
  switch (step.action) {
    case 'goto':
      return `${spaces}driver.get("${step.path || '/'}");`;
    
    case 'fill':
      const fillBy = generateSeleniumJavaLocator(step.locator!);
      return `${spaces}driver.findElement(${fillBy}).sendKeys("${step.text}");`;
    
    case 'click':
      const clickBy = generateSeleniumJavaLocator(step.locator!);
      return `${spaces}driver.findElement(${clickBy}).click();`;
    
    case 'assert':
      return generateSeleniumJavaAssertion(step, indent);
    
    default:
      return `${spaces}// Unknown action: ${step.action}`;
  }
}

function generateSeleniumJavaLocator(locator: any): string {
  switch (locator.type) {
    case 'id':
      return `By.id("${locator.value}")`;
    case 'css':
      return `By.cssSelector("${locator.value}")`;
    case 'xpath':
      return `By.xpath("${locator.value}")`;
    default:
      return `By.cssSelector("${locator.value}")`;
  }
}

function generateSeleniumJavaAssertion(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  const assertion = step.assertion!;
  
  switch (assertion.type) {
    case 'containsText':
      return `${spaces}assertTrue(driver.getPageSource().contains("${assertion.value}"));`;
    case 'urlContains':
      return `${spaces}assertTrue(driver.getCurrentUrl().contains("${assertion.value}"));`;
    default:
      return `${spaces}// Unknown assertion: ${assertion.type}`;
  }
}

function generateCypressStep(step: TestStep, indent: number, includeScreenshots: boolean): string {
  const spaces = ' '.repeat(indent);
  let code = '';
  
  switch (step.action) {
    case 'goto':
      code = `${spaces}cy.visit('${step.path || '/'}');`;
      break;
    
    case 'fill':
      const fillSelector = generateCypressSelector(step.locator!);
      code = `${spaces}cy.get('${fillSelector}').type('${step.text}');`;
      break;
    
    case 'click':
      const clickSelector = generateCypressSelector(step.locator!);
      code = `${spaces}cy.get('${clickSelector}').click();`;
      break;
    
    case 'assert':
      code = generateCypressAssertion(step, indent);
      break;
    
    default:
      code = `${spaces}// Unknown action: ${step.action}`;
  }
  
  if (includeScreenshots) {
    code += `\n${spaces}cy.screenshot('${step.action}-step');`;
  }
  
  return code;
}

function generateCypressSelector(locator: any): string {
  switch (locator.type) {
    case 'id':
      return `#${locator.value}`;
    case 'css':
      return locator.value;
    case 'text':
      return `[data-cy="${locator.value}"]`; // Cypress best practice
    default:
      return locator.value;
  }
}

function generateCypressAssertion(step: TestStep, indent: number): string {
  const spaces = ' '.repeat(indent);
  const assertion = step.assertion!;
  
  switch (assertion.type) {
    case 'containsText':
      return `${spaces}cy.contains('${assertion.value}').should('be.visible');`;
    case 'urlContains':
      return `${spaces}cy.url().should('contain', '${assertion.value}');`;
    case 'visible':
      const selector = assertion.locator ? generateCypressSelector(assertion.locator) : 'body';
      return `${spaces}cy.get('${selector}').should('be.visible');`;
    default:
      return `${spaces}// Unknown assertion: ${assertion.type}`;
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}