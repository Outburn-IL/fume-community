/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export type DiagnosticLevel = 'fatal' | 'invalid' | 'error' | 'warning' | 'notice' | 'info' | 'debug';

export type DiagnosticEntry = {
  code?: string;
  message?: string;
  position?: number | string;
  start?: number | string;
  line?: number | string;
  fhirParent?: string;
  fhirElement?: string;
  severity: number;
  level: DiagnosticLevel;
  timestamp: number;
};

export type EvaluateVerboseReport = {
  ok: boolean;
  status: number;
  result: unknown;
  diagnostics: {
    error: DiagnosticEntry[];
    warning: DiagnosticEntry[];
    debug: DiagnosticEntry[];
  };
  executionId: string;
};
