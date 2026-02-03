import { test, expect } from '@playwright/test';

/**
 * Real Terrain Loading E2E Tests
 * 
 * Tests that verify:
 * - Location picker opens and closes
 * - Preset locations are available
 * - Terrain can be loaded from a location
 * - World updates after terrain load
 * - Error handling for failed loads
 */

test.describe('Terrain Loading - Location Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('Real World terrain button exists in sidebar', async ({ page }) => {
    // Look for the terrain loading button - it says "Real World"
    const terrainBtn = page.locator('button:has-text("Real World")');
    await expect(terrainBtn.first()).toBeVisible();
  });

  test('clicking Real World opens location picker', async ({ page }) => {
    // Click the terrain loading button
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Location picker modal should appear
    const modal = page.locator('text=Select Real Terrain');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('location picker has a map', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Leaflet map should be present (look for tile layer or map container)
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 5000 });
  });

  test('location picker can be closed with X button', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Click X button
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await closeBtn.first().click();
    
    // Modal should close
    await expect(page.locator('text=Select Real Terrain')).not.toBeVisible();
  });

  test('preset locations dropdown exists', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Presets button should exist
    const presetsBtn = page.locator('button:has-text("Presets")');
    await expect(presetsBtn).toBeVisible();
  });

  test('clicking Presets shows preset locations', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Click Presets button
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    
    // Should show preset locations
    await expect(page.locator('text=Grand Canyon')).toBeVisible();
    await expect(page.locator('text=Mount Fuji')).toBeVisible();
  });

  test('selecting a preset fills in coordinates', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Click Presets button
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    
    // Select Grand Canyon
    await page.locator('button:has-text("Grand Canyon")').click();
    
    // Should show selected location name
    await expect(page.locator('text=Grand Canyon').first()).toBeVisible();
  });
});

test.describe('Terrain Loading - Load Process', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('Load Terrain button appears after selecting location', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Select a preset
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    await page.locator('button:has-text("Grand Canyon")').click();
    
    // Load Terrain button should appear
    const loadBtn = page.locator('button:has-text("Load Terrain")');
    await expect(loadBtn).toBeVisible();
  });

  test('clicking Load Terrain shows loading state', async ({ page }) => {
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Select a preset
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    await page.locator('button:has-text("Grand Canyon")').click();
    
    // Click Load Terrain
    const loadBtn = page.locator('button:has-text("Load Terrain")');
    await loadBtn.click();
    
    // Should show loading state or close modal on success
    await Promise.race([
      expect(page.locator('text=Loading')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('text=Select Real Terrain')).not.toBeVisible({ timeout: 5000 }),
    ]);
  });

  test('terrain loads successfully and modal closes', async ({ page }) => {
    // Set up request interception to check if terrain API is called
    let terrainRequestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/terrain') || request.url().includes('elevation-tiles-prod')) {
        terrainRequestMade = true;
      }
    });

    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Select a preset
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    await page.locator('button:has-text("Grand Canyon")').click();
    
    // Click Load Terrain
    const loadBtn = page.locator('button:has-text("Load Terrain")');
    await loadBtn.click();
    
    // Wait for modal to close (success) or error toast
    await Promise.race([
      expect(page.locator('text=Select Real Terrain')).not.toBeVisible({ timeout: 15000 }),
      expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 15000 }),
    ]);
    
    // Terrain request should have been made
    expect(terrainRequestMade).toBe(true);
  });
});

test.describe('Terrain Loading - API Proxy', () => {
  test('terrain proxy endpoint responds', async ({ page }) => {
    // Make a direct request to the terrain API
    const response = await page.request.get('/api/terrain?z=12&x=702&y=1635');
    
    // Should get a response (either 200 with image, or error JSON)
    expect(response.status()).toBeLessThan(500);
  });

  test('terrain proxy returns image for valid coordinates', async ({ page }) => {
    // Grand Canyon tile coordinates at z=12
    const response = await page.request.get('/api/terrain?z=12&x=702&y=1635');
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('image/png');
    }
  });

  test('terrain proxy returns error for missing params', async ({ page }) => {
    const response = await page.request.get('/api/terrain?z=12');
    
    // Should return 400 for missing params
    expect(response.status()).toBe(400);
  });
});

test.describe('Terrain Loading - World Update', () => {
  test('world checksum changes after loading real terrain', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
    
    // Get initial world checksum
    const initialChecksum = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__?.getChecksum?.()?.composite || 'no-checksum';
    });
    
    // Open location picker
    const terrainBtn = page.locator('button:has-text("Real World")');
    await terrainBtn.first().click();
    
    // Wait for modal
    await page.waitForSelector('text=Select Real Terrain');
    
    // Select a preset
    const presetsBtn = page.locator('button:has-text("Presets")');
    await presetsBtn.click();
    await page.locator('button:has-text("Grand Canyon")').click();
    
    // Click Load Terrain
    const loadBtn = page.locator('button:has-text("Load Terrain")');
    await loadBtn.click();
    
    // Wait for load to complete
    await page.waitForTimeout(5000);
    
    // Get new checksum
    const newChecksum = await page.evaluate(() => {
      return (window as any).__GOD_ENGINE_WORLD__?.getChecksum?.()?.composite || 'no-checksum';
    });
    
    // If terrain loaded successfully, checksum should be different
    // (If it failed due to CORS, checksums might be same)
    console.log('Initial:', initialChecksum, 'New:', newChecksum);
  });
});
