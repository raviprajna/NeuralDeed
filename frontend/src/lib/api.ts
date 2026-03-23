import type {
	Conversation,
	ConversationDetail,
	Document,
	Message,
} from "../types";

const BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const text = await response.text().catch(() => "Unknown error");
		throw new Error(`API error ${response.status}: ${text}`);
	}
	return response.json() as Promise<T>;
}

export async function fetchConversations(): Promise<Conversation[]> {
	const res = await fetch(`${BASE}/conversations`);
	return handleResponse<Conversation[]>(res);
}

export async function createConversation(): Promise<Conversation> {
	const res = await fetch(`${BASE}/conversations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title: "New conversation" }),
	});
	return handleResponse<Conversation>(res);
}

export async function deleteConversation(id: string): Promise<void> {
	const res = await fetch(`${BASE}/conversations/${id}`, {
		method: "DELETE",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "Unknown error");
		throw new Error(`API error ${res.status}: ${text}`);
	}
}

export async function fetchConversation(
	id: string,
): Promise<ConversationDetail> {
	const res = await fetch(`${BASE}/conversations/${id}`);
	return handleResponse<ConversationDetail>(res);
}

export async function fetchMessages(
	conversationId: string,
): Promise<Message[]> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`);
	return handleResponse<Message[]>(res);
}

export async function sendMessage(
	conversationId: string,
	content: string,
): Promise<Response> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "Unknown error");
		throw new Error(`API error ${res.status}: ${text}`);
	}
	return res;
}

export async function uploadDocument(
	conversationId: string,
	file: File,
): Promise<Document> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(`${BASE}/conversations/${conversationId}/documents`, {
		method: "POST",
		body: formData,
	});
	return handleResponse<Document>(res);
}

export function getDocumentUrl(documentId: string): string {
	return `${BASE}/documents/${documentId}/content`;
}

export async function fetchLibraryDocuments(): Promise<Document[]> {
	const res = await fetch(`${BASE}/library/documents`);
	return handleResponse<Document[]>(res);
}

export async function fetchConversationDocuments(
	conversationId: string,
): Promise<Document[]> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/documents`);
	return handleResponse<Document[]>(res);
}

export async function deleteDocument(documentId: string): Promise<void> {
	const res = await fetch(`${BASE}/documents/${documentId}`, {
		method: "DELETE",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "Unknown error");
		throw new Error(`API error ${res.status}: ${text}`);
	}
}

export async function linkDocumentToConversation(
	conversationId: string,
	documentId: string,
): Promise<Document> {
	const res = await fetch(
		`${BASE}/conversations/${conversationId}/link-document/${documentId}`,
		{
			method: "POST",
		},
	);
	return handleResponse<Document>(res);
}

export async function addDocumentToLibrary(documentId: string): Promise<Document> {
	const res = await fetch(`${BASE}/documents/${documentId}/add-to-library`, {
		method: "POST",
	});
	return handleResponse<Document>(res);
}

export async function uploadToLibrary(file: File): Promise<Document> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(`${BASE}/library/documents`, {
		method: "POST",
		body: formData,
	});
	return handleResponse<Document>(res);
}

export interface SearchResult {
	document_id: string;
	document_name: string;
	page_number: number;
	match_text: string;
	position: number;
}

export async function searchDocuments(
	conversationId: string,
	query: string,
): Promise<SearchResult[]> {
	const res = await fetch(
		`${BASE}/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`,
	);
	return handleResponse<SearchResult[]>(res);
}
