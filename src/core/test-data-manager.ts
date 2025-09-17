/**
 * Test data manager for handling real test data instead of fake placeholders
 */

export interface TestDataSet {
  name: string;
  description?: string;
  data: Record<string, string>;
  isValid: boolean; // Whether this dataset represents valid or invalid data
}

export interface TestDataConfig {
  baseUrl: string;
  datasets: TestDataSet[];
  globalVariables?: Record<string, string>;
}

/**
 * Default test data manager that works with placeholder values
 */
export class TestDataManager {
  private config: TestDataConfig;
  
  constructor(config: TestDataConfig) {
    this.config = config;
  }
  
  /**
   * Get test data by name or type
   */
  getTestData(name: string): TestDataSet | null {
    return this.config.datasets.find(dataset => 
      dataset.name === name || 
      dataset.description?.toLowerCase().includes(name.toLowerCase())
    ) || null;
  }
  
  /**
   * Get valid test data for a specific scenario
   */
  getValidData(): Record<string, string> {
    const validDataset = this.config.datasets.find(ds => ds.isValid);
    return validDataset?.data || {};
  }
  
  /**
   * Get invalid test data for negative testing
   */
  getInvalidData(): Record<string, string> {
    const invalidDataset = this.config.datasets.find(ds => !ds.isValid);
    return invalidDataset?.data || {};
  }
  
  /**
   * Replace placeholders in test case with actual data
   */
  replacePlaceholders(text: string, dataType: 'valid' | 'invalid' = 'valid'): string {
    const data = dataType === 'valid' ? this.getValidData() : this.getInvalidData();
    let result = text;
    
    // Replace global variables first
    if (this.config.globalVariables) {
      Object.entries(this.config.globalVariables).forEach(([key, value]) => {
        const placeholder = `{{${key.toUpperCase()}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), value);
      });
    }
    
    // Replace test data placeholders
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key.toUpperCase()}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }
  
  /**
   * Create a new test data set
   */
  addTestDataSet(dataset: TestDataSet): void {
    this.config.datasets.push(dataset);
  }
  
  /**
   * Update base URL
   */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }
  
  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
  
  /**
   * Validate that all required placeholders have corresponding data
   */
  validateTestData(testCaseText: string): { isValid: boolean; missingFields: string[] } {
    const placeholderPattern = /\{\{([^}]+)\}\}/g;
    const placeholders = [...testCaseText.matchAll(placeholderPattern)].map(match => match[1]);
    const allData = { ...this.getValidData(), ...this.getInvalidData(), ...this.config.globalVariables };
    
    const missingFields = placeholders.filter(placeholder => 
      !allData.hasOwnProperty(placeholder.toLowerCase()) && 
      !allData.hasOwnProperty(placeholder.toUpperCase())
    );
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}

/**
 * Create a default test data manager with common placeholders
 */
export function createDefaultTestDataManager(baseUrl: string): TestDataManager {
  const config: TestDataConfig = {
    baseUrl,
    datasets: [
      {
        name: 'valid_user_data',
        description: 'Valid user credentials and information',
        isValid: true,
        data: {
          'test_username': 'your_username_here',
          'test_password': 'your_password_here', 
          'test_email': 'your_email@example.com',
          'test_name': 'Your Full Name',
          'test_phone': 'your_phone_number',
          'test_address': 'Your Address',
          'test_city': 'Your City',
          'test_zip': 'Your Zip Code',
          'test_country': 'Your Country',
          'test_state': 'Your State'
        }
      },
      {
        name: 'invalid_user_data', 
        description: 'Invalid user credentials for negative testing',
        isValid: false,
        data: {
          'invalid_username': 'invalid_user',
          'invalid_password': 'wrong_password',
          'invalid_email': 'invalid.email',
          'invalid_name': '',
          'invalid_phone': '123',
          'invalid_address': '',
          'invalid_city': '',
          'invalid_zip': '00000',
          'invalid_country': '',
          'invalid_state': ''
        }
      }
    ],
    globalVariables: {
      'base_url': baseUrl
    }
  };
  
  return new TestDataManager(config);
}

/**
 * Export configuration format for users to define their own test data
 */
export function createTestDataTemplate(fields: string[]): TestDataConfig {
  const validData: Record<string, string> = {};
  const invalidData: Record<string, string> = {};
  
  fields.forEach(field => {
    const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, '_');
    validData[`test_${normalizedField}`] = `{{REPLACE_WITH_YOUR_${normalizedField.toUpperCase()}}}`;
    invalidData[`invalid_${normalizedField}`] = `{{REPLACE_WITH_INVALID_${normalizedField.toUpperCase()}}}`;
  });
  
  return {
    baseUrl: '{{REPLACE_WITH_YOUR_BASE_URL}}',
    datasets: [
      {
        name: 'valid_data',
        description: 'Valid test data',
        isValid: true,
        data: validData
      },
      {
        name: 'invalid_data', 
        description: 'Invalid test data for negative testing',
        isValid: false,
        data: invalidData
      }
    ]
  };
}