import { motion } from "framer-motion";
import { Bot, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import type { Citation, Message } from "../types";
import { InlineCitationText } from "./InlineCitationText";

interface MessageBubbleProps {
	message: Message;
	onCitationClick?: (page: number, documentId?: string, extractedText?: string) => void;
}

export function MessageBubble({ message, onCitationClick }: MessageBubbleProps) {
	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[75%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5">
					<p className="whitespace-pre-wrap text-sm text-neutral-800">
						{message.content}
					</p>
				</div>
			</motion.div>
		);
	}

	// Get confidence badge component
	const getConfidenceBadge = (confidence?: number) => {
		if (confidence === undefined || confidence === null) return null;

		let badgeClass = "";
		let label = "";

		if (confidence >= 90) {
			badgeClass = "bg-verified-100 text-verified-700 border border-verified-200";
			label = "High Confidence";
		} else if (confidence >= 70) {
			badgeClass = "bg-inferred-100 text-inferred-700 border border-inferred-200";
			label = "Medium Confidence";
		} else {
			badgeClass = "bg-uncertain-100 text-uncertain-700 border border-uncertain-200";
			label = "Low Confidence";
		}

		return (
			<div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
				<span className="text-[10px]">{confidence}%</span>
				<span>{label}</span>
			</div>
		);
	};

	// Assistant message
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 shadow-soft">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{/* Use inline citations if available, otherwise use default markdown */}
				{message.citations && message.citations.length > 0 ? (
					<InlineCitationText
						content={message.content}
						citations={message.citations}
						onCitationClick={onCitationClick}
					/>
				) : (
					<div className="prose prose-sm max-w-none">
						<Streamdown>{message.content}</Streamdown>
					</div>
				)}

				{/* Confidence badge */}
				{message.confidence !== undefined && (
					<div className="mt-3 flex flex-wrap items-center gap-2">
						{getConfidenceBadge(message.confidence)}
						{message.sources_cited > 0 && (
							<div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
								<FileText className="h-3 w-3" />
								<span>{message.sources_cited} source{message.sources_cited !== 1 ? "s" : ""}</span>
							</div>
						)}
					</div>
				)}
			</div>
		</motion.div>
	);
}

interface StreamingBubbleProps {
	content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
	return (
		<div className="flex gap-3 py-1.5">
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{content ? (
					<div className="prose">
						<Streamdown mode="streaming">{content}</Streamdown>
					</div>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
				<span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />
			</div>
		</div>
	);
}
