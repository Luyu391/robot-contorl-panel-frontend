import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import type { CommandRecord } from '../../types';

interface CommandHistoryProps {
  history: CommandRecord[];
  onReplay?: (record: CommandRecord) => void;
}

export function CommandHistory({ history, onReplay }: CommandHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-white/30 bg-white/20 backdrop-blur-sm py-12 text-center text-sm text-slate-500">
        <Clock className="mx-auto h-8 w-8 opacity-40" />
        <p className="mt-3">暂无指令历史</p>
        <p className="mt-1 text-xs">执行指令后将在此显示</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" role="list" aria-label="指令历史记录">
      <AnimatePresence>
        {history.map((record) => (
          <motion.li
            key={record.id}
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="group flex items-center gap-3 rounded-2xl border border-white/30 glass px-4 py-3 shadow-lg transition hover:bg-white/30">
              <div className="shrink-0">
                {record.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="执行成功" />
                ) : record.status === 'failed' ? (
                  <XCircle className="h-5 w-5 text-rose-600" aria-label="执行失败" />
                ) : record.status === 'executing' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock className="h-5 w-5 text-slate-500" aria-label="执行中" />
                  </motion.div>
                ) : (
                  <Clock className="h-5 w-5 text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{record.rawText}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  {record.duration !== undefined && (
                    <span className="ml-2">· {(record.duration / 1000).toFixed(1)}s</span>
                  )}
                  <span className="ml-2">· {statusLabel(record.status)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onReplay?.(record)}
                aria-label={`重放指令：${record.rawText}`}
                className="glass-btn shrink-0 p-2 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-indigo-700 focus-visible:opacity-100"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case 'pending': return '等待中';
    case 'parsing': return '解析中';
    case 'validating': return '校验中';
    case 'executing': return '执行中';
    case 'completed': return '成功';
    case 'failed': return '失败';
    case 'cancelled': return '已取消';
    default: return s;
  }
}

export default CommandHistory;