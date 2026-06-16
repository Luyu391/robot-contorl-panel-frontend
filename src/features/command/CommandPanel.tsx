import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Sparkles, Star, Filter, Bookmark } from 'lucide-react';
import CommandInput from '../../components/CommandInput';
import CommandSuggestions from './CommandSuggestions';
import CommandHistory from './CommandHistory';
import SafetyGuard from '../../components/SafetyGuard';
import { useFavorites } from '../../hooks/useFavorites';
import type { CommandRecord, CommandSuggestion } from '../../types';
import { quickSafetyCheck } from '../../lib/safety-validator';

interface CommandPanelProps {
  history: CommandRecord[];
  onAddCommand: (record: CommandRecord) => void;
  onUpdateStatus: (id: string, status: CommandRecord['status'], extra?: Partial<CommandRecord>) => void;
  onExecute: (id: string, text: string) => Promise<{ success: boolean; summary: string; duration: number }>;
}

type FilterCategory = 'all' | '基础' | '移动' | '夹爪' | '复合' | 'LLM推荐';

let cmdCounter = 0;

export function CommandPanel({ history, onAddCommand, onUpdateStatus, onExecute }: CommandPanelProps) {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    fetch('/api/robot/suggestions?context=')
      .then((r) => r.json())
      .then((data: CommandSuggestion[]) => setSuggestions(data))
      .catch(() => {});
  }, []);

  const filteredSuggestions = useMemo(
    () => filter === 'all' ? suggestions : suggestions.filter((s) => s.category === filter),
    [suggestions, filter],
  );

  const favoriteItems = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((r) => {
      if (seen.has(r.rawText)) return false;
      seen.add(r.rawText);
      return favorites.includes(r.rawText);
    });
  }, [history, favorites]);

  const categories: FilterCategory[] = ['all', '基础', '移动', '夹爪', '复合', 'LLM推荐'];

  const handleCommand = useCallback(async (text: string) => {
    if (!isFavorite(text)) toggleFavorite(text);
    const safety = quickSafetyCheck(text);
    if (!safety.passed || safety.warnings.length > 0) {
      setPendingCommand(text);
      setSafetyOpen(true);
      return;
    }
    await executeCommand(text);
  }, [isFavorite, toggleFavorite]);

  const executeCommand = useCallback(async (text: string) => {
    const id = `cmd-${++cmdCounter}`;
    const record: CommandRecord = {
      id, rawText: text, status: 'executing', source: 'typed',
      createdAt: new Date().toISOString(),
    };
    onAddCommand(record);
    const start = Date.now();
    try {
      const result = await onExecute(id, text);
      const duration = Date.now() - start;
      onUpdateStatus(id, result.success ? 'completed' : 'failed', {
        completedAt: new Date().toISOString(), duration, resultSummary: result.summary,
      });
    } catch {
      const duration = Date.now() - start;
      onUpdateStatus(id, 'failed', { completedAt: new Date().toISOString(), duration, resultSummary: '执行异常' });
    }
  }, [onAddCommand, onUpdateStatus, onExecute]);

  const handleConfirmSafety = useCallback(() => {
    setSafetyOpen(false);
    if (pendingCommand) { executeCommand(pendingCommand); setPendingCommand(null); }
  }, [pendingCommand]);

  const handleCancelSafety = useCallback(() => { setSafetyOpen(false); setPendingCommand(null); }, []);

  const handleSelectSuggestion = useCallback((s: CommandSuggestion) => handleCommand(s.text), [handleCommand]);
  const handleReplay = useCallback((r: CommandRecord) => handleCommand(r.rawText), [handleCommand]);

  const safetyWarning = pendingCommand ? quickSafetyCheck(pendingCommand).warnings : [];

  return (
    <section className="space-y-6 pt-2">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/40">OPENCLAW</p>
        <h1 className="mt-2 text-3xl font-bold text-white">指令控制</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
          输入自然语言指令来控制机械臂。你可以描述目标位置、操作类型和参数，
          OpenCLaw 会自动解析并安全执行。
        </p>
      </div>

      {/* 指令输入 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl glass p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/80">指令输入</h2>
        </div>
        <CommandInput onExecute={handleCommand} />
      </motion.div>

      {/* 收藏 */}
      {favoriteItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl glass p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white/80">收藏指令</h2>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">{favoriteItems.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteItems.slice(0, 6).map((item) => (
              <button key={item.id} onClick={() => handleReplay(item)}
                className="glass-btn glass-btn-amber inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300">
                <Star className="h-3 w-3 fill-amber-500 text-amber-300" />
                {item.rawText.slice(0, 28)}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI 建议 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl glass p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white/80">AI 建议</h2>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">LLM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-white/40" />
            <div className="flex gap-1">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setFilter(cat)} aria-pressed={filter === cat}
                  className={`glass-btn px-2 py-0.5 text-[10px] font-medium ${filter === cat ? 'glass-btn-indigo text-indigo-300' : 'text-white/40'}`}>
                  {cat === 'all' ? '全部' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filteredSuggestions.length > 0
          ? <CommandSuggestions suggestions={filteredSuggestions} onSelect={handleSelectSuggestion} />
          : <p className="text-sm text-white/40">该分类暂无建议</p>}
      </motion.div>

      {/* 执行历史 */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl glass p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold text-white/80">执行历史</h2>
          {history.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40">{history.length} 条</span>
          )}
        </div>
        <CommandHistory history={history} onReplay={handleReplay} />
      </motion.div>

      <SafetyGuard open={safetyOpen} title="安全确认"
        message={pendingCommand ? `即将执行: "${pendingCommand}"` : ''}
        warnings={safetyWarning} onConfirm={handleConfirmSafety} onCancel={handleCancelSafety} />
    </section>
  );
}

export default CommandPanel;