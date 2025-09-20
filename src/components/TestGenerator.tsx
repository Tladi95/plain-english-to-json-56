import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Wand2, Code2, TestTube2, Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { generateTestCase, exampleTestCases, type TestCase } from "@/core/dsl-generator";
import { generateCode, type GeneratedCode } from "@/core/code-generator";
import { createTestExecutor, type TestResult, type ExecutionOptions } from "@/core/test-executor";
import { useToast } from "@/hooks/use-toast";

export function TestGenerator() {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [generatedTest, setGeneratedTest] = useState<TestCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim() || !url.trim()) {
      toast({
        title: "Missing inputs",
        description: "Please provide both test description and URL",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const testCase = generateTestCase(description, url);
    setGeneratedTest(testCase);
    setIsGenerating(false);
    
    toast({
      title: "Test generated successfully!",
      description: "Your JSON DSL is ready to use"
    });
  };

  const handleCopy = async () => {
    if (!generatedTest) return;
    
    const jsonString = JSON.stringify(generatedTest, null, 2);
    await navigator.clipboard.writeText(jsonString);
    
    toast({
      title: "Copied to clipboard!",
      description: "JSON DSL has been copied to your clipboard"
    });
  };

  const loadExample = (example: typeof exampleTestCases[0]) => {
    setDescription(example.description);
    setUrl(example.url);
    setTestResult(null); // Clear previous results
  };

  const handleExecuteTest = async () => {
    if (!generatedTest) return;
    
    setIsExecuting(true);
    setTestResult({ status: 'running', message: 'Executing test...', duration: 0 });
    
    try {
      const executor = createTestExecutor();
      const result = await executor.execute(generatedTest);
      setTestResult(result);
      
      toast({
        title: result.status === 'passed' ? 'Test Passed!' : 'Test Failed',
        description: result.message,
        variant: result.status === 'passed' ? 'default' : 'destructive'
      });
    } catch (error) {
      setTestResult({
        status: 'failed',
        message: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyPlaywrightCode = async () => {
    if (!generatedTest) return;
    
    const generatedCode = generateCode(generatedTest);
    await navigator.clipboard.writeText(generatedCode.code);
    
    toast({
      title: "Playwright code copied!",
      description: "The test code has been copied to your clipboard"
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-primary rounded-xl p-3 shadow-glow">
              <TestTube2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Test Automation Assistant
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert plain English test descriptions into JSON DSL for browser automation
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Panel */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                Test Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Test Description</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., try to login with username Sam and password sammy"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none bg-input border-border focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Base URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-input border-border focus:ring-primary"
                />
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Test
                  </>
                )}
              </Button>

              {/* Example Tests */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Examples:</Label>
                <div className="space-y-2">
                  {exampleTestCases.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => loadExample(example)}
                      className="w-full justify-start text-left h-auto p-3 border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="text-xs">
                        <div className="font-medium">{example.description}</div>
                        <div className="text-muted-foreground mt-1">{example.url}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Code Panel */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-accent" />
                Generated Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedTest ? (
                <Tabs defaultValue="playwright" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="playwright">Playwright Code</TabsTrigger>
                    <TabsTrigger value="json">JSON DSL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="playwright" className="mt-4">
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="secondary">TypeScript</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPlaywrightCode}
                          className="border-border hover:border-primary/50"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                       <pre className="bg-code border border-code rounded-lg p-4 text-sm overflow-auto max-h-[500px] shadow-code">
                         <code className="text-foreground">
                           {generateCode(generatedTest).code}
                         </code>
                       </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="json" className="mt-4">
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="secondary">JSON DSL</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="border-border hover:border-primary/50"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy JSON
                        </Button>
                      </div>
                      <pre className="bg-code border border-code rounded-lg p-4 text-sm overflow-auto max-h-[500px] shadow-code">
                        <code className="text-foreground">
                          {JSON.stringify(generatedTest, null, 2)}
                        </code>
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your generated test code will appear here</p>
                  <p className="text-sm mt-2">Enter a test description and URL to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results Panel */}
          <Card className="shadow-elegant">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-secondary" />
                  Test Execution
                </CardTitle>
                {generatedTest && (
                  <Button
                    onClick={handleExecuteTest}
                    disabled={isExecuting}
                    className="bg-gradient-secondary hover:opacity-90"
                  >
                    {isExecuting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute Test
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {testResult ? (
                <div className="space-y-4">
                  {/* Status Header */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {testResult.status === 'passed' && (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                    {testResult.status === 'failed' && (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    {testResult.status === 'running' && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={testResult.status === 'passed' ? 'default' : testResult.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {testResult.status.toUpperCase()}
                        </Badge>
                        {testResult.duration && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {testResult.duration}ms
                          </div>
                        )}
                      </div>
                      <p className="text-sm mt-1">{testResult.message}</p>
                    </div>
                  </div>

                  {/* Error Details */}
                  {testResult.error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-destructive mb-2">Error Details:</h4>
                      <pre className="text-xs text-muted-foreground overflow-auto">
                        {testResult.error}
                      </pre>
                    </div>
                  )}

                  {/* Test Steps Summary */}
                  {generatedTest && testResult.status !== 'running' && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Test Steps:</h4>
                      <div className="space-y-1">
                        {generatedTest.steps.map((step, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30"
                          >
                            <Badge variant="outline" className="text-xs">
                              {step.action}
                            </Badge>
                            <span className="text-muted-foreground">
                              {step.action === 'goto' && `Navigate to ${step.path}`}
                              {step.action === 'fill' && `Fill "${step.locator?.value}" with "${step.text}"`}
                              {step.action === 'click' && `Click "${step.locator?.name || step.locator?.value}"`}
                              {step.action === 'assert' && `Assert ${step.assertion?.type}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : generatedTest ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Ready to execute test</p>
                  <p className="text-xs mt-1">Click "Execute Test" to run your test case</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Test results will appear here</p>
                  <p className="text-sm mt-2">Generate a test first to see execution results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Built for QA engineers and developers to streamline test automation</p>
        </div>
      </div>
    </div>
  );
}