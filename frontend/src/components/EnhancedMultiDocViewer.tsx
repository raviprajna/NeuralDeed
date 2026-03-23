import {
	ChevronLeft,
	ChevronRight,
	FileText,
	Loader2,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./EnhancedMultiDocViewer.css";
import { cn } from "../lib/utils";
import * as api from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { DocumentLibraryModal } from "./DocumentLibraryModal";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const MIN_WIDTH = 450;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 600;

interface EnhancedMultiDocViewerProps {
	documents: Document[];
	activeDocumentId?: string;
	targetPage?: number;
	highlightText?: string;
	onDocumentChange?: (documentId: string) => void;
	onDocumentUploaded: () => void;
	onDocumentRemove?: (documentId: string) => void;
	conversationId?: string;
	triggerSearch?: boolean;
}

export function EnhancedMultiDocViewer({
	documents,
	activeDocumentId,
	targetPage,
	highlightText,
	onDocumentChange,
	onDocumentUploaded,
	onDocumentRemove,
	conversationId,
	triggerSearch,
}: EnhancedMultiDocViewerProps) {
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
	const [numPages, setNumPages] = useState<Record<string, number>>({});
	const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
	const [pdfError, setPdfError] = useState<Record<string, string>>({});
	const [showLibrary, setShowLibrary] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [searchResultCount, setSearchResultCount] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const tabsContainerRef = useRef<HTMLDivElement>(null);
	const pageContainerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const activeDoc = documents.find((d) => d.id === activeDocumentId) || documents[0];

	useEffect(() => {
		if (!activeDoc && documents.length > 0 && documents[0]) {
			onDocumentChange?.(documents[0].id);
		}
	}, [documents, activeDoc, onDocumentChange]);

	// Handle Ctrl+F trigger
	useEffect(() => {
		if (triggerSearch && documents.length > 0) {
			setShowSearch(true);
			// Focus the search input
			setTimeout(() => {
				searchInputRef.current?.focus();
			}, 100);
		}
	}, [triggerSearch, documents.length]);

	// Navigate to target page when citation is clicked
	useEffect(() => {
		if (targetPage && activeDoc) {
			setCurrentPage(activeDoc.id, targetPage);
			// Scroll to top of PDF viewer to show the new page
			if (pageContainerRef.current) {
				pageContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	}, [targetPage, activeDoc]);

	// Highlight text in PDF when highlightText is provided
	useEffect(() => {
		if (!highlightText || !pageContainerRef.current) return;

		console.log('[Citation Highlight] Attempting to highlight:', highlightText);

		// Wait for PDF text layer to render
		const timer = setTimeout(() => {
			const textLayer = pageContainerRef.current?.querySelector('.react-pdf__Page__textContent');
			if (!textLayer) {
				console.log('[Citation Highlight] Text layer not found');
				return;
			}

			// Remove any existing highlights
			const existingHighlights = textLayer.querySelectorAll('.citation-highlight');
			existingHighlights.forEach(el => {
				const parent = el.parentNode;
				if (parent) {
					parent.replaceChild(document.createTextNode(el.textContent || ''), el);
				}
			});

			// Normalize the search text for better matching
			const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
			const searchText = normalizeText(highlightText);

			// Extract key words from the search text (at least 4 chars) for fuzzy matching
			const searchWords = searchText.split(' ').filter(word => word.length >= 4);
			console.log('[Citation Highlight] Search text:', searchText);
			console.log('[Citation Highlight] Key words:', searchWords);

			// Find and highlight the matching text
			const textElements = textLayer.querySelectorAll('span');
			let highlightCount = 0;

			textElements.forEach(span => {
				const text = span.textContent || '';
				const normalizedText = normalizeText(text);

				// Try exact match first
				if (normalizedText.includes(searchText)) {
					const lowerText = text.toLowerCase();
					const startIndex = lowerText.indexOf(searchText);
					const endIndex = startIndex + searchText.length;

					const before = text.substring(0, startIndex);
					const match = text.substring(startIndex, endIndex);
					const after = text.substring(endIndex);

					span.innerHTML = `${before}<mark class="citation-highlight bg-yellow-300 animate-pulse">${match}</mark>${after}`;
					highlightCount++;
				}
				// Try partial match with key words
				else if (searchWords.length > 0 && searchWords.some(word => normalizedText.includes(word))) {
					// Highlight if it contains any significant word from the citation
					const matchedWord = searchWords.find(word => normalizedText.includes(word));
					if (matchedWord) {
						const lowerText = text.toLowerCase();
						const startIndex = lowerText.indexOf(matchedWord);
						if (startIndex !== -1) {
							const endIndex = startIndex + matchedWord.length;
							const before = text.substring(0, startIndex);
							const match = text.substring(startIndex, endIndex);
							const after = text.substring(endIndex);

							span.innerHTML = `${before}<mark class="citation-highlight bg-yellow-300 animate-pulse">${match}</mark>${after}`;
							highlightCount++;
						}
					}
				}
			});

			console.log('[Citation Highlight] Highlighted', highlightCount, 'elements');

			// Scroll to first highlight
			setTimeout(() => {
				const firstHighlight = textLayer.querySelector('.citation-highlight');
				if (firstHighlight) {
					console.log('[Citation Highlight] Scrolling to highlight');
					firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					console.log('[Citation Highlight] No highlights found to scroll to');
				}
			}, 100);
		}, 500); // Wait for text layer to render

		return () => clearTimeout(timer);
	}, [highlightText, currentPages, activeDoc]);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setDragging(true);

			const startX = e.clientX;
			const startWidth = width;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
				setWidth(newWidth);
			};

			const handleMouseUp = () => {
				setDragging(false);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		},
		[width],
	);

	const getCurrentPage = (docId: string) => currentPages[docId] || 1;
	const getNumPages = (docId: string) => numPages[docId] || 0;

	const setCurrentPage = (docId: string, page: number) => {
		setCurrentPages((prev) => ({ ...prev, [docId]: page }));
	};

	// Search handler - searches across all documents
	const handleSearch = useCallback(async () => {
		if (!searchQuery.trim() || documents.length === 0 || !conversationId) return;

		setSearching(true);
		setSearchResultCount(0);

		try {
			const results = await api.searchDocuments(conversationId, searchQuery);

			if (results.length === 0) {
				setSearchResultCount(0);
				alert('No matches found');
				setSearching(false);
				return;
			}

			// Set result count
			setSearchResultCount(results.length);

			// Take the first result
			const firstResult = results[0];
			if (!firstResult) {
				setSearching(false);
				return;
			}

			const searchText = searchQuery.toLowerCase().trim();

			// Switch to the document that has the match
			onDocumentChange?.(firstResult.document_id);
			setCurrentPage(firstResult.document_id, firstResult.page_number);

			// Apply highlighting after document loads
			setTimeout(() => {
				if (pageContainerRef.current) {
					const textLayer = pageContainerRef.current.querySelector('.react-pdf__Page__textContent');
					if (!textLayer) return;

					// Remove old highlights
					const existingHighlights = textLayer.querySelectorAll('.citation-highlight');
					existingHighlights.forEach(el => {
						const parent = el.parentNode;
						if (parent && el.textContent) {
							parent.replaceChild(document.createTextNode(el.textContent), el);
						}
					});

					// Apply new highlights
					const textElements = textLayer.querySelectorAll('span');
					textElements.forEach(span => {
						const text = span.textContent || '';
						const lowerText = text.toLowerCase();

						if (lowerText.includes(searchText)) {
							const startIndex = lowerText.indexOf(searchText);
							const endIndex = startIndex + searchText.length;

							const before = text.substring(0, startIndex);
							const match = text.substring(startIndex, endIndex);
							const after = text.substring(endIndex);

							span.innerHTML = `${before}<mark class="citation-highlight">${match}</mark>${after}`;
						}
					});

					// Scroll to first match
					const firstMatch = textLayer.querySelector('.citation-highlight');
					if (firstMatch) {
						firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			}, 1000);
		} catch (error) {
			console.error('Search failed:', error);
			alert('Search failed. Please try again.');
		} finally {
			setSearching(false);
		}
	}, [searchQuery, documents, onDocumentChange, conversationId]);

	const pdfPageWidth = width - 64;

	if (documents.length === 0) {
		return (
			<>
				<div
					style={{ width }}
					className="flex h-full flex-shrink-0 flex-col items-center justify-center border-l border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-blue-50/20"
				>
					<div className="max-w-md text-center px-8">
						<div className="mb-6 flex justify-center">
							<div className="rounded-2xl bg-neutral-200 p-5">
								<FileText className="h-12 w-12 text-neutral-500" />
							</div>
						</div>
						<p className="text-sm text-neutral-600">
							No documents linked to this conversation yet
						</p>
						<p className="mt-2 text-xs text-neutral-500">
							Use the chat panel to link or upload documents
						</p>
					</div>
				</div>

				<DocumentLibraryModal
					isOpen={showLibrary}
					onClose={() => setShowLibrary(false)}
					conversationId={conversationId}
					onDocumentLinked={onDocumentUploaded}
				/>
			</>
		);
	}

	return (
		<div
			ref={containerRef}
			style={{ width }}
			className="relative flex h-full flex-shrink-0 flex-col border-l border-neutral-200 bg-white shadow-soft-lg"
		>
			{/* Resize handle */}
			<div
				className={cn(
					"absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-brand-300",
					dragging ? "bg-brand-500" : "",
				)}
				onMouseDown={handleMouseDown}
			/>

			{/* Header with Inline Search */}
			<div className="flex items-center border-b border-neutral-100 bg-gradient-to-r from-white to-neutral-50 px-4 py-3 gap-3">
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-brand-600" />
					<span className="text-sm font-semibold text-neutral-900">Documents</span>
					<div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
						{documents.length}
					</div>
				</div>

				<div className="flex items-center gap-2">
					{showSearch ? (
						<form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-center gap-2 rounded-full border-2 border-brand-400 bg-white pl-3 pr-2 py-1.5 shadow-md hover:shadow-lg transition-all">
							<Search className="h-4 w-4 text-brand-500 flex-shrink-0" />
							<input
								ref={searchInputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									if (!e.target.value) setSearchResultCount(0);
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleSearch();
									}
									if (e.key === 'Escape') {
										setShowSearch(false);
										setSearchQuery('');
										setSearchResultCount(0);
									}
								}}
								placeholder="Search... (Ctrl+F)"
								className="w-48 bg-transparent text-sm text-neutral-900 outline-none border-none focus:outline-none focus:ring-0 focus-visible:outline-none placeholder:text-neutral-400"
								style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
								disabled={searching}
								autoFocus
							/>
							{searchResultCount > 0 && (
								<span className="text-[10px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full flex-shrink-0">
									{searchResultCount}
								</span>
							)}
							{searchQuery && !searching && (
								<button
									type="button"
									onClick={() => {
										setSearchQuery('');
										setSearchResultCount(0);
									}}
									className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full p-1 transition-colors flex-shrink-0"
									title="Clear"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
							{searching && (
								<Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500 flex-shrink-0" />
							)}
						</form>
					) : (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowSearch(true)}
							className="h-8 rounded-full hover:bg-neutral-100 focus-visible:outline-none"
							title="Search documents (Ctrl+F)"
						>
							<Search className="h-4 w-4 mr-1.5" />
							Search
						</Button>
					)}

					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowLibrary(true)}
						className="h-8 rounded-full whitespace-nowrap hover:bg-neutral-50 focus-visible:outline-none"
						title="Manage documents"
					>
						Manage Docs
					</Button>
				</div>
			</div>

			{/* Horizontal Scrollable Document Tabs */}
			<div className="border-b border-neutral-100 bg-neutral-50">
				<div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent hover:scrollbar-thumb-neutral-400">
					<div ref={tabsContainerRef} className="flex gap-2 p-2 min-w-min">
						{documents.map((doc) => (
							<div key={doc.id} className="relative group">
								<button
									type="button"
									onClick={() => onDocumentChange?.(doc.id)}
									className={cn(
										"flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 pr-8 text-xs font-medium transition-all whitespace-nowrap",
										activeDoc?.id === doc.id
											? "bg-white shadow-soft border-2 border-brand-300 text-brand-700"
											: "bg-neutral-100 text-neutral-600 hover:bg-white hover:text-neutral-900 border-2 border-transparent",
									)}
								>
									<FileText className="h-3.5 w-3.5 flex-shrink-0" />
									<div className="text-left">
										<p className="max-w-[150px] truncate font-semibold">{doc.filename}</p>
										<p className="text-[10px] text-neutral-500">{doc.page_count} pages</p>
									</div>
								</button>
								{/* Remove button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onDocumentRemove?.(doc.id);
									}}
									className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-all"
									title="Remove document"
								>
									<X className="h-3 w-3 text-red-600" />
								</button>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* PDF Viewer */}
			{activeDoc && (
				<ScrollArea className="flex-1 px-4 py-4">
					{pdfError[activeDoc.id] && (
						<div className="rounded-lg border border-uncertain-200 bg-uncertain-50 p-4 text-sm text-uncertain-700">
							<p className="font-medium">Failed to load PDF</p>
							<p className="mt-1 text-xs">{pdfError[activeDoc.id]}</p>
						</div>
					)}

					<PDFDocument
						file={api.getDocumentUrl(activeDoc.id)}
						onLoadSuccess={({ numPages: pages }) => {
							setNumPages((prev) => ({ ...prev, [activeDoc.id]: pages }));
							setPdfLoading((prev) => ({ ...prev, [activeDoc.id]: false }));
							setPdfError((prev) => {
								const newErrors = { ...prev };
								delete newErrors[activeDoc.id];
								return newErrors;
							});
						}}
						onLoadError={(error) => {
							setPdfError((prev) => ({
								...prev,
								[activeDoc.id]: error.message,
							}));
							setPdfLoading((prev) => ({ ...prev, [activeDoc.id]: false }));
						}}
						loading={
							<div className="flex items-center justify-center py-16">
								<div className="text-center">
									<Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
									<p className="mt-3 text-sm font-medium text-neutral-600">
										Loading {activeDoc.filename}...
									</p>
								</div>
							</div>
						}
					>
						{!pdfLoading[activeDoc.id] && !pdfError[activeDoc.id] && (
							<div ref={pageContainerRef} className="overflow-hidden rounded-lg border border-neutral-200 shadow-soft">
								<Page
									pageNumber={getCurrentPage(activeDoc.id)}
									width={pdfPageWidth}
									loading={
										<div className="flex items-center justify-center bg-neutral-50 py-16">
											<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
										</div>
									}
								/>
							</div>
						)}
					</PDFDocument>
				</ScrollArea>
			)}

			{/* Page Navigation */}
			{activeDoc && getNumPages(activeDoc.id) > 0 && (
				<div className="flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3">
					<Button
						variant="outline"
						size="sm"
						className="h-8"
						disabled={getCurrentPage(activeDoc.id) <= 1}
						onClick={() =>
							setCurrentPage(activeDoc.id, Math.max(1, getCurrentPage(activeDoc.id) - 1))
						}
					>
						<ChevronLeft className="mr-1 h-4 w-4" />
						Previous
					</Button>

					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-neutral-700">
							Page {getCurrentPage(activeDoc.id)}
						</span>
						<span className="text-sm text-neutral-400">of</span>
						<span className="text-sm font-medium text-neutral-700">
							{getNumPages(activeDoc.id)}
						</span>
					</div>

					<Button
						variant="outline"
						size="sm"
						className="h-8"
						disabled={getCurrentPage(activeDoc.id) >= getNumPages(activeDoc.id)}
						onClick={() =>
							setCurrentPage(
								activeDoc.id,
								Math.min(getNumPages(activeDoc.id), getCurrentPage(activeDoc.id) + 1),
							)
						}
					>
						Next
						<ChevronRight className="ml-1 h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Document Library Modal */}
			<DocumentLibraryModal
				isOpen={showLibrary}
				onClose={() => setShowLibrary(false)}
				conversationId={conversationId}
				onDocumentLinked={onDocumentUploaded}
			/>
		</div>
	);
}
