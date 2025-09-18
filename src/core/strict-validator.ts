/**
 * STRICT MODE VALIDATOR - Ensures no deviations from locked values
 * This module validates that the code generator follows instructions exactly
 */

export interface LockedValue {
  type: 'URL' | 'SELECTOR' | 'VALUE' | 'ASSERTION_TEXT' | 'ASSERTION_TYPE';
  key: string;
  value: string;
  isLocked: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  deviations: string[];
}

/**
 * Validates that no locked values have been altered or replaced
 */
export function validateStrictMode(
  originalLocks: LockedValue[],
  generatedCode: string
): ValidationResult {
  const errors: string[] = [];
  const deviations: string[] = [];

  for (const lock of originalLocks) {
    if (!lock.isLocked || !lock.value) continue;

    // Check if the exact locked value appears in generated code
    if (!generatedCode.includes(lock.value)) {
      deviations.push(`DEVIATION DETECTED: Locked ${lock.type} "${lock.value}" not found in generated code`);
    }

    // Check for common replacements that violate STRICT MODE
    switch (lock.type) {
      case 'URL':
        if (generatedCode.includes('localhost') && !lock.value.includes('localhost')) {
          deviations.push(`DEVIATION DETECTED: URL replaced with localhost`);
        }
        break;

      case 'SELECTOR':
        if (generatedCode.includes('#error') && lock.value !== '#error') {
          deviations.push(`DEVIATION DETECTED: Selector replaced with generic #error`);
        }
        if (generatedCode.includes('input[type="text"]') && !lock.value.includes('input[type="text"]')) {
          deviations.push(`DEVIATION DETECTED: Selector replaced with generic input selector`);
        }
        break;

      case 'VALUE':
        if (generatedCode.includes('testuser') && lock.value !== 'testuser') {
          deviations.push(`DEVIATION DETECTED: Value replaced with placeholder "testuser"`);
        }
        if (generatedCode.includes('password123') && lock.value !== 'password123') {
          deviations.push(`DEVIATION DETECTED: Value replaced with placeholder "password123"`);
        }
        break;

      case 'ASSERTION_TEXT':
        if (generatedCode.includes('Error') && lock.value !== 'Error') {
          deviations.push(`DEVIATION DETECTED: Assertion text replaced with generic "Error"`);
        }
        break;
    }
  }

  // Check for forbidden additions
  const forbiddenAdditions = [
    'await page.waitForTimeout',
    'await page.waitForSelector',
    'retry',
    'try {',
    'catch (',
    '.reload()',
    '.goBack()',
    '.goForward()'
  ];

  for (const forbidden of forbiddenAdditions) {
    if (generatedCode.includes(forbidden)) {
      deviations.push(`DEVIATION DETECTED: Unauthorized addition "${forbidden}" found in code`);
    }
  }

  return {
    isValid: deviations.length === 0,
    errors,
    deviations
  };
}

/**
 * Extracts locked values from test input
 */
export function extractLockedValues(testInput: string): LockedValue[] {
  const locks: LockedValue[] = [];
  const lockPattern = /\[LOCK\s+(\w+)(?:\s+(\w+))?\]\s*(.+)/g;
  
  let match;
  while ((match = lockPattern.exec(testInput)) !== null) {
    const [, type1, type2, value] = match;
    const type = type2 ? `${type1}_${type2}` : type1;
    
    locks.push({
      type: type as any,
      key: type.toLowerCase(),
      value: value.trim(),
      isLocked: true
    });
  }

  return locks;
}

/**
 * Pre-generation validation to ensure all required locked values are present
 */
export function validateInputCompleteness(locks: LockedValue[]): ValidationResult {
  const errors: string[] = [];
  const deviations: string[] = [];

  for (const lock of locks) {
    if (lock.isLocked && (!lock.value || lock.value.includes('<') || lock.value.includes('TODO'))) {
      errors.push(`INCOMPLETE: ${lock.type} "${lock.key}" is not properly specified`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    deviations
  };
}

/**
 * Final validation that checks the generated code against original instructions
 */
export function performFinalValidation(
  originalInstructions: string,
  generatedCode: string,
  locks: LockedValue[]
): ValidationResult {
  const inputValidation = validateInputCompleteness(locks);
  const strictValidation = validateStrictMode(locks, generatedCode);

  return {
    isValid: inputValidation.isValid && strictValidation.isValid,
    errors: [...inputValidation.errors, ...strictValidation.errors],
    deviations: [...inputValidation.deviations, ...strictValidation.deviations]
  };
}