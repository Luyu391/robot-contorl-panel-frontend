import { motion } from 'framer-motion';
import type { CommandRecord } from '../types';

interface ExecutionTimelineProps {
  history: CommandRecord[];
}

export function ExecutionTimeline({ history }: ExecutionTimelineProps) {
  const completed = history.filter((r) => r.status === 'completed' || r.status === 'failed');

  if (completed.length === 0) {
    return (
      <div className="text-center text-xs text-slate-500 py-6">
        暂无执行记录
      </div>
    );
  }

  const recent = completed.slice(0, 10);

  return (
    <div className="space-y-2" role="region" aria-label="执行时间线">
      <h3 className="text-sm font-semibold text-slate-700">最近执行</h3>
      <ol className="relative border-l border-white/30 ml-2 space-y-4">
        {recent.map((record, i) => (
          <motion.li
            key={record.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="ml-6"
          >
            <span
              className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${
                record.status === 'completed' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
              aria-hidden="true"
            />
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium text-ink-700">{record.rawText.slice(0, 24)}</p>
              <time className="shrink-0 text-xs text-slate-500">
                {new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
            {record.duration !== undefined && (
              <p className="mt-0.5 text-xs text-slate-500">
                耗时 {(record.duration / 1000).toFixed(1)}s ·{' '}
                {record.status === 'completed' ? '成功' : '失败'}
              </p>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export default ExecutionTimeline;