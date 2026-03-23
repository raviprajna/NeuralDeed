import { FileText } from "lucide-react";
import type { Citation } from "../types";

interface InlineCitationTextProps {
	content: string;
	citations: Citation[];
	onCitationClick?: (page: number, documentId?: string, extractedText?: string) => void;
}

/**
 * Renders text with inline citation superscripts like Perplexity
 * Citations appear as [1], [2], etc. inline within the text
 */
export function InlineCitationText({ content, citations, onCitationClick }: InlineCitationTextProps) {
	if (!citations || citations.length === 0) {
		return <div className="prose prose-sm max-w-none">{content}</div>;
	}

	// Split content by paragraphs
	const paragraphs = content.split('\n\n');

	return (
		<div className="prose prose-sm max-w-none">
			{paragraphs.map((para, paraIdx) => {
				if (!para.trim()) return null;

				// For now, we'll add citations at the end of each paragraph
				// In the future, we can use NLP to determine the best placement
				const citationsForPara = citations.slice(
					Math.floor((paraIdx / paragraphs.length) * citations.length),
					Math.floor(((paraIdx + 1) / paragraphs.length) * citations.length)
				);

				return (
					<p key={paraIdx} className="mb-4 leading-relaxed">
						{para}
						{citationsForPara.length > 0 && (
							<>
								{citationsForPara.map((citation, idx) => {
									const citationNumber = citations.indexOf(citation) + 1;
									return (
										<button
											key={idx}
											type="button"
											onClick={() => {
												console.log('[Citation Click]', {
													page: citation.page_number,
													docId: citation.document_id,
													docName: citation.document_name,
													extractedText: citation.extracted_text
												});
												onCitationClick?.(citation.page_number, citation.document_id, citation.extracted_text);
											}}
											className="group relative ml-0.5 inline-flex items-center align-super text-[10px] font-medium text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
											title={`${citation.document_name} - Page ${citation.page_number}`}
										>
											[{citationNumber}]

											{/* Hover tooltip */}
											<div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg z-50 group-hover:block" style={{width: "280px"}}>
												<div className="flex items-center gap-2 mb-2">
													<FileText className="h-3 w-3 text-neutral-400" />
													<p className="text-[10px] text-neutral-400 font-medium truncate">{citation.document_name}</p>
												</div>
												<p className="text-xs text-neutral-300 mb-1">Page {citation.page_number}</p>
												<p className="text-xs leading-relaxed text-neutral-200 line-clamp-3">{citation.extracted_text}</p>
												<div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900" />
											</div>
										</button>
									);
								})}
							</>
						)}
					</p>
				);
			})}

			{/* Citation references at the bottom */}
			{citations.length > 0 && (
				<div className="mt-6 pt-4 border-t border-neutral-200">
					<h4 className="text-xs font-semibold text-neutral-600 mb-3">References</h4>
					<div className="space-y-2">
						{citations.map((citation, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => onCitationClick?.(citation.page_number, citation.document_id, citation.extracted_text)}
								className="group flex items-start gap-2 text-left w-full p-2 rounded-lg hover:bg-neutral-50 transition-colors"
							>
								<span className="text-xs font-medium text-brand-600 flex-shrink-0 mt-0.5">[{idx + 1}]</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<FileText className="h-3 w-3 text-neutral-400 flex-shrink-0" />
										<p className="text-xs font-medium text-neutral-700 truncate">{citation.document_name}</p>
										<span className="text-[10px] text-neutral-500">Page {citation.page_number}</span>
									</div>
									<p className="text-xs text-neutral-600 line-clamp-2">{citation.extracted_text}</p>
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
