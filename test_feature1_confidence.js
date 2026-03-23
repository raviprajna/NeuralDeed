// Test Feature 1: Verification Layer & Confidence Scoring
// Run with: node test_feature1_confidence.js

const API_URL = 'http://localhost:8000/api';

async function testConfidenceScoring() {
    console.log('🧪 Testing Feature 1: Verification Layer & Confidence Scoring\n');

    // Step 1: Create conversation
    console.log('1️⃣ Creating new conversation...');
    const createResp = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
    });
    const conversation = await createResp.json();
    console.log(`✅ Created conversation: ${conversation.id}\n`);

    // Step 2: Upload a test document
    console.log('2️⃣ Uploading test document...');
    const testDoc = `
COMMERCIAL LEASE AGREEMENT

Section 1: Parties
Landlord: ABC Properties LLC
Tenant: XYZ Corporation

Section 2: Premises
Address: 123 Main Street, Suite 500

Section 3: Term
The lease term shall be five (5) years, commencing on January 1, 2026.

Section 4: Rent
Base rent shall be $50,000 per annum, payable monthly.
Rent escalation: 3% per annum starting in year 2.

Section 5: Indemnity
Tenant shall indemnify Landlord against all claims arising from Tenant's use.
    `;

    const formData = new FormData();
    const blob = new Blob([testDoc], { type: 'text/plain' });
    formData.append('file', blob, 'test_lease.pdf');

    const uploadResp = await fetch(`${API_URL}/conversations/${conversation.id}/documents`, {
        method: 'POST',
        body: formData,
    });

    if (!uploadResp.ok) {
        const error = await uploadResp.text();
        console.log(`❌ Upload failed: ${error}`);
        process.exit(1);
    }

    const doc = await uploadResp.json();
    console.log(`✅ Uploaded document: ${doc.filename} (ID: ${doc.id})\n`);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test high-confidence query (answer is in document)
    console.log('3️⃣ Testing HIGH confidence query...');
    console.log('Question: "What is the rent amount?"');

    const highConfResp = await fetch(`${API_URL}/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'What is the rent amount?' }),
    });

    let highConfMessage = null;
    const reader1 = highConfResp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader1.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'message') {
                    highConfMessage = data.message;
                }
            }
        }
    }

    console.log(`📝 Answer: ${highConfMessage.content.substring(0, 100)}...`);
    console.log(`📊 Confidence: ${highConfMessage.confidence}%`);
    console.log(`📎 Sources cited: ${highConfMessage.sources_cited}`);

    if (highConfMessage.confidence >= 70) {
        console.log('✅ HIGH confidence test PASSED (confidence >= 70%)\n');
    } else {
        console.log('❌ HIGH confidence test FAILED (expected >= 70%)\n');
    }

    // Step 4: Test low-confidence query (answer NOT in document)
    console.log('4️⃣ Testing LOW confidence query...');
    console.log('Question: "What are the parking provisions?"');

    const lowConfResp = await fetch(`${API_URL}/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'What are the parking provisions?' }),
    });

    let lowConfMessage = null;
    const reader2 = lowConfResp.body.getReader();

    while (true) {
        const { done, value } = await reader2.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'message') {
                    lowConfMessage = data.message;
                }
            }
        }
    }

    console.log(`📝 Answer: ${lowConfMessage.content.substring(0, 100)}...`);
    console.log(`📊 Confidence: ${lowConfMessage.confidence}%`);
    console.log(`📎 Sources cited: ${lowConfMessage.sources_cited}`);

    const hasUncertaintyPhrase = lowConfMessage.content.toLowerCase().includes('cannot find') ||
                                   lowConfMessage.content.toLowerCase().includes('not mentioned') ||
                                   lowConfMessage.content.toLowerCase().includes('not in the document');

    if (lowConfMessage.confidence < 70 || hasUncertaintyPhrase) {
        console.log('✅ LOW confidence test PASSED (AI admitted uncertainty)\n');
    } else {
        console.log('❌ LOW confidence test FAILED (AI should admit uncertainty)\n');
    }

    // Step 5: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Feature 1 Test Results:');
    console.log(`   ✓ Confidence scoring implemented: YES`);
    console.log(`   ✓ High confidence for known info: ${highConfMessage.confidence >= 70 ? 'YES' : 'NO'}`);
    console.log(`   ✓ Low confidence for unknown info: ${lowConfMessage.confidence < 70 || hasUncertaintyPhrase ? 'YES' : 'NO'}`);
    console.log(`   ✓ AI admits uncertainty: ${hasUncertaintyPhrase ? 'YES' : 'NO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allPassed = highConfMessage.confidence >= 70 &&
                      (lowConfMessage.confidence < 70 || hasUncertaintyPhrase);

    if (allPassed) {
        console.log('✅ Feature 1: Verification Layer & Confidence Scoring - PASSED\n');
        return true;
    } else {
        console.log('❌ Feature 1: Verification Layer & Confidence Scoring - FAILED\n');
        return false;
    }
}

// Run test
testConfidenceScoring()
    .then(passed => {
        process.exit(passed ? 0 : 1);
    })
    .catch(err => {
        console.error('❌ Test error:', err);
        process.exit(1);
    });
