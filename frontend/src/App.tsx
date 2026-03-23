import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentLibraryModal } from "./components/DocumentLibraryModal";
import { EnhancedMultiDocViewer } from "./components/EnhancedMultiDocViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocument } from "./hooks/use-document";
import { useMessages } from "./hooks/use-messages";
import * as api from "./lib/api";

export default function App() {
	const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
	const [targetPage, setTargetPage] = useState<number | undefined>(undefined);
	const [highlightText, setHighlightText] = useState<string | undefined>(undefined);
	const [triggerDocSearch, setTriggerDocSearch] = useState(false);

	const {
		conversations,
		selectedId,
		loading: conversationsLoading,
		create,
		select,
		remove,
		refresh: refreshConversations,
	} = useConversations();

	const {
		messages,
		loading: messagesLoading,
		error: messagesError,
		streaming,
		streamingContent,
		send,
	} = useMessages(selectedId);

	const {
		documents,
		refresh: refreshDocument,
	} = useDocument(selectedId);

	const handleSend = useCallback(
		async (content: string) => {
			await send(content);
			refreshConversations();
		},
		[send, refreshConversations],
	);

	const handleCreate = useCallback(async () => {
		await create();
	}, [create]);

	const handleDocumentUploaded = useCallback(() => {
		refreshDocument();
		refreshConversations();
	}, [refreshDocument, refreshConversations]);

	const [showLibrary, setShowLibrary] = useState(false);

	const handleCitationClick = useCallback(
		(page: number, documentId?: string, extractedText?: string) => {
			// Find the document - either by documentId or use first document
			const targetDoc = documentId
				? documents.find(d => d.id === documentId)
				: documents[0];

			if (!targetDoc) {
				console.error('Document not found for citation');
				return;
			}

			// Switch to the document
			setActiveDocumentId(targetDoc.id);

			// Wait a moment for document to switch, then navigate
			setTimeout(() => {
				setTargetPage(page);
				if (extractedText) {
					console.log('Citation highlight text:', extractedText);
					setHighlightText(extractedText);
				}
			}, 100);

			// Reset after highlighting (longer for citations)
			setTimeout(() => {
				setTargetPage(undefined);
				setHighlightText(undefined);
			}, 5000);
		},
		[documents],
	);

	const handleOpenLibrary = useCallback(() => {
		setShowLibrary(true);
	}, []);

	const handleLibraryClose = useCallback(() => {
		setShowLibrary(false);
		handleDocumentUploaded();
	}, [handleDocumentUploaded]);

	const handleDocumentRemove = useCallback(
		async (documentId: string) => {
			try {
				await api.deleteDocument(documentId);
				refreshDocument();
				refreshConversations();
			} catch (error) {
				console.error("Failed to remove document:", error);
			}
		},
		[refreshDocument, refreshConversations],
	);

	// Global Ctrl+F handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				// Trigger document search (default behavior)
				setTriggerDocSearch(true);
				// Reset after trigger
				setTimeout(() => setTriggerDocSearch(false), 100);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen bg-neutral-50 bg-mesh-light">
				<ChatSidebar
					conversations={conversations}
					selectedId={selectedId}
					loading={conversationsLoading}
					onSelect={select}
					onCreate={handleCreate}
					onDelete={remove}
					onOpenLibrary={handleOpenLibrary}
				/>

				<ChatWindow
					messages={messages}
					loading={messagesLoading}
					error={messagesError}
					streaming={streaming}
					streamingContent={streamingContent}
					hasDocument={documents.length > 0}
					conversationId={selectedId}
					onSend={handleSend}
					onCitationClick={handleCitationClick}
					onOpenLibrary={handleOpenLibrary}
				/>

				<EnhancedMultiDocViewer
					documents={documents}
					activeDocumentId={activeDocumentId || documents[0]?.id}
					targetPage={targetPage}
					highlightText={highlightText}
					onDocumentChange={setActiveDocumentId}
					onDocumentUploaded={handleDocumentUploaded}
					onDocumentRemove={handleDocumentRemove}
					conversationId={selectedId || undefined}
					triggerSearch={triggerDocSearch}
				/>

				{/* Global Document Library Modal */}
				{showLibrary && (
					<DocumentLibraryModal
						isOpen={showLibrary}
						onClose={handleLibraryClose}
						conversationId={selectedId || undefined}
						onDocumentLinked={handleDocumentUploaded}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
