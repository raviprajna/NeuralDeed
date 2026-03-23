import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	Loader2,
	MessageSquarePlus,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import * as api from "../lib/api";
import { relativeTime } from "../lib/utils";
import type { Conversation, Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface ConversationSidebarProps {
	conversations: Conversation[];
	selectedId: string | null;
	loading: boolean;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
	onDocumentUploaded: () => void;
	onOpenLibrary?: () => void;
}

export function ConversationSidebar({
	conversations,
	selectedId,
	loading,
	onSelect,
	onCreate,
	onDelete,
	onDocumentUploaded,
	onOpenLibrary,
}: ConversationSidebarProps) {
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [conversationDocs, setConversationDocs] = useState<Record<string, Document[]>>({});
	const [uploading, setUploading] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadForConv, setUploadForConv] = useState<string | null>(null);

	const loadDocuments = useCallback(async (convId: string) => {
		try {
			const docs = await api.fetchConversationDocuments(convId);
			setConversationDocs(prev => ({ ...prev, [convId]: docs }));
		} catch (error) {
			console.error("Failed to load documents:", error);
		}
	}, []);

	const toggleExpand = useCallback((convId: string) => {
		setExpandedId(prev => {
			const newExpanded = prev === convId ? null : convId;
			if (newExpanded && !conversationDocs[convId]) {
				loadDocuments(convId);
			}
			return newExpanded;
		});
	}, [conversationDocs, loadDocuments]);

	const handleUploadClick = useCallback((convId: string) => {
		setUploadForConv(convId);
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || !uploadForConv) return;

		setUploading(uploadForConv);

		for (const file of Array.from(files)) {
			try {
				await api.uploadDocument(uploadForConv, file);
			} catch (error) {
				console.error("Upload failed:", error);
			}
		}

		setUploading(null);
		setUploadForConv(null);
		await loadDocuments(uploadForConv);
		onDocumentUploaded();

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [uploadForConv, loadDocuments, onDocumentUploaded]);

	return (
		<div className="flex h-full w-[320px] flex-shrink-0 flex-col border-r border-neutral-200 bg-gradient-to-b from-white to-neutral-50/50 shadow-soft">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-neutral-100 bg-white p-4">
				<div className="flex items-center gap-2">
					<div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-1.5 shadow-soft">
						<MessageSquarePlus className="h-4 w-4 text-white" />
					</div>
					<span className="text-sm font-semibold text-neutral-900">Conversations</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={onOpenLibrary}
						title="Document library"
						className="h-8 w-8 hover:bg-brand-50 hover:text-brand-600"
					>
						<Folder className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={onCreate}
						title="New chat"
						className="h-8 w-8 hover:bg-brand-50 hover:text-brand-600"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>

			{/* Document Library Section */}
			<div className="border-b border-neutral-100 bg-brand-50/30 p-3">
				<button
					type="button"
					className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-white"
				>
					<Folder className="h-4 w-4 text-brand-600" />
					<span className="text-sm font-semibold text-neutral-900">Document Library</span>
					<span className="ml-auto text-xs text-neutral-500">Coming soon</span>
				</button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{loading && conversations.length === 0 && (
						<div className="space-y-2 p-2">
							{[1, 2, 3].map((i) => (
								<div key={i} className="animate-pulse space-y-1">
									<div className="h-4 w-3/4 rounded bg-neutral-100" />
									<div className="h-3 w-1/2 rounded bg-neutral-50" />
								</div>
							))}
						</div>
					)}

					{!loading && conversations.length === 0 && (
						<p className="px-2 py-8 text-center text-xs text-neutral-400">
							No conversations yet
						</p>
					)}

					<AnimatePresence initial={false}>
						{conversations.map((conversation) => {
							const isExpanded = expandedId === conversation.id;
							const docs = conversationDocs[conversation.id] || [];
							const isUploading = uploading === conversation.id;

							return (
								<motion.div
									key={conversation.id}
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.15 }}
									className="mb-2"
								>
									{/* Conversation */}
									<div
										className={`group rounded-xl border px-3 py-2.5 transition-all ${
											selectedId === conversation.id
												? "border-brand-200 bg-brand-50 shadow-soft"
												: "border-transparent hover:border-neutral-200 hover:bg-white hover:shadow-soft"
										}`}
									>
										<div
											className="flex items-center gap-2"
											onMouseEnter={() => setHoveredId(conversation.id)}
											onMouseLeave={() => setHoveredId(null)}
										>
											<button
												type="button"
												onClick={() => toggleExpand(conversation.id)}
												className="flex-shrink-0 rounded p-0.5 hover:bg-neutral-100"
											>
												{isExpanded ? (
													<ChevronDown className="h-3.5 w-3.5 text-neutral-600" />
												) : (
													<ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
												)}
											</button>

											<button
												type="button"
												className="min-w-0 flex-1 text-left overflow-hidden"
												onClick={() => onSelect(conversation.id)}
											>
												<p
													className={`truncate text-sm font-semibold ${
														selectedId === conversation.id
															? "text-brand-700"
															: "text-neutral-800"
													}`}
												>
													{conversation.title}
												</p>
												<p className="mt-0.5 text-xs text-neutral-500">
													{relativeTime(conversation.updated_at)}
												</p>
											</button>

											<button
												type="button"
												className={`flex-shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-uncertain-100 hover:text-uncertain-600 ${
													hoveredId === conversation.id ? 'opacity-100' : 'opacity-0'
												}`}
												onClick={(e) => {
													e.stopPropagation();
													onDelete(conversation.id);
												}}
												title="Delete conversation"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										</div>

										{/* Documents (nested) */}
										{isExpanded && (
											<motion.div
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												className="mt-2 space-y-1 pl-6"
											>
												{docs.length === 0 && !isUploading && (
													<p className="py-2 text-xs text-neutral-500">No documents</p>
												)}

												{isUploading && (
													<div className="flex items-center gap-2 py-2">
														<Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
														<span className="text-xs text-neutral-600">Uploading...</span>
													</div>
												)}

												{docs.map((doc) => (
													<div
														key={doc.id}
														className="flex items-center gap-2 rounded-lg bg-neutral-50/50 p-2 hover:bg-neutral-100"
													>
														<FileText className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
														<div className="min-w-0 flex-1">
															<p className="truncate text-xs font-medium text-neutral-800">
																{doc.filename}
															</p>
															<p className="text-[10px] text-neutral-500">
																{doc.page_count} pages
															</p>
														</div>
													</div>
												))}

												<button
													type="button"
													onClick={() => handleUploadClick(conversation.id)}
													className="flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white p-2 text-xs text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
												>
													<Upload className="h-3.5 w-3.5" />
													<span>Upload more documents</span>
												</button>
											</motion.div>
										)}
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			</ScrollArea>
		</div>
	);
}
