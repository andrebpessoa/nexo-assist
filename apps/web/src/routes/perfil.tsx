import { createFileRoute, useRouteContext } from "@tanstack/react-router";

import { ProfilePage } from "@/features/profile/profile-page";
import { EmployeeFrame } from "@/features/shell/employee-frame";

export const Route = createFileRoute("/perfil")({
	component: PerfilRoute,
});

function PerfilRoute() {
	const { me } = useRouteContext({ from: "__root__" });
	if (!me) return null;
	return (
		<EmployeeFrame active="perfil" here="Meu perfil">
			<ProfilePage me={me} />
		</EmployeeFrame>
	);
}
