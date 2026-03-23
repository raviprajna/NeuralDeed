import { Folder, SendHorizontal } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled: boolean;
	hasDocument: boolean;
	onOpenLibrary?: () => void;
}

export function ChatInput({
	onSend,
	disabled,
	hasDocument,
	onOpenLibrary,
}: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setValue("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const handleInput = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		const newHeight = Math.min(textarea.scrollHeight, 300);
		textarea.style.height = `${newHeight}px`;
	}, []);

	return (
		<div className="p-4 bg-transparent">
			<div className="mx-auto max-w-3xl">
				<div className="flex items-end gap-3 rounded-[28px] border-2 border-brand-400 bg-white px-5 py-4 shadow-lg hover:shadow-xl transition-all">
					<Tooltip>
						<TooltipTrigger asChild>
							<div>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 flex-shrink-0 rounded-full hover:bg-neutral-100"
									onClick={onOpenLibrary}
								>
									<Folder className="h-5 w-5 text-neutral-600" />
								</Button>
							</div>
						</TooltipTrigger>
						<TooltipContent side="top">Open document library</TooltipContent>
					</Tooltip>

					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onInput={handleInput}
						onKeyDown={handleKeyDown}
						placeholder={hasDocument ? "Ask about your real estate documents..." : "Link or upload documents to start asking questions"}
						rows={3}
						className="max-h-[300px] min-h-[72px] flex-1 resize-none bg-transparent border-none py-2 text-[15px] leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
						style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
						disabled={disabled || !hasDocument}
					/>

					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 flex-shrink-0 rounded-full hover:bg-brand-100 disabled:opacity-40"
						disabled={!value.trim() || disabled}
						onClick={handleSend}
					>
						<SendHorizontal
							className={`h-5 w-5 ${
								value.trim() && !disabled
									? "text-brand-600"
									: "text-neutral-300"
							}`}
						/>
					</Button>
				</div>
			</div>
		</div>
	);
}
