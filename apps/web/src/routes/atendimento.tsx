import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ENV } from "@/env.public";
import { createChatApi } from "@/features/chat/api";
import { ChatScreen } from "@/features/chat/chat-screen";
import { EmployeeFrame } from "@/features/shell/employee-frame";

export const Route = createFileRoute("/atendimento")({
	component: AtendimentoRoute,
});

/** The employee conversation (CHAT-01). */
function AtendimentoRoute() {
	const api = useMemo(() => createChatApi(ENV.VITE_SERVER_URL), []);
	return (
		<ChatScreen
			api={api}
			frame={(aside, body) => (
				<EmployeeFrame active="atendimento" here="Atendimento" aside={aside}>
					{body}
				</EmployeeFrame>
			)}
		/>
	);
}
