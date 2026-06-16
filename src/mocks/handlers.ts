import { http, HttpResponse, delay } from 'msw';

// 模拟网络延迟配置（毫秒）
const NETWORK_DELAY = {
  fast: 80,      // 快速接口（如状态检查）
  normal: 300,   // 常规接口
  slow: 800,     // 慢速接口（确保骨架屏可见）
  extra: 1200,   // 额外慢速接口
};

function makeState() {
  return {
    status: 'idle' as 'idle' | 'moving' | 'executing' | 'error' | 'offline',
    joints: { j1: 0, j2: -30, j3: 45, j4: -15, j5: 90, j6: 0 },
    pose: { x: 320.5, y: -88.2, z: 200.0, roll: 0, pitch: 45, yaw: 0 },
    gripper: 'open' as const,
    speed: 50,
    lastUpdate: new Date().toISOString(),
  };
}

let cycle = 0;
const statusCycle: Array<'idle' | 'moving'> = ['idle', 'idle', 'idle', 'idle', 'moving', 'idle'];

export const handlers = [
  http.get('/api/robot/status', async () => {
    await delay(NETWORK_DELAY.fast);
    const s = makeState();
    s.status = statusCycle[cycle % statusCycle.length];
    cycle += 1;
    if (s.status === 'moving') {
      s.joints.j1 += 2.5;
      s.pose.x += 1.2;
    }
    return HttpResponse.json(s);
  }),

  http.post('/api/robot/parse', async ({ request }) => {
    await delay(NETWORK_DELAY.normal);
    const body = (await request.json()) as { text?: string };
    const text = (body?.text ?? '').toLowerCase();

    const action = text.includes('抓') || text.includes('grab') ? 'grab'
      : text.includes('放') || text.includes('release') ? 'release'
      : text.includes('旋转') || text.includes('rotate') ? 'rotate'
      : 'move';

    const target = text.includes('实验台a') ? 'table_a'
      : text.includes('实验台b') ? 'table_b'
      : text.includes('样本架') ? 'sample_rack'
      : text.includes('零点') || text.includes('回零') ? 'home'
      : 'current';

    return HttpResponse.json({
      action,
      target,
      params: { speed: 'medium' },
      confidence: 92,
    });
  }),

  http.post('/api/robot/safety-check', async ({ request }) => {
    await delay(NETWORK_DELAY.fast);
    const body = (await request.json()) as { action?: string };
    return HttpResponse.json({
      passed: true,
      warnings: body?.action === 'grab' ? ['夹爪操作前请确认目标位置无障碍物'] : [],
      errors: [],
    });
  }),

  http.post('/api/robot/execute', async ({ request }) => {
    const body = (await request.json()) as { text?: string };
    const text = body?.text ?? '';
    const duration = 600 + Math.random() * 800;
    await delay(Math.floor(duration));

    const failChance = text.includes('碰撞') || text.includes('hit') ? 0.9 : 0.03;
    const failed = Math.random() < failChance;

    return HttpResponse.json({
      success: !failed,
      summary: failed
        ? '执行失败：关节3超出安全范围(±160°)'
        : `指令"${text.slice(0, 30)}"执行成功，机械臂已到达目标位置`,
      duration,
    });
  }),

  http.get('/api/robot/suggestions', async ({ request }) => {
    await delay(NETWORK_DELAY.normal);
    const url = new URL(request.url);
    const context = url.searchParams.get('context') ?? '';

    return HttpResponse.json([
      { id: 's1', text: '回零位待命', confidence: 100, category: '基础', description: '机械臂回到预设零点位置' },
      { id: 's2', text: context.includes('实验') ? '移动到实验台B' : '移动到实验台A上方', confidence: context.includes('实验') ? 90 : 95, category: '移动', description: '移动到指定实验台的安全高度' },
      { id: 's3', text: '张开夹爪', confidence: 100, category: '夹爪', description: '完全打开夹爪，准备抓取操作' },
      { id: 's4', text: '抓取当前位置物品', confidence: 92, category: '夹爪', description: '闭合夹爪抓取目标物品' },
      { id: 's5', text: '先上升5cm再旋转90度', confidence: 88, category: '复合', description: '复合指令：安全上升后旋转' },
    ]);
  }),

  http.get('/api/robot/result/:id', async () => {
    await delay(NETWORK_DELAY.fast);
    return HttpResponse.json({
      success: Math.random() > 0.1,
      summary: '指令执行完成，机械臂各关节角度: J1=12.5° J2=-28.3° J3=48.1° J4=-12.7° J5=90° J6=0°',
      duration: 800 + Math.random() * 600,
    });
  }),

  http.post('/api/llm/microcopy', async ({ request }) => {
    await delay(NETWORK_DELAY.normal);
    const body = (await request.json()) as { prompt?: string };
    const prompt = (body?.prompt ?? '').toLowerCase();

    if (prompt.includes('command-suggest')) {
      return HttpResponse.json({
        suggestions: [
          { id: 'llm1', text: '移动到安全高度后张开夹爪', confidence: 94, category: 'LLM推荐', description: '先上升至安全高度后执行夹爪操作' },
          { id: 'llm2', text: '回到零点重新校准', confidence: 89, category: 'LLM推荐', description: '返回机械零点，重新建立参考坐标系' },
          { id: 'llm3', text: '慢速移动到样本架位置', confidence: 91, category: 'LLM推荐', description: '以低速模式移动到样本架上方' },
        ],
      });
    }

    if (prompt.includes('reveal-summary')) {
      return HttpResponse.json({
        line: '机械臂已平稳到达目标位置，各关节状态正常，夹爪处于待命状态',
      });
    }

    if (prompt.includes('safety-enhance')) {
      return HttpResponse.json({
        line: '检测到潜在碰撞风险，已自动降低速度为安全模式的30%。建议手动确认目标区域无障碍物后再执行。',
      });
    }

    return HttpResponse.json({ line: '操作完成' });
  }),

  http.get('/api/dating/profiles', async ({ request }) => {
    // 关键：800ms延迟确保骨架屏可见
    await delay(NETWORK_DELAY.slow);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const names = ['精密抓取方案', '快速分拣方案', '柔性操作方案', '协作搬运方案', '检测探针方案', '焊接定位方案', '涂胶轨迹方案', '视觉引导方案', '力控装配方案', '码垛堆叠方案', '打磨抛光方案', '测量校准方案'];
    const campuses = ['A3实验室', 'B1实验室', 'C2实验室'];
    const academies = ['装配组', '物流组', '研发组', '质检组', '产线组', '工艺组', '测试组', '维护组'];
    const grades = ['高优先级', '中优先级', '低优先级', '紧急', '常规'];
    const hobbyPool = ['precision', 'assembly', 'sorting', 'speed', 'flexible', 'research', 'collaboration', 'heavy', 'inspection', 'scanning', 'welding', 'positioning', 'vision', 'force-control', 'palletizing', 'polishing'];
    const intros = [
      '适用于精密零件的抓取与放置操作。',
      '适用于流水线快速分拣场景。',
      '适用于不规则物体的柔性夹取。',
      '适用于双臂协作重物搬运。',
      '适用于表面质量检测与探针扫描。',
      '适用于高精度焊接定位。',
      '适用于连续涂胶轨迹规划。',
      '适用于视觉引导下的目标定位。',
      '适用于力控精密装配。',
      '适用于码垛堆叠作业。',
      '适用于打磨抛光工艺。',
      '适用于测量校准任务。',
    ];
    const candidates = Array.from({ length: Math.min(limit, 12) }, (_, i) => ({
      id: `dc${i + 1}`,
      name: names[i % names.length],
      campus: campuses[i % campuses.length],
      academy: academies[i % academies.length],
      grade: grades[i % grades.length],
      intro: intros[i % intros.length],
      hobbies: [hobbyPool[i % hobbyPool.length], hobbyPool[(i + 3) % hobbyPool.length]],
      score: 70 + Math.floor(Math.random() * 25),
      mbti: ['INTJ', 'ENFP', 'ISTP', 'INFJ', 'ENTP'][i % 5],
    }));
    return HttpResponse.json({ candidates, generated_at: new Date().toISOString() });
  }),

  http.post('/api/dating/swipe', async ({ request }) => {
    await delay(NETWORK_DELAY.fast);
    const body = (await request.json()) as { candidate_id?: string; direction?: string };
    return HttpResponse.json({
      ok: true,
      candidate_id: body?.candidate_id,
      direction: body?.direction,
      mutual: Math.random() < 0.2,
    });
  }),

  http.get('/api/dating/matches/next-reveal', async () => {
    await delay(NETWORK_DELAY.normal);
    return HttpResponse.json({
      matchId: 'mr1',
      selfName: '当前任务',
      partnerName: '精密抓取方案',
      score: 86,
      highlights: ['操作参数匹配', '执行环境兼容', '精度要求吻合'],
    });
  }),
];