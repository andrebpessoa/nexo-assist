import { KeyRound, LockKeyhole, Mail, MailCheck } from "lucide-react";
import { useState } from "react";

export type ProfileData = {
	name: string;
	email: string;
	passwordAgeDays: number | null;
};

/** "Alterada há N dias" from `profile.passwordChangedAt` (AUTH-19). */
export function passwordAgeLabel(days: number | null) {
	if (days === null) return "Sem registro de alteração";
	if (days === 0) return "Alterada hoje";
	return `Alterada há ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** "Meu perfil" from `captures/06-cliente-meu-perfil.png` (AUTH-17, AUTH-19, AUTH-20). */
export function ProfilePage({ me }: { me: ProfileData }) {
	const [resetSent, setResetSent] = useState(false);
	return (
		<div className="mx-auto w-full max-w-[540px] px-6 py-12">
			<h1 className="text-ink text-[22px] font-semibold">Meu perfil</h1>
			<p className="text-ink-3 mt-1 text-[13px]">
				Seus dados de acesso ao service desk de TI.
			</p>
			<dl className="divide-rule border-rule bg-paper mt-6 divide-y rounded-[14px] border shadow-xs">
				<div className="flex items-center px-5 py-4 text-[13px]">
					<dt className="text-ink-3 w-[150px]">Nome</dt>
					<dd className="text-ink font-medium">{me.name}</dd>
				</div>
				<div className="flex items-center px-5 py-4 text-[13px]">
					<dt className="text-ink-3 w-[150px]">E-mail corporativo</dt>
					<dd className="flex flex-1 items-center justify-between gap-3">
						<span className="text-ink font-medium">{me.email}</span>
						<span className="text-ink-3 flex items-center gap-1 text-[11px]">
							<LockKeyhole className="size-3" />
							<span>Gerenciado pela TI</span>
						</span>
					</dd>
				</div>
			</dl>
			<section className="border-rule bg-paper mt-6 overflow-hidden rounded-[14px] border shadow-xs">
				<div className="flex items-center gap-3 px-5 py-4">
					<span className="bg-desk text-ink-2 flex size-9 items-center justify-center rounded-full">
						<KeyRound className="size-4" />
					</span>
					<div className="flex-1">
						<h2 className="text-ink text-[13px] font-semibold">Senha</h2>
						<p className="text-ink-3 text-[12px]">
							{passwordAgeLabel(me.passwordAgeDays)}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setResetSent(true)}
						className="border-rule text-ink hover:bg-desk flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium"
					>
						<MailCheck className="size-3.5" />
						Redefinir senha
					</button>
				</div>
				<p
					role="status"
					className={`border-rule flex items-center gap-2 border-t px-5 py-2.5 text-[11px] ${resetSent ? "bg-cta-soft text-cta" : "bg-desk text-ink-3"}`}
				>
					<Mail className="size-3.5" />
					{resetSent
						? `Link enviado para ${me.email}. (Simulado: nenhum e-mail sai deste ambiente.)`
						: `Enviaremos um link de redefinição para ${me.email}.`}
				</p>
			</section>
		</div>
	);
}
