import { FileText, Link2, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
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
	conversationId: string | null;
	onSend: (content: string) => void;
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
	conversationId,
	onSend,
	onCitationClick,
	onOpenLibrary,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [starterQuestions, setStarterQuestions] = useState<string[]>([
		"What properties are mentioned in these documents?",
		"Summarize the key dates and deadlines",
		"Are there any concerning clauses or red flags?",
		"Compare the indemnity provisions"
	]);
	const [loadingQuestions, setLoadingQuestions] = useState(false);

	// Load dynamic starter questions once when documents are added
	useEffect(() => {
		if (conversationId && hasDocument && messages.length === 0 && !loadingQuestions) {
			setLoadingQuestions(true);
			api.fetchStarterQuestions(conversationId)
				.then(questions => {
					if (questions && questions.length >= 4) {
						// Take exactly 4 questions
						setStarterQuestions(questions.slice(0, 4));
					}
				})
				.catch(err => {
					console.error('Failed to load starter questions:', err);
				})
				.finally(() => {
					setLoadingQuestions(false);
				});
		}
	// Only run when conversation or document state changes, not on every render
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, hasDocument]);

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
							<div className="flex items-center gap-3">
								<p className="text-base font-semibold text-neutral-900">Ready to analyze your documents</p>
								{loadingQuestions && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
							</div>
							<p className="mt-2 text-sm text-neutral-600">Try these contextual questions:</p>

							<div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-2xl">
								{starterQuestions.map((question, idx) => (
									<button
										key={idx}
										type="button"
										onClick={() => onSend(question)}
										className="rounded-xl border-2 border-neutral-200 bg-white p-4 text-left text-sm font-medium text-neutral-700 transition-all hover:border-brand-400 hover:bg-gradient-to-br hover:from-brand-50 hover:to-purple-50 hover:shadow-md active:scale-[0.98]"
									>
										<span className="text-brand-600 mr-2">
											{["💡", "🔍", "⚠️", "📊"][idx]}
										</span>
										{question}
									</button>
								))}
							</div>
						</>
					)}
				</div>
				<ChatInput
					onSend={onSend}
					
					disabled={streaming}
					hasDocument={hasDocument}
					
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
				
				disabled={streaming}
				hasDocument={hasDocument}
				
				onOpenLibrary={onOpenLibrary}
			/>
		</div>
	);
}
