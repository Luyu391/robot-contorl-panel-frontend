import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { SwipeCardCandidate, RobotStatus, RobotState } from '../types';
import type { CommandSuggestion } from '../types/command';

// Fallback data for offline mode
export const FALLBACK_CANDIDATES: SwipeCardCandidate[] = [
  { id: 'c1', name: '精密抓取方案', campus: 'A3实验室', academy: '装配组', grade: '高优先级', intro: '适用于精密零件的抓取与放置操作。', hobbies: ['precision', 'assembly'], score: 86, mbti: 'ISTJ' },
  { id: 'c2', name: '快速分拣方案', campus: 'B1实验室', academy: '物流组', grade: '中优先级', intro: '适用于流水线快速分拣场景。', hobbies: ['sorting', 'speed'], score: 81, mbti: 'ESTP' },
  { id: 'c3', name: '柔性操作方案', campus: 'C2实验室', academy: '研发组', grade: '高优先级', intro: '适用于不规则物体的柔性夹取。', hobbies: ['flexible', 'research'], score: 78, mbti: 'INFP' },
  { id: 'c4', name: '协作搬运方案', campus: 'A1实验室', academy: '产线组', grade: '低优先级', intro: '适用于双臂协作重物搬运。', hobbies: ['collaboration', 'heavy'], score: 83, mbti: 'ENTJ' },
  { id: 'c5', name: '检测探针方案', campus: 'D1实验室', academy: '质检组', grade: '中优先级', intro: '适用于表面质量检测与探针扫描。', hobbies: ['inspection', 'scanning'], score: 75, mbti: 'INTJ' },
  { id: 'c6', name: '焊接定位方案', campus: 'B2实验室', academy: '工艺组', grade: '高优先级', intro: '适用于高精度焊接定位任务。', hobbies: ['welding', 'positioning'], score: 88, mbti: 'ISTP' },
];

export const FALLBACK_ROBOT_STATE: RobotState = {
  status: 'idle',
  joints: { j1: 0, j2: -30, j3: 45, j4: -15, j5: 90, j6: 0 },
  pose: { x: 320.5, y: -88.2, z: 200.0, roll: 0, pitch: 45, yaw: 0 },
  gripper: 'open',
  speed: 50,
  lastUpdate: new Date().toISOString(),
};

export const FALLBACK_SUGGESTIONS: CommandSuggestion[] = [
  { id: 's1', text: '回零位待命', confidence: 100, category: '基础', description: '机械臂回到预设零点位置' },
  { id: 's2', text: '移动到实验台A上方', confidence: 95, category: '移动', description: '移动到指定实验台的安全高度' },
  { id: 's3', text: '张开夹爪', confidence: 100, category: '夹爪', description: '完全打开夹爪，准备抓取操作' },
  { id: 's4', text: '抓取当前位置物品', confidence: 92, category: '夹爪', description: '闭合夹爪抓取目标物品' },
  { id: 's5', text: '先上升5cm再旋转90度', confidence: 88, category: '复合', description: '复合指令：安全上升后旋转' },
];

interface OfflineContextType {
  isOffline: boolean;
  showOfflineBanner: boolean;
  dismissBanner: () => void;
  getFallbackCandidates: () => SwipeCardCandidate[];
  getFallbackRobotStatus: () => RobotState;
  getFallbackSuggestions: () => CommandSuggestion[];
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { online, supported } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(!online);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('offline_banner_dismissed', 'true');
  }, []);

  useEffect(() => {
    if (!online && supported) {
      const dismissed = localStorage.getItem('offline_banner_dismissed');
      if (dismissed !== 'true') {
        setShowBanner(true);
      }
    } else if (online) {
      localStorage.removeItem('offline_banner_dismissed');
      setShowBanner(false);
    }
  }, [online, supported]);

  const isOffline = !online && supported;

  const getFallbackCandidates = useCallback(() => FALLBACK_CANDIDATES, []);
  const getFallbackRobotStatus = useCallback(() => {
    return {
      ...FALLBACK_ROBOT_STATE,
      lastUpdate: new Date().toISOString(),
    };
  }, []);
  const getFallbackSuggestions = useCallback(() => FALLBACK_SUGGESTIONS, []);

  return (
    <OfflineContext.Provider value={{
      isOffline,
      showOfflineBanner: showBanner,
      dismissBanner,
      getFallbackCandidates,
      getFallbackRobotStatus,
      getFallbackSuggestions,
    }}>
      {children}
      {showBanner && isOffline && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">离线模式已启用</span>
              <span className="text-xs text-amber-600">使用本地缓存数据</span>
            </div>
            <button
              onClick={dismissBanner}
              className="ml-4 rounded-lg px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineProvider;
