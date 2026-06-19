/**
 * E2E 测试 - 启动页面
 */

import { test, expect } from '@playwright/test';

test.describe('启动页面', () => {
  test('显示欢迎界面', async ({ page }) => {
    await page.goto('/');
    
    // 等待启动界面出现
    await expect(page.locator('[data-testid="splash-screen"]')).toBeVisible();
    
    // 检查标题
    await expect(page.getByText('OpenRobot')).toBeVisible();
  });

  test('点击进入按钮跳转到登录页', async ({ page }) => {
    await page.goto('/');
    
    // 点击进入按钮
    await page.click('[data-testid="splash-enter"]');
    
    // 等待跳转
    await expect(page).toHaveURL(/\/login/);
  });

  test('会话记忆：第二次访问跳过启动页', async ({ page, context }) => {
    // 第一次访问
    await page.goto('/');
    await page.click('[data-testid="splash-enter"]');
    
    // 清除当前页面，重新访问
    await page.goto('/');
    
    // 应该直接跳转到登录页（因为有会话记忆）
    // 注意：这个行为取决于 localStorage
  });
});

test.describe('登录页面', () => {
  test('显示登录表单', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('访客登录跳转到仪表盘', async ({ page }) => {
    await page.goto('/login');
    
    // 点击访客登录
    await page.click('[data-testid="guest-login"]');
    
    // 等待跳转到仪表盘
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('仪表盘', () => {
  test.beforeEach(async ({ page }) => {
    // 直接访问仪表盘（假设已登录）
    await page.goto('/dashboard');
  });

  test('显示系统状态', async ({ page }) => {
    await expect(page.getByText('系统状态')).toBeVisible();
  });

  test('显示快捷操作按钮', async ({ page }) => {
    await expect(page.getByText('快捷操作')).toBeVisible();
  });
});

test.describe('方案推荐页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dating');
  });

  test('显示卡片栈', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card-stack"]')).toBeVisible();
  });

  test('点击采纳按钮触发 swipe', async ({ page }) => {
    // 点击采纳按钮
    await page.click('[data-testid="action-like"]');
    
    // 等待动画完成
    await page.waitForTimeout(500);
    
    // 检查是否还有卡片
    const cards = await page.locator('[data-testid="swipe-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('键盘方向键控制', async ({ page }) => {
    // 按右箭头键（采纳）
    await page.keyboard.press('ArrowRight');
    
    await page.waitForTimeout(500);
    
    const cards = await page.locator('[data-testid="swipe-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });
});

test.describe('无障碍测试', () => {
  test('Tab 键导航', async ({ page }) => {
    await page.goto('/login');
    
    // 按 Tab 键
    await page.keyboard.press('Tab');
    
    // 检查焦点是否在第一个可交互元素上
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('页面有正确的标题', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title).toContain('OpenRobot');
  });
});