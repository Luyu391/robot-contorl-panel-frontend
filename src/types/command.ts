export type CommandSource = 'typed' | 'suggested' | 'quick' | 'voice';

export type CommandStatus = 'pending' | 'parsing' | 'validating' | 'executing' | 'completed' | 'failed' | 'cancelled';

export type CommandDifficulty = 'easy' | 'medium' | 'complex';

export interface ParsedCommand {
  action: string;
  target: string;
  params: Record<string, string>;
  confidence: number;
}

export interface SafetyCheck {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export interface CommandRecord {
  id: string;
  rawText: string;
  parsed?: ParsedCommand;
  safety?: SafetyCheck;
  status: CommandStatus;
  source: CommandSource;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  resultSummary?: string;
}

export interface CommandSuggestion {
  id: string;
  text: string;
  confidence: number;
  category: string;
  description: string;
}