import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { quickSafetyCheck } from '../lib/safety-validator';
import type { SafetyCheck } from '../types';

interface CommandInputProps {
  onExecute: (text: string) => void;
  disabled?: boolean;
}

export function CommandInput({ onExecute, disabled = false }: CommandInputProps) {
  const [text, setText] = useState('');
  const [safety, setSafety] = useState<SafetyCheck | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (text.trim().length > 0) {
      const result = quickSafetyCheck(text);
      setSafety(result);
    } else {
      setSafety(null);
    }
  }, [text]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (safety && safety.errors.length > 0) return;
    onExecute(trimmed);
    setText('');
    setSafety(null);
  }, [text, disabled, safety, onExecute]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
          placeholder='输入自然语言指令，例如："把机械臂移动到实验台A上方，然后张开夹爪"'
          aria-label="自然语言指令输入"
          className="w-full resize-none rounded-2xl border border-white/30 glass px-5 py-4 text-sm leading-6 text-white/90 placeholder:text-white/30 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !text.trim() || (safety?.errors.length ?? 0) > 0}
          aria-label="发送指令"
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center glass-btn glass-btn-indigo p-2 text-indigo-300"
        >
          {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {safety && (safety.errors.length > 0 || safety.warnings.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden rounded-2xl border p-4"
            style={{
              borderColor: safety.errors.length > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)',
              backgroundColor: safety.errors.length > 0 ? 'rgba(254,226,226,0.95)' : 'rgba(254,243,199,0.95)',
            }}
          >
            {safety.passed && (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                安全预检通过
              </p>
            )}
            {safety.errors.map((err, i) => (
              <p key={`err-${i}`} className="mt-1 flex items-start gap-2 text-sm text-rose-600">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{err}</span>
              </p>
            ))}
            {safety.warnings.map((warn, i) => (
              <p key={`warn-${i}`} className="mt-1 flex items-start gap-2 text-sm text-amber-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warn}</span>
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CommandInput;