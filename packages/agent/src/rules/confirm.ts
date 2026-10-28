const CONFIRMATIONS = new Set([
	"sim",
	"s",
	"ok",
	"pode",
	"pode sim",
	"pode criar",
	"pode abrir",
	"pode mandar",
	"pode seguir",
	"confirmo",
	"confirmar",
	"confirma",
	"isso",
	"isso mesmo",
	"sim pode criar",
	"sim pode",
	"sim por favor",
	"manda",
	"beleza",
]);

function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** A short yes counts as Confirmar; anything with more to say does not (AGT-32). */
export function isTextConfirmation(text: string): boolean {
	return CONFIRMATIONS.has(normalize(text));
}
