import { createFileRoute } from "@tanstack/react-router";

import { EmployeeFrame } from "@/features/shell/employee-frame";

export const Route = createFileRoute("/atendimento")({
	component: AtendimentoRoute,
});

/** Placeholder until `chat-funcionario` brings the conversation. */
function AtendimentoRoute() {
	return (
		<EmployeeFrame active="atendimento" here="Atendimento">
			<div className="mx-auto max-w-[540px] px-6 py-12">
				<h1 className="text-ink text-[22px] font-semibold">Atendimento</h1>
				<p className="text-ink-3 mt-1 text-[13px]">
					A conversa com o assistente chega na próxima entrega.
				</p>
			</div>
		</EmployeeFrame>
	);
}
