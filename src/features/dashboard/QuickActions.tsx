import { motion } from 'framer-motion';
import { Home, Hand, Grab, RotateCcw, Crosshair, ChevronRight } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: string;
  className: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'home', label: '回零位', icon: <Home className="h-5 w-5" />, command: '回零位待命', className: 'glass-btn px-4 py-2 text-sm font-medium text-slate-500' },
  { id: 'open', label: '张开夹爪', icon: <Hand className="h-5 w-5" />, command: '张开夹爪', className: 'glass-btn glass-btn-emerald px-4 py-2 text-sm font-medium text-emerald-600' },
  { id: 'grab', label: '抓取', icon: <Grab className="h-5 w-5" />, command: '闭合夹爪抓取', className: 'glass-btn glass-btn-indigo px-4 py-2 text-sm font-medium text-indigo-600' },
  { id: 'safe', label: '安全高度', icon: <RotateCcw className="h-5 w-5" />, command: '上升到安全高度', className: 'glass-btn glass-btn-amber px-4 py-2 text-sm font-medium text-amber-600' },
  { id: 'preset', label: '预设位姿1', icon: <Crosshair className="h-5 w-5" />, command: '移动到预设位姿1', className: 'glass-btn glass-btn-indigo px-4 py-2 text-sm font-medium text-indigo-600' },
];

interface QuickActionsProps {
  onAction: (command: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="space-y-3" role="region" aria-label="快捷操作">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">快捷操作</h3>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <motion.button key={action.id} type="button" disabled={disabled} onClick={() => onAction(action.command)}
            whileTap={{ scale: 0.95 }}
            aria-label={`快捷操作：${action.label}`}
            data-testid={`quick-action-${action.id}`}
            className={`inline-flex items-center gap-2 disabled:opacity-40 ${action.className}`}>
            {action.icon}
            {action.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;