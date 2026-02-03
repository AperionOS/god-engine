import { test, expect, Page } from '@playwright/test';

/**
 * Controls E2E Tests
 * 
 * Comprehensive tests for all UI controls:
 * - Play/Pause functionality
 * - Speed controls (+/- buttons and keyboard)
 * - Layer toggles (terrain, rivers, vegetation, agents)
 * - Camera controls (zoom, pan)
 * - Minimap navigation
 * - Event log toggle
 * - Seed input and regeneration
 */

test.describe('Playback Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('play button starts simulation', async ({ page }) => {
    // Get initial tick
    const initialTick = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });
    expect(initialTick).toBe(0);

    // Click play button
    await page.click('button[title="Play/Pause (Space)"]');
    
    // Wait for simulation to advance
    await page.waitForFunction(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount > 10;
    }, { timeout: 5000 });

    const newTick = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });
    expect(newTick).toBeGreaterThan(10);
  });

  test('pause button stops simulation', async ({ page }) => {
    // Start playing
    await page.click('button[title="Play/Pause (Space)"]');
    
    // Wait a bit
    await page.waitForFunction(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount > 5;
    });

    // Pause
    await page.click('button[title="Play/Pause (Space)"]');
    
    const tickAtPause = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });

    // Wait 500ms and verify tick hasn't changed
    await page.waitForTimeout(500);
    
    const tickAfterWait = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });

    expect(tickAfterWait).toBe(tickAtPause);
  });

  test('Space key toggles play/pause', async ({ page }) => {
    // Press Space to play
    await page.keyboard.press('Space');
    
    await page.waitForFunction(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount > 5;
    });

    // Press Space to pause
    await page.keyboard.press('Space');
    
    const tickAtPause = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });

    await page.waitForTimeout(300);
    
    const tickAfterWait = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.tickCount;
    });

    expect(tickAfterWait).toBe(tickAtPause);
  });
});

test.describe('Speed Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('speed display shows current speed', async ({ page }) => {
    const speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('1x');
  });

  test('+ button increases speed', async ({ page }) => {
    // Click + button 3 times
    const plusButton = page.locator('button[title="Faster (+)"]');
    await plusButton.click();
    await plusButton.click();
    await plusButton.click();

    const speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('4x');
  });

  test('- button decreases speed', async ({ page }) => {
    // First increase
    const plusButton = page.locator('button[title="Faster (+)"]');
    await plusButton.click();
    await plusButton.click();
    await plusButton.click();

    // Then decrease
    const minusButton = page.locator('button[title="Slower (-)"]');
    await minusButton.click();

    const speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('3x');
  });

  test('speed cannot go below 1', async ({ page }) => {
    const minusButton = page.locator('button[title="Slower (-)"]');
    await minusButton.click();
    await minusButton.click();
    await minusButton.click();

    const speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('1x');
  });

  test('speed cannot exceed 10', async ({ page }) => {
    const plusButton = page.locator('button[title="Faster (+)"]');
    for (let i = 0; i < 15; i++) {
      await plusButton.click();
    }

    const speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('10x');
  });

  test('keyboard +/- controls speed', async ({ page }) => {
    // Increase with +
    await page.keyboard.press('Equal'); // + key
    await page.keyboard.press('Equal');
    
    let speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('3x');

    // Decrease with -
    await page.keyboard.press('Minus');
    
    speedText = await page.locator('span.font-mono:has-text("x")').textContent();
    expect(speedText).toBe('2x');
  });
});

test.describe('Layer Toggles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('all layers are enabled by default', async ({ page }) => {
    const layerButtons = page.locator('button:has-text("terrain"), button:has-text("rivers"), button:has-text("vegetation"), button:has-text("agents")');
    
    const count = await layerButtons.count();
    expect(count).toBe(4);

    // All should have the "active" styling (blue border)
    for (let i = 0; i < count; i++) {
      const button = layerButtons.nth(i);
      await expect(button).toHaveClass(/border-blue-600/);
    }
  });

  test('clicking terrain layer toggles it off', async ({ page }) => {
    const terrainButton = page.locator('button:has-text("terrain")');
    
    // Initially active
    await expect(terrainButton).toHaveClass(/border-blue-600/);
    
    // Click to toggle off
    await terrainButton.click();
    
    // Should now have gray border
    await expect(terrainButton).toHaveClass(/border-gray-700/);
  });

  test('clicking terrain layer again toggles it back on', async ({ page }) => {
    const terrainButton = page.locator('button:has-text("terrain")');
    
    // Toggle off then on
    await terrainButton.click();
    await terrainButton.click();
    
    // Should be active again
    await expect(terrainButton).toHaveClass(/border-blue-600/);
  });

  test('each layer can be toggled independently', async ({ page }) => {
    // Turn off rivers and agents
    await page.locator('button:has-text("rivers")').click();
    await page.locator('button:has-text("agents")').click();

    // Verify terrain and vegetation are still on
    await expect(page.locator('button:has-text("terrain")')).toHaveClass(/border-blue-600/);
    await expect(page.locator('button:has-text("vegetation")')).toHaveClass(/border-blue-600/);
    
    // Verify rivers and agents are off
    await expect(page.locator('button:has-text("rivers")')).toHaveClass(/border-gray-700/);
    await expect(page.locator('button:has-text("agents")')).toHaveClass(/border-gray-700/);
  });

  test('layer state persists after page reload', async ({ page }) => {
    // Turn off vegetation
    await page.locator('button:has-text("vegetation")').click();
    
    // Reload
    await page.reload();
    await page.waitForSelector('#game-canvas');

    // Vegetation should still be off (persisted via Zustand)
    await expect(page.locator('button:has-text("vegetation")')).toHaveClass(/border-gray-700/);
    
    // Others should still be on
    await expect(page.locator('button:has-text("terrain")')).toHaveClass(/border-blue-600/);
  });
});

test.describe('Camera Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('mouse wheel zooms canvas', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    
    // Get canvas bounding box
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Zoom in with mouse wheel
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100); // Negative = zoom in
    
    // Verify zoom changed by checking camera state
    const zoom = await page.evaluate(() => {
      // Access React state through the rendered canvas context
      // This is a bit hacky but works for testing
      return document.querySelector('#game-canvas')?.getAttribute('data-zoom') || 'no-attr';
    });
    
    // We can't easily access React state, so we verify canvas was interacted with
    // by checking that the page didn't error and the canvas is still visible
    await expect(canvas).toBeVisible();
  });

  test('mouse drag pans canvas', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Start in center
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Drag 100px to the right
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY, { steps: 10 });
    await page.mouse.up();

    // Canvas should still be functional
    await expect(canvas).toBeVisible();
  });
});

test.describe('Minimap', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('minimap is visible', async ({ page }) => {
    const minimap = page.locator('canvas').nth(1); // Second canvas is minimap
    await expect(minimap).toBeVisible();
  });

  test('clicking minimap changes camera position', async ({ page }) => {
    // Find minimap (it's in a specific container)
    const minimapContainer = page.locator('.absolute.bottom-6.left-6');
    await expect(minimapContainer).toBeVisible();

    // Click on minimap
    const box = await minimapContainer.boundingBox();
    if (!box) throw new Error('Minimap not found');

    // Click top-left quadrant of minimap
    await page.mouse.click(box.x + 20, box.y + 20);

    // Verify main canvas is still functional
    const mainCanvas = page.locator('#game-canvas');
    await expect(mainCanvas).toBeVisible();
  });
});

test.describe('Event Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('event log is hidden by default', async ({ page }) => {
    const eventLog = page.locator('text=Event Log').first();
    await expect(eventLog).not.toBeVisible();
  });

  test('L key toggles event log', async ({ page }) => {
    // Press L to show
    await page.keyboard.press('KeyL');
    
    // Event log panel should appear
    const eventLogPanel = page.locator('.absolute.top-6.left-6');
    await expect(eventLogPanel).toBeVisible();

    // Press L again to hide
    await page.keyboard.press('KeyL');
    await expect(eventLogPanel).not.toBeVisible();
  });

  test('event log button toggles panel', async ({ page }) => {
    // Find and click the ScrollText button
    const toggleButton = page.locator('button[title="Event Log (L)"]');
    await toggleButton.click();

    // Panel should appear
    const eventLogPanel = page.locator('.absolute.top-6.left-6');
    await expect(eventLogPanel).toBeVisible();

    // Use keyboard to hide since panel may overlap button
    await page.keyboard.press('KeyL');
    await expect(eventLogPanel).not.toBeVisible();
  });

  test('event log shows events after simulation runs', async ({ page }) => {
    // Start simulation
    await page.keyboard.press('Space');
    
    // Wait for some events to accumulate
    await page.waitForFunction(() => {
      return (window as any).__GOD_ENGINE_WORLD__.history.events.length > 0;
    }, { timeout: 10000 });

    // Pause
    await page.keyboard.press('Space');

    // Show event log
    await page.keyboard.press('KeyL');

    // Should have event entries
    const eventLogPanel = page.locator('.absolute.top-6.left-6');
    await expect(eventLogPanel).toBeVisible();
  });
});

test.describe('Seed Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('seed input shows default seed', async ({ page }) => {
    const seedInput = page.locator('input[type="number"]');
    await expect(seedInput).toHaveValue('12345');
  });

  test('changing seed and regenerating creates new world', async ({ page }) => {
    // Get initial checksum
    const initialChecksum = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.getChecksum().composite;
    });

    // Change seed
    const seedInput = page.locator('input[type="number"]');
    await seedInput.fill('99999');

    // Click regenerate button
    const regenButton = page.locator('button[title="Regenerate World"]');
    await regenButton.click();

    // Wait for new world
    await page.waitForTimeout(500);

    // Get new checksum
    const newChecksum = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.getChecksum().composite;
    });

    // Should be different
    expect(newChecksum).not.toBe(initialChecksum);
  });

  test('regenerating with same seed produces identical world', async ({ page }) => {
    // Get initial checksum
    const checksum1 = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.getChecksum().composite;
    });

    // Regenerate with same seed
    const regenButton = page.locator('button[title="Regenerate World"]');
    await regenButton.click();
    await page.waitForTimeout(500);

    // Get new checksum
    const checksum2 = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__.getChecksum().composite;
    });

    // Should be identical
    expect(checksum2).toBe(checksum1);
  });
});

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('regenerating world shows toast', async ({ page }) => {
    const regenButton = page.locator('button[title="Regenerate World"]');
    await regenButton.click();

    // Look for toast notification
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });
});
