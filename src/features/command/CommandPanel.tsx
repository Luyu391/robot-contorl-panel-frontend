import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Sparkles, Star, Filter, Bookmark, ChevronRight, Zap } from 'lucide-react';
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-1.5">
          <Terminal className="h-4 w-4 text-blue-300" />
          <span className="text-xs font-medium text-white/60">AI 指令系统</span>
        </div>
        <h1 className="mt-4 text-4xl font-bold text-white glow-text">指令控制</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-white/50">
          输入自然语言指令来控制机械臂。你可以描述目标位置、操作类型和参数，
          OpenRobot 会自动解析并安全执行。
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Terminal className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white/90">指令输入</h2>
              <p className="text-xs text-white/40">输入自然语言，AI 自动解析</p>
            </div>
          </div>
          <Zap className="h-5 w-5 text-white/30" />
        </div>
        <CommandInput onExecute={handleCommand} />
      </motion.div>

      {favoriteItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl glass-strong p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Bookmark className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white/90">收藏指令</h2>
                <p className="text-xs text-white/40">快速调用常用指令</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
              {favoriteItems.length} 条
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {favoriteItems.slice(0, 6).map((item) => (
              <button key={item.id} onClick={() => handleReplay(item)}
                className="group relative overflow-hidden glass-btn glass-btn-amber inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-300">
                <Star className="h-4 w-4 fill-amber-500 text-amber-300" />
                <span className="max-w-[180px] truncate">{item.rawText}</span>
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Sparkles className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white/90">AI 智能建议</h2>
              <p className="text-xs text-white/40">基于上下文推荐最佳指令</p>
            </div>
          </div>
          <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
            LLM 驱动
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-white/40" />
            <span className="text-xs text-white/40">分类</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)} aria-pressed={filter === cat}
                className={`glass-btn px-3 py-1 text-xs font-medium transition-all ${
                  filter === cat
                    ? 'glass-btn-violet text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    : 'text-white/40 hover:text-white/70'
                }`}>
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>
        </div>
        {filteredSuggestions.length > 0
          ? <div className="mt-4"><CommandSuggestions suggestions={filteredSuggestions} onSelect={handleSelectSuggestion} /></div>
          : <div className="mt-4 flex items-center justify-center py-8">
              <p className="text-sm text-white/40">该分类暂无建议</p>
            </div>}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Zap className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white/90">执行历史</h2>
              <p className="text-xs text-white/40">查看所有执行记录</p>
            </div>
          </div>
          {history.length > 0 && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
              {history.length} 条
            </span>
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