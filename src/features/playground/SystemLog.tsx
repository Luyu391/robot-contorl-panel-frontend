import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, X, Trash2, ChevronDown } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
}

interface SystemLogProps {
  /** 日志条目列表 */
  entries: LogEntry[];
  /** 清空日志 */
  onClear?: () => void;
  /** 外部控制展开状态 */
  expanded?: boolean;
  onToggle?: () => void;
}

const TYPE_STYLES: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-rose-400',
  debug: 'text-slate-400',
};

const TYPE_DOTS: Record<string, string> = {
  info: 'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
  debug: 'bg-slate-400',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SystemLog({ entries, onClear, expanded: extExpanded, onToggle }: SystemLogProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = extExpanded ?? internalExpanded;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const toggle = useCallback(() => {
    if (onToggle) onToggle();
    else setInternalExpanded((v) => !v);
  }, [onToggle]);

  // 自动滚到底部
  useEffect(() => {
    if (autoScroll && scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, expanded, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(dist < 40);
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {/* 折叠面板 */}
      <div
        className={`overflow-hidden rounded-xl border border-slate-700/30 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
          expanded ? 'mb-3 w-[380px] opacity-100' : 'h-0 w-0 opacity-0'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-slate-700/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-wider">SYSTEM LOG</span>
            <span className="rounded-full bg-slate-700/60 px-1.5 text-[10px] text-slate-400">{entries.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClear}
              className="rounded p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="清空日志"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              onClick={toggle}
              className="rounded p-1 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300 transition-colors"
              title="收起"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 日志内容 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[260px] overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed"
          style={{ scrollBehavior: 'smooth' }}
        >
          {entries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-600 text-xs">
              暂无日志信息
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="mb-1.5 flex items-start gap-2 animate-[logSlideIn_0.15s_ease-out]">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_STYLES[entry.type].replace('text-', '') }} />
                <span className="shrink-0 text-slate-600">{formatTime(entry.timestamp)}</span>
                <span className={TYPE_STYLES[entry.type] || 'text-slate-300'}>{entry.message}</span>
              </div>
            ))
          )}
        </div>

        {/* 底部：自动滚动提示 */}
        {!autoScroll && entries.length > 0 && (
          <button
            onClick={() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); setAutoScroll(true); }}
            className="absolute bottom-2 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 切换按钮 */}
      <button
        onClick={toggle}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
          expanded
            ? 'border-slate-600/50 bg-slate-800/90 text-slate-400 scale-0 opacity-0'
            : 'border-slate-300/40 bg-white/80 text-slate-600 shadow-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-indigo-200/50'
        }`}
        title={expanded ? '收起日志' : '打开系统日志'}
      >
        <Terminal className="h-4 w-4" />
      </button>
    </div>
  );
}

export default SystemLog;