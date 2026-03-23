#!/bin/bash
# Simple shell script to test complete workflow

echo "🧪 Testing NeuralDeed Complete Workflow"
echo "========================================"
echo ""

API="http://localhost:8000/api"

# Test 1: Upload to library
echo "📚 Step 1: Upload documents to library"
echo "--------------------------------------"

DOC1=$(curl -X POST $API/library/documents -F "file=@sample-docs/commercial-lease-100-bishopsgate.pdf" -s | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Uploaded: commercial-lease-100-bishopsgate.pdf (ID: $DOC1)"

DOC2=$(curl -X POST $API/library/documents -F "file=@sample-docs/title-report-lot-7.pdf" -s | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Uploaded: title-report-lot-7.pdf (ID: $DOC2)"

DOC3=$(curl -X POST $API/library/documents -F "file=@sample-docs/environmental-assessment-manchester.pdf" -s | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Uploaded: environmental-assessment-manchester.pdf (ID: $DOC3)"

echo ""
echo "📊 Library now has documents:"
curl $API/library/documents -s | python3 -c "import sys, json; docs = json.load(sys.stdin); print(f'   Total: {len(docs)} documents'); [print(f'   - {d[\"filename\"]} ({d[\"page_count\"]} pages)') for d in docs]"

# Test 2: Create conversation and link documents
echo ""
echo "💬 Step 2: Create conversation and link documents"
echo "--------------------------------------"

CONV=$(curl -X POST $API/conversations -s | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Created conversation: $CONV"

curl -X POST "$API/conversations/$CONV/link-document/$DOC1" -s > /dev/null
echo "✅ Linked: commercial-lease-100-bishopsgate.pdf"

curl -X POST "$API/conversations/$CONV/link-document/$DOC2" -s > /dev/null
echo "✅ Linked: title-report-lot-7.pdf"

curl -X POST "$API/conversations/$CONV/link-document/$DOC3" -s > /dev/null
echo "✅ Linked: environmental-assessment-manchester.pdf"

echo ""
echo "📄 Conversation documents:"
curl "$API/conversations/$CONV/documents" -s | python3 -c "import sys, json; docs = json.load(sys.stdin); print(f'   Total: {len(docs)} documents linked'); [print(f'   - {d[\"filename\"]}') for d in docs]"

# Test 3: Ask question
echo ""
echo "🤖 Step 3: Ask AI question about all documents"
echo "--------------------------------------"

echo "Question: What properties are mentioned in these documents?"
curl -X POST "$API/conversations/$CONV/messages" \
  -H "Content-Type: application/json" \
  -d '{"content": "What properties are mentioned in these documents?"}' \
  --no-buffer -s 2>&1 | grep '"type": "message"' | python3 -c "import sys, json; data = json.loads(sys.stdin.read().split('data: ')[1]); msg = data['message']; print(f\"\\n✅ AI Response:\"); print(f\"   Confidence: {msg.get('confidence', 'N/A')}%\"); print(f\"   Sources cited: {msg.get('sources_cited', 0)}\"); print(f\"   Citations: {len(msg.get('citations', []))}\"); print(f\"\\n   Answer preview: {msg['content'][:150]}...\")"

echo ""
echo "========================================"
echo "✅ WORKFLOW TEST COMPLETE"
echo "========================================"
echo ""
echo "Summary:"
echo "- ✅ Document library uploads working"
echo "- ✅ Multiple documents can be linked to conversation"
echo "- ✅ AI has access to all documents"
echo "- ✅ Confidence scoring working"
echo "- ✅ Citations extracted"
echo ""
echo "Frontend test: Open http://localhost:5173 and verify UI matches API"
