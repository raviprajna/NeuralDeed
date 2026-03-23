import {
	ChevronLeft,
	ChevronRight,
	FileText,
	Loader2,
	Maximize2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { cn } from "../lib/utils";
import { getDocumentUrl } from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 550;

interface MultiDocViewerProps {
	documents: Document[];
	activeDocumentId?: string;
	onDocumentChange?: (documentId: string) => void;
	highlightPage?: number;
	onCitationNavigate?: (docId: string, page: number) => void;
}

export function MultiDocViewer({
	documents,
	activeDocumentId,
	onDocumentChange,
	// highlightPage,
}: MultiDocViewerProps) {
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
	const [numPages, setNumPages] = useState<Record<string, number>>({});
	const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
	const [pdfError, setPdfError] = useState<Record<string, string>>({});
	const containerRef = useRef<HTMLDivElement>(null);

	const activeDoc = documents.find((d) => d.id === activeDocumentId) || documents[0];

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

	const pdfPageWidth = width - 64;

	if (documents.length === 0) {
		return (
			<div
				style={{ width }}
				className="flex h-full flex-shrink-0 flex-col items-center justify-center border-l border-neutral-200 bg-gradient-to-br from-neutral-50 to-white"
			>
				<div className="rounded-full bg-gradient-to-br from-brand-100 to-brand-200 p-4 shadow-soft-lg">
					<FileText className="h-12 w-12 text-brand-600" />
				</div>
				<p className="mt-4 text-sm font-medium text-neutral-700">No documents uploaded</p>
				<p className="mt-1 text-xs text-neutral-500">Upload documents to view them here</p>
			</div>
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

			{/* Document Tabs */}
			{documents.length > 1 && (
				<div className="border-b border-neutral-100 bg-neutral-50">
					<ScrollArea className="w-full">
						<div className="flex gap-1 p-2">
							{documents.map((doc) => (
								<button
									key={doc.id}
									type="button"
									onClick={() => onDocumentChange?.(doc.id)}
									className={cn(
										"flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
										activeDoc?.id === doc.id
											? "bg-white shadow-soft border border-brand-200 text-brand-700"
											: "bg-neutral-100 text-neutral-600 hover:bg-white hover:text-neutral-900",
									)}
								>
									<FileText className="h-3.5 w-3.5 flex-shrink-0" />
									<span className="max-w-[150px] truncate">{doc.filename}</span>
								</button>
							))}
						</div>
					</ScrollArea>
				</div>
			)}

			{/* Header */}
			<div className="border-b border-neutral-100 bg-gradient-to-r from-white to-neutral-50 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 flex-shrink-0 text-brand-600" />
							<p className="truncate text-sm font-semibold text-neutral-900">
								{activeDoc?.filename || "Document"}
							</p>
						</div>
						<p className="mt-0.5 text-xs text-neutral-500">
							{activeDoc?.page_count || 0} page{activeDoc?.page_count !== 1 ? "s" : ""}
						</p>
					</div>
					<Button variant="ghost" size="sm" className="h-7 flex-shrink-0">
						<Maximize2 className="h-3.5 w-3.5" />
					</Button>
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
						file={getDocumentUrl(activeDoc.id)}
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
										Loading document...
									</p>
								</div>
							</div>
						}
					>
						{!pdfLoading[activeDoc.id] && !pdfError[activeDoc.id] && (
							<div className="overflow-hidden rounded-lg border border-neutral-200 shadow-soft">
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
		</div>
	);
}
