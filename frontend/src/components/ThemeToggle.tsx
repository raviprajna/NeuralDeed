import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function ThemeToggle() {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		// Check system preference or localStorage
		const stored = localStorage.getItem("theme");
		const systemPrefers = window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
		const initialTheme = (stored as "light" | "dark") || systemPrefers;

		setTheme(initialTheme);
		document.documentElement.classList.toggle("dark", initialTheme === "dark");
	}, []);

	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
		document.documentElement.classList.toggle("dark", newTheme === "dark");
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
			title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			{theme === "light" ? (
				<Moon className="h-4 w-4 text-neutral-600" />
			) : (
				<Sun className="h-4 w-4 text-neutral-400" />
			)}
		</Button>
	);
}
