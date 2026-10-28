import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	return <main className="font-display p-8 text-3xl">Entrar</main>;
}
