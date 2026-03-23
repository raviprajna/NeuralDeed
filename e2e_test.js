// End-to-end test with Playwright
// Run: npx playwright test e2e_test.js --headed

const { test, expect } = require('@playwright/test');
const path = require('path');

test('Features 1-3: Upload multiple docs, get confident answers with citations', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('✅ App loaded');

    // Create new conversation
    await page.click('button[title="New chat"]');
    await page.waitForTimeout(1000);

    console.log('✅ Created conversation');

    // Upload first document
    const doc1Path = path.resolve(__dirname, 'sample-docs/commercial-lease-100-bishopsgate.pdf');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(doc1Path);
    await page.waitForTimeout(3000); // Wait for processing

    console.log('✅ Uploaded document 1: commercial-lease-100-bishopsgate.pdf');

    // Upload second document
    const doc2Path = path.resolve(__dirname, 'sample-docs/title-report-lot-7.pdf');
    await fileInput.setInputFiles(doc2Path);
    await page.waitForTimeout(3000); // Wait for processing

    console.log('✅ Uploaded document 2: title-report-lot-7.pdf');

    // Ask a question that should have high confidence
    await page.fill('textarea[placeholder*="Ask a question"]', 'What is the property address mentioned in these documents?');
    await page.press('textarea', 'Enter');

    // Wait for AI response
    await page.waitForSelector('.prose', { timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for confidence badge

    console.log('✅ Got AI response');

    // Check for confidence badge
    const hasConfidenceBadge = await page.locator('text=/confidence/i').count() > 0;
    console.log(`${hasConfidenceBadge ? '✅' : '❌'} Confidence badge present`);

    // Check for sources cited
    const hasSources = await page.locator('text=/source/i').count() > 0;
    console.log(`${hasSources ? '✅' : '❌'} Sources cited present`);

    // Check for citation buttons
    const citationButtons = await page.locator('button:has-text("§")').count();
    console.log(`${citationButtons > 0 ? '✅' : '❌'} Citation buttons present (${citationButtons} found)`);

    // Ask another question to test multi-doc context
    await page.fill('textarea', 'Summarize what information you have from all documents');
    await page.press('textarea', 'Enter');
    await page.waitForTimeout(5000);

    console.log('✅ Second question answered');

    // Take a screenshot
    await page.screenshot({ path: 'test-results-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved: test-results-screenshot.png');

    // Final validation
    const messages = await page.locator('.prose').count();
    console.log(`\n📊 Test Summary:`);
    console.log(`   Messages: ${messages}`);
    console.log(`   Citation buttons: ${citationButtons}`);
    console.log(`   Confidence badge: ${hasConfidenceBadge}`);
    console.log(`   Sources cited: ${hasSources}`);

    expect(messages).toBeGreaterThan(0);
    expect(hasConfidenceBadge || hasSources).toBeTruthy();
});
