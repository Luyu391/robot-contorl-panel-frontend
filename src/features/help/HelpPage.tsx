import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Keyboard, Lightbulb, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const faqItems = [
  { q: '如何输入自然语言指令？', a: '在指令输入框中直接描述你想让机械臂执行的操作，例如"移动到实验台A上方，张开夹爪"。OpenCLaw 会利用 NL 引擎解析你的意图并转换为机械臂指令。' },
  { q: '安全确认弹窗什么时候出现？', a: '当系统检测到指令中包含潜在风险关键词（如"碰撞"、"全速"），或解析后判断需要人工确认时，会自动弹出安全确认窗口。' },
  { q: 'AI 建议卡片如何使用？', a: '你无需输入完整指令。点击任意 AI 建议卡片，系统会自动采纳该指令并执行。建议卡片会根据你的最近操作历史和当前上下文动态生成。' },
  { q: '指令执行失败怎么办？', a: '执行失败时，系统会给出具体的错误原因。常见原因包括关节角度超出安全范围、目标坐标不可达等。请根据提示调整指令后重试。' },
];

const shortcuts = [
  { key: 'Enter', desc: '发送当前指令' },
  { key: 'Shift + Enter', desc: '换行（指令输入框内）' },
  { key: 'Esc', desc: '关闭弹窗 / 取消操作' },
  { key: 'Tab', desc: '在安全确认弹窗内切换焦点' },
  { key: '← →', desc: '导航历史记录卡片' },
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="space-y-5 pt-2">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/40">OPENCLAW</p>
        <h1 className="mt-2 text-3xl font-bold text-white glow-text">帮助中心</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
          了解如何使用 OpenCLaw 控制面板，查看键盘快捷键和常见问题。
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Keyboard className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">键盘快捷键</h2>
              <p className="text-[10px] text-white/40">快速操作指令</p>
            </div>
          </div>
          <div className="space-y-2">
            {shortcuts.map((sc) => (
              <div key={sc.key} className="flex items-center justify-between rounded-xl bg-white/[0.06] backdrop-blur-sm px-4 py-2.5 transition-all hover:bg-white/[0.1]">
                <kbd className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 font-mono text-xs font-semibold text-indigo-300 shadow-lg">
                  {sc.key}
                </kbd>
                <span className="text-xs text-white/70">{sc.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <HelpCircle className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">常见问题</h2>
              <p className="text-[10px] text-white/40">FAQ</p>
            </div>
          </div>
          <div className="space-y-2">
            {faqItems.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-white/[0.1]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium text-white/80 transition-all hover:bg-white/[0.06]"
                >
                  <span>{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-emerald-300 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-3"
                  >
                    <p className="text-xs leading-5 text-white/70 border-t border-white/[0.1] pt-3">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Lightbulb className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">使用技巧</h2>
              <p className="text-[10px] text-white/40">提高操作效率</p>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              '描述越具体，解析越精准。尽量包含目标位置、操作类型和参数。',
              '善用仪表盘的快捷操作按钮，常见操作无需手动输入指令。',
              '在监控页面可以实时查看各个关节的角度变化，便于调试。',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.06] p-3">
                <span className="mt-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-xs leading-5 text-white/70">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}

export default HelpPage;