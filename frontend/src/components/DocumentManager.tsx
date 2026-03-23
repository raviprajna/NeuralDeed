import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	FileText,
	Folder,
	Link2,
	Loader2,
	Plus,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import * as api from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface DocumentManagerProps {
	conversationId: string;
	documents: Document[];
	onDocumentsChange: () => void;
}

interface UploadProgress {
	file: File;
	status: "pending" | "uploading" | "success" | "error";
	progress: number;
	documentId?: string;
	error?: string;
}

export function DocumentManager({
	conversationId,
	documents,
	onDocumentsChange,
}: DocumentManagerProps) {
	const [uploads, setUploads] = useState<UploadProgress[]>([]);
	const [showLibrary, setShowLibrary] = useState(false);
	const [libraryDocs, setLibraryDocs] = useState<Document[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const loadLibrary = useCallback(async () => {
		try {
			const docs = await api.fetchLibraryDocuments();
			setLibraryDocs(docs);
		} catch (error) {
			console.error("Failed to load library:", error);
		}
	}, []);

	const handleFilesSelected = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const fileArray = Array.from(files);
			const newUploads: UploadProgress[] = fileArray.map((file) => ({
				file,
				status: "pending",
				progress: 0,
			}));

			setUploads((prev) => [...prev, ...newUploads]);

			// Upload files sequentially (could be parallel, but easier to track)
			for (let i = 0; i < fileArray.length; i++) {
				const file = fileArray[i];
				if (!file) continue;
				const uploadIndex = uploads.length + i;

				setUploads((prev) =>
					prev.map((u, idx) =>
						idx === uploadIndex ? { ...u, status: "uploading", progress: 50 } : u,
					),
				);

				try {
					const doc = await api.uploadDocument(conversationId, file);

					setUploads((prev) =>
						prev.map((u, idx) =>
							idx === uploadIndex
								? {
										...u,
										status: "success",
										progress: 100,
										documentId: doc.id,
									}
								: u,
						),
					);
				} catch (error) {
					setUploads((prev) =>
						prev.map((u, idx) =>
							idx === uploadIndex
								? {
										...u,
										status: "error",
										progress: 0,
										error:
											error instanceof Error
												? error.message
												: "Upload failed",
									}
								: u,
						),
					);
				}
			}

			// Refresh documents list
			onDocumentsChange();

			// Clear completed uploads after 3 seconds
			setTimeout(() => {
				setUploads((prev) =>
					prev.filter((u) => u.status === "uploading" || u.status === "pending"),
				);
			}, 3000);
		},
		[conversationId, onDocumentsChange, uploads.length],
	);

	const linkDocument = useCallback(
		async (docId: string) => {
			try {
				await api.linkDocumentToConversation(conversationId, docId);
				onDocumentsChange();
				setShowLibrary(false);
			} catch (error) {
				console.error("Failed to link document:", error);
			}
		},
		[conversationId, onDocumentsChange],
	);

	const removeDocument = useCallback(
		async (docId: string) => {
			// TODO: Implement remove endpoint
			console.log("Remove document:", docId);
		},
		[],
	);

	return (
		<div className="flex h-full w-[320px] flex-shrink-0 flex-col border-r border-neutral-200 bg-gradient-to-b from-white to-neutral-50 shadow-soft">
			{/* Header */}
			<div className="border-b border-neutral-100 bg-white p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-bold text-neutral-900">Documents</h3>
						<p className="mt-0.5 text-xs text-neutral-500">
							{documents.length} file{documents.length !== 1 ? "s" : ""}
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowLibrary(!showLibrary);
								if (!showLibrary) loadLibrary();
							}}
							title="Link from library"
						>
							<Folder className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							title="Upload new documents"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				multiple
				className="hidden"
				onChange={(e) => handleFilesSelected(e.target.files)}
			/>

			{/* Upload Progress */}
			{uploads.length > 0 && (
				<div className="border-b border-neutral-100 bg-white p-3">
					<p className="mb-2 text-xs font-semibold text-neutral-700">
						Uploading...
					</p>
					<div className="space-y-2">
						<AnimatePresence>
							{uploads.map((upload, idx) => (
								<motion.div
									key={idx}
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2"
								>
									{upload.status === "uploading" && (
										<Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-brand-500" />
									)}
									{upload.status === "success" && (
										<Check className="h-4 w-4 flex-shrink-0 text-verified-500" />
									)}
									{upload.status === "error" && (
										<X className="h-4 w-4 flex-shrink-0 text-uncertain-500" />
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium text-neutral-800">
											{upload.file.name}
										</p>
										{upload.status === "uploading" && (
											<div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
												<div
													className="h-full bg-brand-500 transition-all duration-300"
													style={{ width: `${upload.progress}%` }}
												/>
											</div>
										)}
										{upload.status === "error" && (
											<p className="text-xs text-uncertain-600">{upload.error}</p>
										)}
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>
			)}

			{/* Library View */}
			{showLibrary && (
				<div className="border-b border-neutral-100 bg-brand-50/30 p-3">
					<div className="mb-2 flex items-center justify-between">
						<p className="text-xs font-semibold text-neutral-700">
							Document Library
						</p>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowLibrary(false)}
							className="h-6"
						>
							<X className="h-3 w-3" />
						</Button>
					</div>
					<ScrollArea className="max-h-[200px]">
						<div className="space-y-1">
							{libraryDocs.map((doc) => (
								<button
									key={doc.id}
									type="button"
									onClick={() => linkDocument(doc.id)}
									className="flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left transition-colors hover:bg-brand-50"
								>
									<FileText className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium text-neutral-800">
											{doc.filename}
										</p>
										<p className="text-xs text-neutral-500">
											{doc.page_count} pages
										</p>
									</div>
									<Link2 className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
								</button>
							))}
							{libraryDocs.length === 0 && (
								<p className="py-4 text-center text-xs text-neutral-500">
									No library documents yet
								</p>
							)}
						</div>
					</ScrollArea>
				</div>
			)}

			{/* Document List */}
			<ScrollArea className="flex-1 p-3">
				<div className="space-y-2">
					{documents.length === 0 && uploads.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Upload className="mb-3 h-10 w-10 text-neutral-300" />
							<p className="text-sm font-medium text-neutral-600">
								No documents yet
							</p>
							<p className="mt-1 text-xs text-neutral-500">
								Upload or link documents to get started
							</p>
						</div>
					)}

					<AnimatePresence>
						{documents.map((doc) => (
							<motion.div
								key={doc.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-soft transition-all hover:border-brand-200 hover:shadow-soft-lg"
							>
								<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600">
									<FileText className="h-5 w-5 text-white" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-neutral-900">
										{doc.filename}
									</p>
									<p className="mt-0.5 text-xs text-neutral-500">
										{doc.page_count} page{doc.page_count !== 1 ? "s" : ""}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeDocument(doc.id)}
									className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
									title="Remove document"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</ScrollArea>

			{/* Actions Footer */}
			<div className="border-t border-neutral-100 bg-white p-3">
				<Button
					variant="outline"
					size="sm"
					onClick={() => fileInputRef.current?.click()}
					className="w-full"
				>
					<Upload className="mr-2 h-4 w-4" />
					Upload Documents
				</Button>
			</div>
		</div>
	);
}
