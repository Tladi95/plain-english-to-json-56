/**
 * UNIVERSAL STRICT MODE: Instruction validation and compliance checking
 * Ensures generated code follows user instructions exactly with zero deviation
 */

export interface ValidationResult {
  isValid: boolean;
  deviations: string[];
  extractedValues: Record<string, string>;
  missingRequirements: string[];
}

export interface ExtractedInstruction {
  action: string;
  target?: string;
  value?: string;
  assertion?: string;
  url?: string;
}

/**
 * Extract all actionable instructions from plain English
 */
export function parseInstructions(description: string): ExtractedInstruction[] {
  const instructions: ExtractedInstruction[] = [];
  const lowerDesc = description.toLowerCase();
  
  // Extract navigation instructions
  const navMatch = lowerDesc.match(/(?:go to|navigate to|visit|open)\s+(.+?)(?:\s+and|\s+then|$)/i);
  if (navMatch) {
    instructions.push({
      action: 'navigate',
      target: navMatch[1].trim()
    });
  }
  
  // Extract login instructions with credentials
  const loginMatch = description.match(/(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+with\s+username\s+([A-Za-z0-9_@.-]+)(?:\s+and\s+password\s+([A-Za-z0-9_@.-]+))?/i);
  if (loginMatch) {
    instructions.push({
      action: 'login',
      value: `username: ${loginMatch[1]}${loginMatch[2] ? `, password: ${loginMatch[2]}` : ''}`
    });
  }
  
  // Extract click instructions
  const clickMatch = description.match(/(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+and|\s+then|$)/i);
  if (clickMatch) {
    instructions.push({
      action: 'click',
      target: clickMatch[1].trim()
    });
  }
  
  // Extract assertion instructions
  const assertMatch = description.match(/(?:expect|should\s+see|shows?|displays?)\s+(.+?)(?:\s+and|\s+then|$)/i);
  if (assertMatch) {
    instructions.push({
      action: 'assert',
      assertion: assertMatch[1].trim()
    });
  }
  
  return instructions;
}

/**
 * Validate that generated code implements all user instructions
 */
export function validateInstructionCompliance(
  originalDescription: string, 
  generatedCode: string
): ValidationResult {
  const instructions = parseInstructions(originalDescription);
  const deviations: string[] = [];
  const missingRequirements: string[] = [];
  const extractedValues: Record<string, string> = {};
  
  // Extract values from original description
  const usernameMatch = originalDescription.match(/username\s+([A-Za-z0-9_@.-]+)/i);
  if (usernameMatch) {
    extractedValues.username = usernameMatch[1];
  }
  
  const passwordMatch = originalDescription.match(/password\s+([A-Za-z0-9_@.-]+)/i);
  if (passwordMatch) {
    extractedValues.password = passwordMatch[1];
  }
  
  // Validate each instruction
  for (const instruction of instructions) {
    switch (instruction.action) {
      case 'navigate':
        if (!generatedCode.includes('page.goto') && !generatedCode.includes('cy.visit')) {
          missingRequirements.push('Missing navigation step');
        }
        break;
        
      case 'login':
        // Check for username field
        if (extractedValues.username && !generatedCode.includes(extractedValues.username)) {
          deviations.push(`Username "${extractedValues.username}" not found in generated code`);
        }
        
        // Check for password field
        if (extractedValues.password && !generatedCode.includes(extractedValues.password)) {
          deviations.push(`Password "${extractedValues.password}" not found in generated code`);
        }
        
        // Check for login action
        if (!generatedCode.includes('fill') && !generatedCode.includes('type')) {
          missingRequirements.push('Missing form filling steps');
        }
        break;
        
      case 'click':
        if (!generatedCode.includes('click')) {
          missingRequirements.push('Missing click action');
        }
        break;
        
      case 'assert':
        if (!generatedCode.includes('expect') && !generatedCode.includes('assert')) {
          missingRequirements.push('Missing assertion step');
        }
        break;
    }
  }
  
  return {
    isValid: deviations.length === 0 && missingRequirements.length === 0,
    deviations,
    extractedValues,
    missingRequirements
  };
}

/**
 * Ensure generated code uses exact values from user input
 */
export function validateExactValues(originalInput: string, generatedCode: string): string[] {
  const errors: string[] = [];
  
  // Check for exact username preservation
  const usernameMatch = originalInput.match(/username\s+([A-Za-z0-9_@.-]+)/i);
  if (usernameMatch && !generatedCode.includes(usernameMatch[1])) {
    errors.push(`DEVIATION: Username "${usernameMatch[1]}" was not preserved exactly`);
  }
  
  // Check for exact password preservation
  const passwordMatch = originalInput.match(/password\s+([A-Za-z0-9_@.-]+)/i);
  if (passwordMatch && !generatedCode.includes(passwordMatch[1])) {
    errors.push(`DEVIATION: Password "${passwordMatch[1]}" was not preserved exactly`);
  }
  
  // Check for TODO placeholders (should not exist if values were provided)
  if (usernameMatch && generatedCode.includes('// TODO')) {
    errors.push('DEVIATION: TODO placeholder found despite username being provided');
  }
  
  if (passwordMatch && generatedCode.includes('// TODO')) {
    errors.push('DEVIATION: TODO placeholder found despite password being provided');
  }
  
  return errors;
}