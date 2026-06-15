import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

async function bootstrap() {
  // 尝试启动 MSW，失败则静默降级（使用 fallback 数据）
  if (import.meta.env.DEV) {
    try {
      const { worker } = await import('./mocks/browser');
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 4000));
      await Promise.race([worker.start({ onUnhandledRequest: 'bypass', quiet: true }), timeout]);
    } catch {
      // MSW 不可用（如 iframe 限制），应用仍可使用 fallback 数据正常运行
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

bootstrap();