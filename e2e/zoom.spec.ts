import { test, expect } from '@playwright/test';

/**
 * Zoom E2E Tests
 * 
 * Tests that verify:
 * - Zoom buttons actually change the zoom level
 * - Mouse wheel zoom works
 * - Zoom affects canvas rendering (not just state)
 * - Zoom limits are respected
 */

test.describe('Zoom Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
    // Wait for initial render
    await page.waitForTimeout(500);
  });

  test('zoom display shows 100% initially', async ({ page }) => {
    // Find zoom percentage display
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const text = await zoomDisplay.textContent();
    expect(text).toBe('100%');
  });

  test('zoom in button increases zoom percentage', async ({ page }) => {
    // Click zoom in button
    const zoomInBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    await zoomInBtn.click();
    
    // Wait for state update
    await page.waitForTimeout(100);
    
    // Check zoom display increased
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const text = await zoomDisplay.textContent();
    const zoomValue = parseInt(text?.replace('%', '') || '100');
    
    expect(zoomValue).toBeGreaterThan(100);
  });

  test('zoom out button decreases zoom percentage', async ({ page }) => {
    // First zoom in so we can zoom out
    const zoomInBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(100);

    // Now zoom out
    const zoomOutBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-out') }).first();
    await zoomOutBtn.click();
    await page.waitForTimeout(100);

    // Check zoom display
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const text = await zoomDisplay.textContent();
    const zoomValue = parseInt(text?.replace('%', '') || '100');
    
    // Should be between 100% and 200% (one zoom in remaining)
    expect(zoomValue).toBeGreaterThan(100);
    expect(zoomValue).toBeLessThan(200);
  });

  test('zoom in button respects maximum zoom', async ({ page }) => {
    const zoomInBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    
    // Click until button becomes disabled
    for (let i = 0; i < 20; i++) {
      const isDisabled = await zoomInBtn.isDisabled();
      if (isDisabled) break;
      await zoomInBtn.click();
    }
    await page.waitForTimeout(100);

    // Check that button is now disabled at max
    const isDisabled = await zoomInBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('zoom out button respects minimum zoom', async ({ page }) => {
    const zoomOutBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-out') }).first();
    
    // Click until button becomes disabled
    for (let i = 0; i < 20; i++) {
      const isDisabled = await zoomOutBtn.isDisabled();
      if (isDisabled) break;
      await zoomOutBtn.click();
    }
    await page.waitForTimeout(100);

    // Check that button is now disabled at min
    const isDisabled = await zoomOutBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('reset button returns to 100% zoom', async ({ page }) => {
    // Zoom in first
    const zoomInBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(100);

    // Click reset (Maximize2 icon)
    const resetBtn = page.locator('button').filter({ has: page.locator('svg.lucide-maximize-2') }).first();
    await resetBtn.click();
    await page.waitForTimeout(100);

    // Should be back to 100%
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const text = await zoomDisplay.textContent();
    expect(text).toBe('100%');
  });
});

test.describe('Mouse Wheel Zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
    await page.waitForTimeout(500);
  });

  test('mouse wheel up zooms in', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Get initial zoom
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const initialText = await zoomDisplay.textContent();
    const initialZoom = parseInt(initialText?.replace('%', '') || '100');

    // Scroll up (zoom in)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(200);

    // Check zoom increased
    const newText = await zoomDisplay.textContent();
    const newZoom = parseInt(newText?.replace('%', '') || '100');
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('mouse wheel down zooms out', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // First zoom in so we can zoom out
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(200);

    // Get zoom after zooming in
    const zoomDisplay = page.locator('text=/\\d+%/').first();
    const afterZoomInText = await zoomDisplay.textContent();
    const afterZoomIn = parseInt(afterZoomInText?.replace('%', '') || '100');

    // Scroll down (zoom out)
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(200);

    // Check zoom decreased
    const newText = await zoomDisplay.textContent();
    const newZoom = parseInt(newText?.replace('%', '') || '100');
    expect(newZoom).toBeLessThan(afterZoomIn);
  });
});

test.describe('Zoom Visual Effect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
    await page.waitForTimeout(500);
  });

  test('zooming in changes canvas content', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    
    // Take screenshot before zoom
    const beforeScreenshot = await canvas.screenshot();
    
    // Zoom in significantly
    const zoomInBtn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    for (let i = 0; i < 5; i++) {
      await zoomInBtn.click();
    }
    await page.waitForTimeout(300);
    
    // Take screenshot after zoom
    const afterScreenshot = await canvas.screenshot();
    
    // Screenshots should be different (zoom changed the view)
    expect(Buffer.compare(beforeScreenshot, afterScreenshot)).not.toBe(0);
  });
});
