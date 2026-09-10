export interface TestReport {
  testResults: Array<{
    name: string;
    status: string;
    message?: string;
    assertionResults: Array<{
      status: string;
      fullName?: string;
      title: string;
      failureMessages?: string[];
    }>;
  }>;
}
export function failedTestDiagnostics(report: TestReport, root?: string): Array<{
  file: string;
  test: string;
  messages: string[];
}>;
