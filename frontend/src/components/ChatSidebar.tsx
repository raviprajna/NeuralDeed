import { AnimatePresence, motion } from "framer-motion";
import { Brain, Folder, MessageSquarePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { relativeTime } from "../lib/utils";
import type { Conversation } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface ChatSidebarProps {
	conversations: Conversation[];
	selectedId: string | null;
	loading: boolean;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
	onOpenLibrary?: () => void;
}

export function ChatSidebar({
	conversations,
	selectedId,
	loading,
	onSelect,
	onCreate,
	onDelete,
	onOpenLibrary,
}: ChatSidebarProps) {
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	return (
		<div className="flex h-full w-[250px] flex-shrink-0 flex-col border-r border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-100 p-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
						<Brain className="h-4 w-4 text-white" />
					</div>
					<span className="text-sm font-bold text-neutral-900">NeuralDeed</span>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" onClick={onOpenLibrary} title="Document library">
						<Folder className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" onClick={onCreate} title="New chat">
						<MessageSquarePlus className="h-4 w-4" />
					</Button>
				</div>
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
						{conversations.map((conversation) => (
							<motion.div
								key={conversation.id}
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.15 }}
							>
								<div
									className={`group relative flex w-full items-center rounded-lg px-3 py-2.5 transition-colors ${
										selectedId === conversation.id
											? "bg-neutral-100"
											: "hover:bg-neutral-50"
									}`}
									onMouseEnter={() => setHoveredId(conversation.id)}
									onMouseLeave={() => setHoveredId(null)}
								>
									<button
										type="button"
										className="absolute inset-0"
										onClick={() => onSelect(conversation.id)}
										aria-label={`Select conversation: ${conversation.title}`}
									/>
									<div className="relative z-0 min-w-0 overflow-hidden" style={{ width: 'calc(100% - 36px)' }}>
										<p className="truncate text-sm font-medium text-neutral-800 leading-tight" title={conversation.title}>
											{conversation.title.length > 20 ? `${conversation.title.slice(0, 20)}...` : conversation.title}
										</p>
										<p className="mt-0.5 truncate text-xs text-neutral-400">
											{relativeTime(conversation.updated_at)}
										</p>
									</div>

									<button
										type="button"
										className={`relative z-10 flex-shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 transition-all ${
											hoveredId === conversation.id ? 'opacity-100' : 'opacity-30'
										}`}
										style={{ width: '28px', height: '28px' }}
										onClick={(e) => {
											e.stopPropagation();
											onDelete(conversation.id);
										}}
										title="Delete conversation"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</ScrollArea>
		</div>
	);
}
