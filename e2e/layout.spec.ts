import { test, expect } from '@playwright/test';

/**
 * UI Layout E2E Tests
 * 
 * Tests that verify:
 * - Canvas fills the viewport
 * - UI elements are positioned at screen edges, not center
 * - Elements don't overlap each other
 * - Responsive behavior
 */

test.describe('Layout - Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('canvas fills the viewport', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    
    if (box && viewport) {
      // Canvas should be at least 90% of viewport size
      expect(box.width).toBeGreaterThanOrEqual(viewport.width * 0.9);
      expect(box.height).toBeGreaterThanOrEqual(viewport.height * 0.9);
    }
  });

  test('canvas starts at origin (0,0)', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    
    expect(box).toBeTruthy();
    if (box) {
      // Canvas should start near top-left (allowing for small offsets)
      expect(box.x).toBeLessThan(50);
      expect(box.y).toBeLessThan(50);
    }
  });
});

test.describe('Layout - Control Positions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('control bar is at bottom center', async ({ page }) => {
    // Find control bar by its distinct buttons
    const playButton = page.locator('button').filter({ has: page.locator('svg.lucide-play, svg.lucide-pause') }).first();
    const box = await playButton.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    
    if (box && viewport) {
      // Should be in bottom third of screen
      expect(box.y).toBeGreaterThan(viewport.height * 0.6);
      
      // Should be roughly centered horizontally (within 200px of center)
      const centerX = viewport.width / 2;
      expect(Math.abs(box.x + box.width / 2 - centerX)).toBeLessThan(200);
    }
  });

  test('sidebar is on the right edge', async ({ page }) => {
    // Look for sidebar by finding seed input or stats
    const sidebar = page.locator('input[type="number"]').first();
    const box = await sidebar.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    
    if (box && viewport) {
      // Sidebar should be in right 400px of screen
      expect(box.x).toBeGreaterThan(viewport.width - 400);
    }
  });

  test('camera controls are on the left edge', async ({ page }) => {
    // Find zoom buttons
    const zoomIn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    const box = await zoomIn.boundingBox();
    
    expect(box).toBeTruthy();
    if (box) {
      // Should be within 100px of left edge
      expect(box.x).toBeLessThan(100);
    }
  });

  test('minimap is in bottom-left corner', async ({ page }) => {
    // Minimap has a distinct small canvas
    const canvases = page.locator('canvas');
    const count = await canvases.count();
    
    // Should have at least 2 canvases (main + minimap)
    expect(count).toBeGreaterThanOrEqual(2);
    
    // Get the smaller canvas (minimap)
    let minimapBox = null;
    for (let i = 0; i < count; i++) {
      const box = await canvases.nth(i).boundingBox();
      if (box && box.width < 200) {
        minimapBox = box;
        break;
      }
    }
    
    const viewport = page.viewportSize();
    
    if (minimapBox && viewport) {
      // Should be in bottom-left quadrant
      expect(minimapBox.x).toBeLessThan(200);
      expect(minimapBox.y).toBeGreaterThan(viewport.height * 0.5);
    }
  });

  test('camera controls and minimap do not overlap', async ({ page }) => {
    // Get camera controls bounding box
    const zoomIn = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first();
    const cameraBox = await zoomIn.boundingBox();
    
    // Get minimap bounding box
    const canvases = page.locator('canvas');
    const count = await canvases.count();
    let minimapBox = null;
    for (let i = 0; i < count; i++) {
      const box = await canvases.nth(i).boundingBox();
      if (box && box.width < 200) {
        minimapBox = box;
        break;
      }
    }
    
    if (cameraBox && minimapBox) {
      // Check for no overlap
      const cameraBottom = cameraBox.y + cameraBox.height;
      const minimapTop = minimapBox.y;
      
      // Camera controls should end before minimap starts (with some margin)
      expect(cameraBottom).toBeLessThan(minimapTop + 20);
    }
  });
});

test.describe('Layout - No Centering Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('UI elements are NOT clustered in center', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) return;

    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    
    // Define center zone (middle 400x400 of screen)
    const centerZone = {
      left: centerX - 200,
      right: centerX + 200,
      top: centerY - 200,
      bottom: centerY + 200,
    };

    // Collect positions of key UI elements
    const elements = [
      page.locator('button').filter({ has: page.locator('svg.lucide-zoom-in') }).first(),
      page.locator('input[type="number"]').first(),
    ];

    let elementsInCenter = 0;
    
    for (const el of elements) {
      const box = await el.boundingBox();
      if (box) {
        const elCenterX = box.x + box.width / 2;
        const elCenterY = box.y + box.height / 2;
        
        const isInCenter = 
          elCenterX > centerZone.left && 
          elCenterX < centerZone.right &&
          elCenterY > centerZone.top && 
          elCenterY < centerZone.bottom;
        
        if (isInCenter) elementsInCenter++;
      }
    }

    // No more than 1 UI element should be in the center zone
    // (control bar is intentionally centered at bottom, but not in vertical center)
    expect(elementsInCenter).toBeLessThanOrEqual(1);
  });
});
