import { FileText, Link2, Loader2, Upload } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { ChatInput } from "./ChatInput";
import { MessageBubble, StreamingBubble } from "./MessageBubble";

interface ChatWindowProps {
	messages: Message[];
	loading: boolean;
	error: string | null;
	streaming: boolean;
	streamingContent: string;
	hasDocument: boolean;
	documentCount?: number;
	conversationId: string | null;
	onSend: (content: string) => void;
	onUpload: (file: File) => void;
	onCitationClick?: (page: number, documentId?: string, extractedText?: string) => void;
	onOpenLibrary?: () => void;
}

export function ChatWindow({
	messages,
	loading,
	error,
	streaming,
	streamingContent,
	hasDocument,
	documentCount = 0,
	conversationId,
	onSend,
	onUpload,
	onCitationClick,
	onOpenLibrary,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive or during streaming
	const messagesLength = messages.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages and streamingContent are intentional triggers for auto-scroll
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messagesLength, streamingContent]);

	// No conversation selected
	if (!conversationId) {
		return (
			<div className="flex flex-1 items-center justify-center bg-neutral-50">
				<div className="text-center">
					<p className="text-sm text-neutral-400">
						Select a conversation or create a new one
					</p>
				</div>
			</div>
		);
	}

	// Loading messages
	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center bg-white">
				<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
			</div>
		);
	}

	// Empty conversation - show document selection and starter prompts
	if (messages.length === 0 && !streaming) {
		return (
			<div className="flex flex-1 flex-col bg-white">
				<div className="flex flex-1 flex-col items-center justify-center px-8">
					{!hasDocument && (
						<>
							<div className="mb-6 flex justify-center">
								<div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 shadow-soft-lg">
									<FileText className="h-12 w-12 text-white" />
								</div>
							</div>
							<h3 className="text-lg font-bold text-neutral-900">Upload Documents to Get Started</h3>
							<p className="mt-2 mb-8 text-sm leading-relaxed text-neutral-600">
								Ask questions about leases, title reports, contracts, deeds, and other real estate legal documents
							</p>

							<div className="grid grid-cols-2 gap-3 w-full max-w-md">
								<button
									type="button"
									onClick={onOpenLibrary}
									className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand-200 bg-white p-6 transition-all hover:border-brand-400 hover:bg-brand-50 hover:shadow-soft"
								>
									<Link2 className="h-6 w-6 text-brand-600" />
									<span className="text-sm font-semibold text-neutral-900">Link from Library</span>
									<span className="text-xs text-neutral-500">Reuse existing docs</span>
								</button>

								<button
									type="button"
									onClick={onOpenLibrary}
									className="flex flex-col items-center gap-2 rounded-xl border-2 border-neutral-200 bg-white p-6 transition-all hover:border-neutral-300 hover:shadow-soft"
								>
									<Upload className="h-6 w-6 text-neutral-600" />
									<span className="text-sm font-semibold text-neutral-900">Upload New</span>
									<span className="text-xs text-neutral-500">Add to library</span>
								</button>
							</div>
						</>
					)}

					{hasDocument && (
						<>
							<p className="text-base font-semibold text-neutral-900">Ready to analyze your documents</p>
							<p className="mt-2 text-sm text-neutral-600">Try these starter questions:</p>

							<div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-2xl">
								<button
									type="button"
									onClick={() => onSend("What properties are mentioned in these documents?")}
									className="rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm text-neutral-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-soft"
								>
									📍 What properties are mentioned in these documents?
								</button>
								<button
									type="button"
									onClick={() => onSend("Summarize the key dates and deadlines")}
									className="rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm text-neutral-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-soft"
								>
									📅 Summarize the key dates and deadlines
								</button>
								<button
									type="button"
									onClick={() => onSend("Are there any concerning clauses or red flags?")}
									className="rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm text-neutral-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-soft"
								>
									⚠️ Are there any concerning clauses or red flags?
								</button>
								<button
									type="button"
									onClick={() => onSend("Compare the indemnity provisions across documents")}
									className="rounded-xl border border-neutral-200 bg-white p-4 text-left text-sm text-neutral-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-soft"
								>
									⚖️ Compare the indemnity provisions
								</button>
							</div>
						</>
					)}
				</div>
				<ChatInput
					onSend={onSend}
					onUpload={onUpload}
					disabled={streaming}
					hasDocument={hasDocument}
					allowMultipleDocuments={true}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col bg-white">
			{error && (
				<div className="mx-4 mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
					{error}
				</div>
			)}

			<div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
				<div className="mx-auto max-w-2xl space-y-1">
					{messages.map((message) => (
						<MessageBubble key={message.id} message={message} onCitationClick={onCitationClick} />
					))}
					{streaming && <StreamingBubble content={streamingContent} />}
				</div>
			</div>

			<ChatInput
				onSend={onSend}
				onUpload={onUpload}
				disabled={streaming}
				hasDocument={hasDocument}
				allowMultipleDocuments={true}
				onOpenLibrary={onOpenLibrary}
			/>
		</div>
	);
}
