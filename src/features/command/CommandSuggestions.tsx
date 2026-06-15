import { motion } from 'framer-motion';
import { useCallback } from 'react';
import { Sparkles, Zap, ArrowUpRight, X } from 'lucide-react';
import type { CommandSuggestion } from '../../types';

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  onSelect: (suggestion: CommandSuggestion) => void;
  onDismiss?: (suggestion: CommandSuggestion) => void;
}

const categoryColors: Record<string, string> = {
  '基础': 'border-l-slate-400',
  '移动': 'border-l-blue-600',
  '夹爪': 'border-l-emerald-600',
  '复合': 'border-l-amber-600',
  'LLM推荐': 'border-l-violet-600',
};

const categoryBg: Record<string, string> = {
  '基础': 'bg-white/30 text-slate-600',
  '移动': 'bg-indigo-50/50 text-indigo-600',
  '夹爪': 'bg-emerald-50/50 text-emerald-600',
  '复合': 'bg-amber-50/50 text-amber-600',
  'LLM推荐': 'bg-violet-50/50 text-violet-600',
};

export function CommandSuggestions({ suggestions, onSelect, onDismiss }: CommandSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/30 bg-white/20 backdrop-blur-sm py-10 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-slate-600" />
        <p className="mt-2 text-sm text-slate-500">暂无建议，输入上下文将获得更多推荐</p>
      </div>
    );
  }

  return (
    <div
      data-testid="suggestion-grid"
      role="region"
      aria-label="AI 指令建议列表，点击即可采纳"
      className="grid gap-3 sm:grid-cols-2"
    >
      {suggestions.map((suggestion, i) => (
        <SuggestionTile
          key={suggestion.id}
          suggestion={suggestion}
          index={i}
          onSelect={onSelect}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface SuggestionTileProps {
  suggestion: CommandSuggestion;
  index: number;
  onSelect: (s: CommandSuggestion) => void;
  onDismiss?: (s: CommandSuggestion) => void;
}

function SuggestionTile({ suggestion, index, onSelect, onDismiss }: SuggestionTileProps) {
  const borderColor = categoryColors[suggestion.category] ?? 'border-l-slate-400';
  const badgeStyle = categoryBg[suggestion.category] ?? 'bg-slate-100 text-slate-600';

  const handleClick = useCallback(() => {
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.(suggestion);
    },
    [onDismiss, suggestion],
  );

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.98 }}
      aria-label={`采纳建议：${suggestion.text}，置信度${suggestion.confidence}%`}
      className={`glass-btn group relative flex flex-col items-start gap-2.5 rounded-2xl border-l-[3px] ${borderColor} p-4 text-left`}
    >
      <div className="flex w-full items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeStyle}`}>
          {suggestion.category}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-emerald-50/50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
            <Sparkles className="h-3 w-3" />
            {suggestion.confidence}%
          </span>
          {onDismiss && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleDismiss}
              aria-label={`忽略建议：${suggestion.text}`}
              className="glass-btn flex h-5 w-5 items-center justify-center p-0 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-slate-500"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold leading-5 text-slate-800">
        {suggestion.text}
      </p>

      <p className="text-xs leading-5 text-slate-500">
        {suggestion.description}
      </p>

      <div className="mt-auto flex w-full items-center justify-between pt-1">
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <Zap className="h-3 w-3" />
          点击采纳
        </span>
        <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-indigo-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </motion.button>
  );
}

export default CommandSuggestions;