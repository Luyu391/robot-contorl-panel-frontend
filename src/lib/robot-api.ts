import type { RobotState, CommandSuggestion, ParsedCommand, SafetyCheck } from '../types';

const BASE = '/api/robot';

export async function fetchRobotStatus(): Promise<RobotState> {
  const res = await fetch(`${BASE}/status`);
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json();
}

export async function parseCommand(text: string): Promise<ParsedCommand> {
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
  return res.json();
}

export async function validateSafety(parsed: ParsedCommand): Promise<SafetyCheck> {
  const res = await fetch(`${BASE}/safety-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed),
  });
  if (!res.ok) throw new Error(`Safety check failed: ${res.status}`);
  return res.json();
}

export async function executeCommand(text: string, parsed: ParsedCommand): Promise<{ success: boolean; summary: string; duration: number }> {
  const res = await fetch(`${BASE}/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, parsed }),
  });
  if (!res.ok) throw new Error(`Execution failed: ${res.status}`);
  const data = await res.json();
  return { success: data.success, summary: data.summary, duration: data.duration ?? 0 };
}

export async function getCommandSuggestions(context: string): Promise<CommandSuggestion[]> {
  const res = await fetch(`${BASE}/suggestions?context=${encodeURIComponent(context)}`);
  if (!res.ok) throw new Error(`Suggestions failed: ${res.status}`);
  return res.json();
}

export async function getExecutionResult(cmdId: string): Promise<{ success: boolean; summary: string; duration: number }> {
  const res = await fetch(`${BASE}/result/${cmdId}`);
  if (!res.ok) throw new Error(`Result fetch failed: ${res.status}`);
  return res.json();
}