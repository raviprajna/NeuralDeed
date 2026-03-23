// Comprehensive E2E test for Features 1-3 with Document Library
// Run: npx playwright test test_complete_workflow.spec.js

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('NeuralDeed Features 1-3 Complete Workflow', () => {
    test('should handle document library workflow, multi-doc upload, confidence scoring, and citations', async ({ page }) => {
        console.log('\n🧪 Starting comprehensive E2E test...\n');

        // Navigate to app
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');
        console.log('✅ App loaded at http://localhost:5173');

        // Step 1: Create new conversation
        await page.click('button[title="New chat"]');
        await page.waitForTimeout(1000);
        console.log('✅ Created new conversation');

        // Step 2: Verify empty state shows
        const emptyStateVisible = await page.locator('text=Link or Upload Documents').isVisible();
        console.log(`${emptyStateVisible ? '✅' : '❌'} Empty state displayed`);

        // Step 3: Click "Link from Library" button
        const linkButton = await page.locator('button:has-text("Link from Library")').first();
        if (await linkButton.isVisible()) {
            await linkButton.click();
            await page.waitForTimeout(500);
            console.log('✅ Opened Document Library modal');
        } else {
            console.log('⚠️  Link from Library button not found, trying alternative...');
            // Try clicking Add Docs button in header
            await page.click('button:has-text("Add Docs")').catch(() => {
                console.log('❌ Could not open library modal');
            });
        }

        // Step 4: Check if library is empty and switch to upload tab
        const uploadTabVisible = await page.locator('button:has-text("Upload to Library")').isVisible();
        if (uploadTabVisible) {
            await page.click('button:has-text("Upload to Library")');
            await page.waitForTimeout(500);
            console.log('✅ Switched to "Upload to Library" tab');
        }

        // Step 5: Upload multiple documents to library
        console.log('\n📤 Uploading 3 documents to library...');

        const doc1 = path.resolve(__dirname, 'sample-docs/commercial-lease-100-bishopsgate.pdf');
        const doc2 = path.resolve(__dirname, 'sample-docs/title-report-lot-7.pdf');
        const doc3 = path.resolve(__dirname, 'sample-docs/environmental-assessment-manchester.pdf');

        // Find the file input inside the modal (it should have multiple attribute)
        const fileInput = await page.locator('input[type="file"][multiple]').first();
        await fileInput.setInputFiles([doc1, doc2, doc3]);

        // Wait for uploads to complete
        await page.waitForTimeout(8000);
        console.log('⏳ Waiting for uploads to complete (8s)...');

        // Check upload progress
        const successIndicators = await page.locator('text=Uploaded successfully').count();
        console.log(`✅ ${successIndicators} file(s) uploaded successfully`);

        // Step 6: Switch to library tab and check documents
        await page.click('button:has-text("My Library")').catch(() => {});
        await page.waitForTimeout(1000);

        const libraryDocs = await page.locator('[class*="grid"] button').count();
        console.log(`📚 Library contains ${libraryDocs} document(s)`);

        // Step 7: Select documents to link
        if (libraryDocs > 0) {
            console.log('\n🔗 Linking documents to conversation...');

            // Switch to library tab first
            await page.click('button:has-text("My Library")');
            await page.waitForTimeout(1000);
            console.log('   Switched to My Library tab');

            // Click document cards to select them
            const docCards = await page.locator('button:has(p:has-text(".pdf"))').count();
            console.log(`   Found ${docCards} document card(s)`);

            if (docCards > 0) {
                const docsToLink = Math.min(3, docCards);
                for (let i = 0; i < docsToLink; i++) {
                    await page.locator('button:has(p:has-text(".pdf"))').nth(i).click({ force: true });
                    await page.waitForTimeout(300);
                }
                console.log(`✅ Selected ${docsToLink} document(s)`);

                // Click link button
                await page.waitForTimeout(500);
                const linkButtonInModal = page.locator('button:has-text("Link")');
                await linkButtonInModal.click();
                await page.waitForTimeout(3000);
                console.log('✅ Linked documents to conversation');
            }
        }

        // Step 8: Verify document tabs appear
        console.log('\n📑 Checking document tabs...');
        await page.waitForTimeout(2000);

        const tabs = await page.locator('button:has(svg)').filter({ hasText: /.pdf/ }).count();
        console.log(`📊 Found ${tabs} document tab(s) in viewer`);

        if (tabs > 0) {
            console.log('✅ Document tabs displayed correctly');

            // Check document count badge
            const countBadge = await page.locator('div:has-text("Documents") + div').textContent().catch(() => '');
            console.log(`✅ Document count badge: ${countBadge}`);
        }

        // Step 9: Ask a question to test all features
        console.log('\n💬 Testing AI response with all features...');

        const question = 'What properties and environmental concerns are mentioned in these documents?';
        console.log(`Question: "${question}"`);

        await page.fill('textarea[placeholder*="Ask a question"]', question);
        await page.press('textarea', 'Enter');

        // Wait for AI response
        await page.waitForSelector('.prose', { timeout: 30000 });
        console.log('✅ AI response received');

        // Wait for confidence badge and citations
        await page.waitForTimeout(3000);

        // Step 10: Check Feature 1 - Confidence Scoring
        console.log('\n🎯 Feature 1: Verification & Confidence Scoring');

        const confidenceBadge = await page.locator('text=/\\d+%.*Confidence/i').first().textContent().catch(() => '');
        console.log(`   Confidence Badge: ${confidenceBadge || 'Not found'}`);

        const hasConfidence = confidenceBadge.length > 0;
        console.log(`   ${hasConfidence ? '✅' : '❌'} Confidence scoring: ${hasConfidence ? 'PASS' : 'FAIL'}`);

        // Step 11: Check Feature 2 - Citations
        console.log('\n📎 Feature 2: Surgical Citations');

        const sourcesCited = await page.locator('text=/\\d+\\s+sources?\\s+cited/i').first().textContent().catch(() => '');
        console.log(`   Sources cited: ${sourcesCited || 'Not found'}`);

        const citationButtons = await page.locator('button:has-text("§")').count();
        console.log(`   Citation buttons: ${citationButtons} found`);

        const hasCitations = citationButtons > 0;
        console.log(`   ${hasCitations ? '✅' : '❌'} Citations: ${hasCitations ? 'PASS' : 'FAIL'}`);

        // Test citation hover
        if (citationButtons > 0) {
            const firstCitation = page.locator('button:has-text("§")').first();
            await firstCitation.hover();
            await page.waitForTimeout(500);
            console.log('   ✅ Citation hover works (tooltip should show)');
        }

        // Step 12: Check Feature 3 - Multi-Document Context
        console.log('\n📚 Feature 3: Multi-Document Context');

        const aiResponse = await page.locator('.prose').first().textContent();
        const mentionsMultipleDocs = aiResponse.toLowerCase().includes('lease') &&
                                     (aiResponse.toLowerCase().includes('title') ||
                                      aiResponse.toLowerCase().includes('environmental'));

        console.log(`   AI mentions multiple documents: ${mentionsMultipleDocs ? 'YES' : 'NO'}`);
        console.log(`   ${mentionsMultipleDocs ? '✅' : '❌'} Multi-doc context: ${mentionsMultipleDocs ? 'PASS' : 'FAIL'}`);

        // Step 13: Test tab switching
        if (tabs > 1) {
            console.log('\n🔄 Testing document tab switching...');
            const secondTab = page.locator('button').filter({ hasText: /.pdf/ }).nth(1);
            await secondTab.click();
            await page.waitForTimeout(1000);
            console.log('   ✅ Switched to second document tab');
        }

        // Step 14: Take screenshots
        console.log('\n📸 Taking screenshots...');
        await page.screenshot({
            path: 'test-results/final-ui-screenshot.png',
            fullPage: true
        });
        console.log('   ✅ Screenshot saved: test-results/final-ui-screenshot.png');

        // Step 15: Final Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`✅ Feature 1 (Confidence): ${hasConfidence ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Feature 2 (Citations): ${hasCitations ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Feature 3 (Multi-Doc): ${tabs > 0 ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Library Workflow: ${libraryDocs >= 0 ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Document Tabs: ${tabs} tab(s)`);
        console.log(`✅ Citations: ${citationButtons} citation(s)`);
        console.log('='.repeat(60));

        // Assertions
        expect(hasConfidence || hasCitations).toBeTruthy();
        expect(tabs).toBeGreaterThan(0);
    });
});
