/** Reads a `text/event-stream` body and calls `onEvent` once per complete frame. */
export async function readSse(
	body: ReadableStream<Uint8Array>,
	onEvent: (event: string, data: unknown) => void,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const flush = (frame: string) => {
		let event = "message";
		const data: string[] = [];
		for (const line of frame.split("\n")) {
			if (line.startsWith("event:")) event = line.slice(6).trim();
			else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
		}
		if (data.length) onEvent(event, JSON.parse(data.join("\n")));
	};
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
		let cut = buffer.indexOf("\n\n");
		while (cut >= 0) {
			flush(buffer.slice(0, cut));
			buffer = buffer.slice(cut + 2);
			cut = buffer.indexOf("\n\n");
		}
	}
	if (buffer.trim()) flush(buffer);
}
