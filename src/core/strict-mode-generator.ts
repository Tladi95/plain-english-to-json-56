/**
 * STRICT MODE GENERATOR - Zero tolerance for deviations
 * This is the entry point for strict code generation that enforces all rules
 */

import { TestCase, TestStep } from './dsl-generator';
import { generateCode, CodeGenerationOptions } from './code-generator';
import { extractLockedValues, performFinalValidation } from './strict-validator';

export interface StrictGenerationResult {
  resolvedSteps: string[];
  playwrightCode: string;
  validationResult: {
    isValid: boolean;
    errors: string[];
    deviations: string[];
  };
}

/**
 * Main STRICT MODE entry point
 * Parses locked values and generates code with zero tolerance for deviations
 */
export function generateStrictCode(
  originalInput: string,
  testSteps: string[]
): StrictGenerationResult {
  
  // Extract all locked values from input
  const locks = extractLockedValues(originalInput);
  
  // Validate that all required locks are present and complete
  const inputValidation = performFinalValidation(originalInput, '', locks);
  if (!inputValidation.isValid) {
    return {
      resolvedSteps: testSteps,
      playwrightCode: `ERROR: DEVIATION DETECTED\n${inputValidation.errors.join('\n')}`,
      validationResult: inputValidation
    };
  }

  // Convert locks to TestCase format
  const testCase = convertLocksToTestCase(locks, testSteps);
  
  // Generate code with strict validation
  try {
    const result = generateCode(
      testCase, 
      { framework: 'playwright', language: 'typescript' },
      originalInput
    );

    // Final validation
    const finalValidation = performFinalValidation(originalInput, result.code, locks);
    
    if (!finalValidation.isValid) {
      return {
        resolvedSteps: testSteps,
        playwrightCode: `ERROR: DEVIATION DETECTED\n${finalValidation.deviations.join('\n')}`,
        validationResult: finalValidation
      };
    }

    return {
      resolvedSteps: testSteps,
      playwrightCode: result.code,
      validationResult: finalValidation
    };

  } catch (error) {
    return {
      resolvedSteps: testSteps,
      playwrightCode: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      validationResult: {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        deviations: []
      }
    };
  }
}

/**
 * Converts locked values and steps into TestCase format
 */
function convertLocksToTestCase(locks: any[], testSteps: string[]): TestCase {
  const urlLock = locks.find(l => l.type === 'URL');
  const baseUrl = urlLock?.value || '';
  
  // Parse steps into TestStep format
  const steps: TestStep[] = [];
  
  for (let i = 0; i < testSteps.length; i++) {
    const stepText = testSteps[i].toLowerCase();
    
    if (stepText.includes('navigate')) {
      steps.push({
        action: 'goto',
        path: urlLock?.value || '// TODO: URL not specified'
      });
    } else if (stepText.includes('fill') && stepText.includes('username')) {
      const usernameLock = locks.find(l => l.key.includes('username') || l.key.includes('USERNAME'));
      const selectorLock = locks.find(l => l.key.includes('selector') && l.key.includes('username'));
      
      steps.push({
        action: 'fill',
        locator: selectorLock ? parseSelector(selectorLock.value) : undefined,
        text: usernameLock?.value || '// TODO: Username value not specified'
      });
    } else if (stepText.includes('fill') && stepText.includes('password')) {
      const passwordLock = locks.find(l => l.key.includes('password') || l.key.includes('PASSWORD'));
      const selectorLock = locks.find(l => l.key.includes('selector') && l.key.includes('password'));
      
      steps.push({
        action: 'fill',
        locator: selectorLock ? parseSelector(selectorLock.value) : undefined,
        text: passwordLock?.value || '// TODO: Password value not specified'
      });
    } else if (stepText.includes('click')) {
      const buttonLock = locks.find(l => l.key.includes('button') || l.key.includes('BUTTON'));
      
      steps.push({
        action: 'click',
        locator: buttonLock ? parseSelector(buttonLock.value) : undefined
      });
    } else if (stepText.includes('assert')) {
      const assertionTextLock = locks.find(l => l.key.includes('assertion') || l.key.includes('ASSERTION'));
      const errorSelectorLock = locks.find(l => l.key.includes('error') || l.key.includes('ERROR'));
      
      // Determine assertion type from step text
      let assertionType: string = 'containsText';
      if (stepText.includes('exact text')) {
        assertionType = 'toHaveText';
      } else if (stepText.includes('contains')) {
        assertionType = 'containsText';
      }
      
      steps.push({
        action: 'assert',
        assertion: {
          type: assertionType as any,
          locator: errorSelectorLock ? parseSelector(errorSelectorLock.value) : undefined,
          value: assertionTextLock?.value || '// TODO: Assertion text not specified'
        }
      });
    }
  }
  
  return {
    meta: {
      name: 'strict_mode_test',
      baseUrl,
      description: 'STRICT MODE generated test'
    },
    steps
  };
}

/**
 * Parses selector string into locator object
 */
function parseSelector(selector: string): any {
  if (selector.startsWith('#')) {
    return { type: 'id', value: selector.substring(1) };
  } else if (selector.startsWith('.')) {
    return { type: 'css', value: selector };
  } else if (selector.includes('role=')) {
    const roleMatch = selector.match(/role=(\w+)\[name="([^"]+)"\]/);
    if (roleMatch) {
      return { type: 'role', role: roleMatch[1], name: roleMatch[2] };
    }
  } else if (selector.includes('label:has-text')) {
    const labelMatch = selector.match(/label:has-text\("([^"]+)"\)/);
    if (labelMatch) {
      return { type: 'label', value: labelMatch[1] };
    }
  } else if (selector.includes('text=')) {
    return { type: 'text', value: selector.replace('text=', '') };
  }
  
  // Default to CSS selector
  return { type: 'css', value: selector };
}