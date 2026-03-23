import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	FileText,
	Folder,
	Link2,
	Loader2,
	Plus,
	Search,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { cn } from "../lib/utils";
import type { Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface DocumentLibraryModalProps {
	isOpen: boolean;
	onClose: () => void;
	conversationId?: string;
	onDocumentLinked?: () => void;
}

interface UploadProgress {
	file: File;
	status: "pending" | "uploading" | "success" | "error";
	progress: number;
	error?: string;
}

export function DocumentLibraryModal({
	isOpen,
	onClose,
	conversationId,
	onDocumentLinked,
}: DocumentLibraryModalProps) {
	const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
	const [libraryDocs, setLibraryDocs] = useState<Document[]>([]);
	const [linkedDocs, setLinkedDocs] = useState<Document[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [uploads, setUploads] = useState<UploadProgress[]>([]);
	const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
	const [initialLinkedIds, setInitialLinkedIds] = useState<Set<string>>(new Set());
	const fileInputRef = useRef<HTMLInputElement>(null);

	const loadLibrary = useCallback(async () => {
		setLoading(true);
		try {
			const docs = await api.fetchLibraryDocuments();
			setLibraryDocs(docs);

			// Load currently linked documents if conversation exists
			if (conversationId) {
				const linked = await api.fetchConversationDocuments(conversationId);
				setLinkedDocs(linked);

				// Pre-select library documents that match linked documents by filename
				// (linked docs have different IDs but same filename)
				const linkedFilenames = new Set(linked.map(d => d.filename));
				const matchingLibraryIds = docs
					.filter(doc => linkedFilenames.has(doc.filename))
					.map(doc => doc.id);

				const selectedIds = new Set(matchingLibraryIds);
				setSelectedDocs(selectedIds);
				setInitialLinkedIds(selectedIds);
			} else {
				// Clear selection if no conversation
				setSelectedDocs(new Set());
				setInitialLinkedIds(new Set());
			}

			// If library is empty, switch to upload tab
			if (docs.length === 0) {
				setActiveTab("upload");
			}
		} catch (error) {
			console.error("Failed to load library:", error);
		} finally {
			setLoading(false);
		}
	}, [conversationId]);

	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			loadLibrary();
		}
	}, [isOpen, loadLibrary]);

	const handleFilesSelected = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const fileArray = Array.from(files);
			const newUploads: UploadProgress[] = fileArray.map((file) => ({
				file,
				status: "pending",
				progress: 0,
			}));

			setUploads(newUploads);

			// Upload files to library
			for (let i = 0; i < fileArray.length; i++) {
				const file = fileArray[i];

				setUploads((prev) =>
					prev.map((u, idx) =>
						idx === i ? { ...u, status: "uploading", progress: 50 } : u,
					),
				);

				try {
					// Upload directly to library
					await api.uploadToLibrary(file);

					setUploads((prev) =>
						prev.map((u, idx) =>
							idx === i ? { ...u, status: "success", progress: 100 } : u,
						),
					);
				} catch (error) {
					setUploads((prev) =>
						prev.map((u, idx) =>
							idx === i
								? {
										...u,
										status: "error",
										progress: 0,
										error:
											error instanceof Error ? error.message : "Upload failed",
									}
								: u,
						),
					);
				}
			}

			// Refresh library
			await loadLibrary();

			// Clear uploads after 3 seconds
			setTimeout(() => {
				setUploads([]);
			}, 3000);

			// Switch to library tab to show uploaded docs
			setActiveTab("library");
		},
		[loadLibrary],
	);

	const toggleSelection = useCallback((docId: string) => {
		setSelectedDocs((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(docId)) {
				newSet.delete(docId);
			} else {
				newSet.add(docId);
			}
			return newSet;
		});
	}, []);

	const linkSelectedDocuments = useCallback(async () => {
		if (!conversationId) return;

		// Find documents to link (newly selected library docs)
		const toLink = Array.from(selectedDocs).filter(id => !initialLinkedIds.has(id));

		// Find documents to unlink (previously selected but now unchecked)
		const toUnlink = Array.from(initialLinkedIds).filter(id => !selectedDocs.has(id));

		try {
			// Link new documents
			for (const docId of toLink) {
				await api.linkDocumentToConversation(conversationId, docId);
			}

			// Unlink removed documents
			// Need to find the conversation document IDs by matching filenames
			for (const libraryDocId of toUnlink) {
				const libraryDoc = libraryDocs.find(d => d.id === libraryDocId);
				if (libraryDoc) {
					// Find the conversation document with matching filename
					const conversationDoc = linkedDocs.find(d => d.filename === libraryDoc.filename);
					if (conversationDoc) {
						await api.deleteDocument(conversationDoc.id);
					}
				}
			}

			onDocumentLinked?.();
			onClose();
		} catch (error) {
			console.error("Failed to update documents:", error);
		}
	}, [conversationId, selectedDocs, initialLinkedIds, libraryDocs, linkedDocs, onDocumentLinked, onClose]);

	const filteredDocs = libraryDocs.filter((doc) =>
		doc.filename.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.95 }}
				className="w-full max-w-4xl rounded-2xl bg-white shadow-soft-xl"
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-neutral-100 p-6">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2 shadow-soft">
							<Folder className="h-5 w-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-neutral-900">Document Library</h2>
							<p className="text-sm text-neutral-500">
								Upload once, use across all conversations
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 transition-colors hover:bg-neutral-100"
					>
						<X className="h-5 w-5 text-neutral-600" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-neutral-100 px-6">
					<button
						type="button"
						onClick={() => setActiveTab("library")}
						className={cn(
							"border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
							activeTab === "library"
								? "border-brand-500 text-brand-700"
								: "border-transparent text-neutral-600 hover:text-neutral-900",
						)}
					>
						<div className="flex items-center gap-2">
							<Folder className="h-4 w-4" />
							<span>My Library</span>
							<span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
								{libraryDocs.length}
							</span>
						</div>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("upload")}
						className={cn(
							"border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
							activeTab === "upload"
								? "border-brand-500 text-brand-700"
								: "border-transparent text-neutral-600 hover:text-neutral-900",
						)}
					>
						<div className="flex items-center gap-2">
							<Upload className="h-4 w-4" />
							<span>Upload to Library</span>
						</div>
					</button>
				</div>

				{/* Content */}
				<div className="p-6" style={{ minHeight: "400px", maxHeight: "60vh" }}>
					{activeTab === "library" && (
						<div className="flex h-full flex-col">
							{/* Search */}
							<div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
								<Search className="h-4 w-4 text-neutral-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search library documents..."
									className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
								/>
							</div>

							{/* Document Grid */}
							{loading ? (
								<div className="flex flex-1 items-center justify-center">
									<Loader2 className="h-8 w-8 animate-spin text-brand-500" />
								</div>
							) : filteredDocs.length === 0 ? (
								<div className="flex flex-1 flex-col items-center justify-center text-center">
									<div className="rounded-full bg-neutral-100 p-4">
										<Folder className="h-10 w-10 text-neutral-400" />
									</div>
									<p className="mt-4 text-sm font-semibold text-neutral-700">
										{searchQuery ? "No documents found" : "Your library is empty"}
									</p>
									<p className="mt-1 text-xs text-neutral-500">
										{searchQuery
											? "Try a different search term"
											: "Upload documents to reuse them across conversations"}
									</p>
									{!searchQuery && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setActiveTab("upload")}
											className="mt-4"
										>
											<Upload className="mr-2 h-4 w-4" />
											Upload Documents
										</Button>
									)}
								</div>
							) : (
								<ScrollArea className="flex-1">
									<div className="grid grid-cols-2 gap-3">
										{filteredDocs.map((doc) => {
											const isSelected = selectedDocs.has(doc.id);
											const isLinked = initialLinkedIds.has(doc.id);
											return (
												<button
													key={doc.id}
													type="button"
													onClick={() => toggleSelection(doc.id)}
													className={cn(
														"relative flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
														isSelected
															? "border-brand-500 bg-brand-50 shadow-soft"
															: "border-neutral-200 bg-white hover:border-brand-300 hover:shadow-soft",
													)}
												>
													{/* Linked indicator */}
													{isLinked && (
														<div className="absolute top-2 right-2">
															<div className="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
																<Link2 className="h-2.5 w-2.5" />
																Linked
															</div>
														</div>
													)}

													<div
														className={cn(
															"mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all",
															isSelected
																? "border-brand-500 bg-brand-500"
																: "border-neutral-300",
														)}
													>
														{isSelected && <Check className="h-3 w-3 text-white" />}
													</div>
													<div className="min-w-0 flex-1 pr-12">
														<p className="truncate text-sm font-semibold text-neutral-900">
															{doc.filename}
														</p>
														<p className="mt-0.5 text-xs text-neutral-500">
															{doc.page_count} pages
														</p>
													</div>
												</button>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</div>
					)}

					{activeTab === "upload" && (
						<div className="flex h-full flex-col">
							{/* Upload Progress */}
							{uploads.length > 0 && (
								<div className="mb-4 space-y-2">
									<p className="text-sm font-semibold text-neutral-700">Uploading to library...</p>
									<AnimatePresence>
										{uploads.map((upload, idx) => (
											<motion.div
												key={idx}
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"
											>
												{upload.status === "uploading" && (
													<Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-brand-500" />
												)}
												{upload.status === "success" && (
													<Check className="h-5 w-5 flex-shrink-0 text-verified-500" />
												)}
												{upload.status === "error" && (
													<X className="h-5 w-5 flex-shrink-0 text-uncertain-500" />
												)}
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-neutral-800">
														{upload.file.name}
													</p>
													{upload.status === "uploading" && (
														<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
															<div
																className="h-full bg-brand-500 transition-all duration-300"
																style={{ width: `${upload.progress}%` }}
															/>
														</div>
													)}
													{upload.status === "success" && (
														<p className="text-xs text-verified-600">Uploaded successfully</p>
													)}
													{upload.status === "error" && (
														<p className="text-xs text-uncertain-600">{upload.error}</p>
													)}
												</div>
											</motion.div>
										))}
									</AnimatePresence>
								</div>
							)}

							{/* Upload Zone */}
							<div className="flex flex-1 items-center justify-center">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-gradient-to-br from-white to-neutral-50 px-8 py-12 text-center transition-all hover:border-brand-400 hover:bg-brand-50 hover:shadow-soft-lg"
								>
									<div className="mb-4 flex justify-center">
										<div className="rounded-full bg-gradient-to-br from-brand-500 to-brand-600 p-4 shadow-soft">
											<Upload className="h-8 w-8 text-white" />
										</div>
									</div>
									<p className="text-sm font-semibold text-neutral-900">
										Upload Documents to Library
									</p>
									<p className="mt-2 text-xs text-neutral-600">
										Click or drag and drop multiple PDF files
									</p>
									<p className="mt-3 text-xs text-neutral-500">
										Upload once, reuse across all conversations
									</p>
								</button>
							</div>

							<input
								ref={fileInputRef}
								type="file"
								accept=".pdf"
								multiple
								className="hidden"
								onChange={(e) => handleFilesSelected(e.target.files)}
							/>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-6 py-4">
					<div className="text-sm text-neutral-600">
						{activeTab === "library" && selectedDocs.size > 0 && (
							<span>
								{selectedDocs.size} document{selectedDocs.size !== 1 ? "s" : ""} selected
							</span>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						{activeTab === "library" && conversationId && (
							<Button
								onClick={linkSelectedDocuments}
								disabled={selectedDocs.size === 0 && initialLinkedIds.size === 0}
								className="bg-gradient-to-br from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700"
							>
								<Check className="mr-2 h-4 w-4" />
								Apply Changes
							</Button>
						)}
					</div>
				</div>
			</motion.div>
		</div>
	);
}
