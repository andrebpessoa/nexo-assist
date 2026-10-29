import {
	ArrowRight,
	Eye,
	EyeOff,
	Loader2,
	LockKeyhole,
	Mail,
	X,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { NexoLogo } from "@/features/brand/nexo-logo";

export type LoginValues = {
	email: string;
	password: string;
	rememberMe: boolean;
};

export type LoginOutcome =
	| { ok: true }
	| { ok: false; error: "EMAIL_NOT_FOUND" | "UNKNOWN" };

type FieldErrors = { email?: string; password?: string };

const LOGIN_TEXT = {
	emailNotFound:
		"Não encontramos esse e-mail. Use seu e-mail corporativo da Nexo.",
	emailRequired: "Digite seu e-mail corporativo.",
	emailInvalid: "Digite um e-mail válido.",
	passwordRequired: "Digite sua senha.",
	serverError: "Não foi possível entrar agora. Tente de novo.",
	forgot:
		"Neste ambiente qualquer senha entra. Em produção, enviaríamos um link para o seu e-mail.",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field checks before sending (AUTH-07). */
function validateLogin(values: LoginValues): FieldErrors {
	const errors: FieldErrors = {};
	const email = values.email.trim();
	if (email === "") errors.email = LOGIN_TEXT.emailRequired;
	else if (!EMAIL_RE.test(email)) errors.email = LOGIN_TEXT.emailInvalid;
	if (values.password.trim() === "")
		errors.password = LOGIN_TEXT.passwordRequired;
	return errors;
}

/**
 * Login screen from `captures/01-login.png` (AUTH-01, AUTH-02, AUTH-06 to AUTH-13). Presentational:
 * the route passes `onSubmit`, which calls the seed login and navigates.
 */
export function LoginPage({
	onSubmit,
}: {
	onSubmit: (values: LoginValues) => Promise<LoginOutcome>;
}) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [forgotOpen, setForgotOpen] = useState(false);
	const [privacyOpen, setPrivacyOpen] = useState(false);
	const id = useId();
	const emailErrorId = `${id}-email-error`;
	const passwordErrorId = `${id}-password-error`;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const values = { email, password, rememberMe };
		const found = validateLogin(values);
		setErrors(found);
		setFormError(null);
		if (found.email || found.password) return;
		setPending(true);
		try {
			const outcome = await onSubmit(values);
			if (!outcome.ok) {
				if (outcome.error === "EMAIL_NOT_FOUND") {
					setErrors({ email: LOGIN_TEXT.emailNotFound });
				} else {
					setFormError(LOGIN_TEXT.serverError);
				}
			}
		} catch {
			setFormError(LOGIN_TEXT.serverError);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="bg-paper grid min-h-svh grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
			<Showcase />
			<section className="flex min-h-svh flex-col px-8 py-7">
				<p className="text-ink-3 text-right text-xs">
					Problema para entrar?{" "}
					<span className="text-cta font-medium">Ligue no ramal 4000</span>
				</p>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-[340px]">
						<h1 className="font-display text-ink text-[32px] leading-tight">
							Entrar
						</h1>
						<p className="text-ink-3 mt-2 text-sm">
							Use seu e-mail corporativo e a senha da rede Nexo.
						</p>
						<form noValidate onSubmit={handleSubmit} className="mt-7 space-y-5">
							<div className="space-y-2">
								<label
									htmlFor={`${id}-email`}
									className="text-ink block text-xs font-medium"
								>
									E-mail corporativo
								</label>
								<div className="relative">
									<Mail className="text-ink-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
									<input
										id={`${id}-email`}
										type="email"
										autoComplete="username"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										aria-invalid={errors.email ? true : undefined}
										aria-describedby={errors.email ? emailErrorId : undefined}
										className="border-rule bg-paper text-ink focus:border-cta focus:ring-cta/15 h-11 w-full rounded-[10px] border pr-3 pl-9 text-sm outline-none focus:ring-2 aria-invalid:border-red-600"
									/>
								</div>
								{errors.email && (
									<p id={emailErrorId} className="text-xs text-red-700">
										{errors.email}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label
										htmlFor={`${id}-password`}
										className="text-ink text-xs font-medium"
									>
										Senha
									</label>
									<button
										type="button"
										onClick={() => setForgotOpen(true)}
										className="text-cta text-xs font-medium hover:underline"
									>
										Esqueci minha senha
									</button>
								</div>
								<div className="relative">
									<LockKeyhole className="text-ink-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
									<input
										id={`${id}-password`}
										type={showPassword ? "text" : "password"}
										autoComplete="current-password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										aria-invalid={errors.password ? true : undefined}
										aria-describedby={
											errors.password ? passwordErrorId : undefined
										}
										className="border-rule bg-paper text-ink focus:border-cta focus:ring-cta/15 h-11 w-full rounded-[10px] border pr-10 pl-9 text-sm outline-none focus:ring-2 aria-invalid:border-red-600"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((shown) => !shown)}
										aria-label={
											showPassword ? "Esconder senha" : "Mostrar senha"
										}
										className="text-ink-3 hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
									>
										{showPassword ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</button>
								</div>
								{errors.password && (
									<p id={passwordErrorId} className="text-xs text-red-700">
										{errors.password}
									</p>
								)}
								{forgotOpen && (
									<p
										role="status"
										className="bg-desk text-ink-2 rounded-[10px] px-3 py-2 text-xs"
									>
										{LOGIN_TEXT.forgot}
									</p>
								)}
							</div>
							<label className="text-ink-2 flex items-center gap-2 text-xs">
								<input
									type="checkbox"
									checked={rememberMe}
									onChange={(event) => setRememberMe(event.target.checked)}
									className="accent-cta size-4"
								/>
								Manter conectado neste computador
							</label>
							{formError && (
								<p
									role="alert"
									className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
								>
									{formError}
								</p>
							)}
							<button
								type="submit"
								disabled={pending}
								aria-busy={pending}
								className="bg-cta flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#00539f] disabled:cursor-wait disabled:opacity-80"
							>
								{pending && (
									<Loader2
										data-testid="login-spinner"
										className="size-4 animate-spin"
									/>
								)}
								Entrar
								{!pending && <ArrowRight className="size-4" />}
							</button>
						</form>
						<hr className="border-rule mt-6" />
					</div>
				</div>
				<footer className="text-ink-3 flex items-center justify-between text-[11px]">
					<span>© 2026 Nexo · Service desk de TI</span>
					<button
						type="button"
						onClick={() => setPrivacyOpen(true)}
						className="hover:text-ink"
					>
						Privacidade e uso de dados
					</button>
				</footer>
			</section>
			{privacyOpen && <PrivacyDialog onClose={() => setPrivacyOpen(false)} />}
		</div>
	);
}

function Showcase() {
	return (
		<aside className="bg-showcase hidden min-h-svh flex-col px-11 py-8 text-white lg:flex">
			<NexoLogo tone="light" />
			<div className="mt-auto max-w-[660px]">
				<p className="text-[11px] text-white/60">Service desk de TI da Nexo</p>
				<h2 className="font-display mt-3 max-w-[640px] text-[46px] leading-[1.15]">
					Seu problema de TI, resolvido em uma conversa.
				</h2>
				<p className="mt-4 max-w-[540px] text-sm leading-relaxed text-white/70">
					Descreva o que está acontecendo. O assistente consulta seus chamados,
					busca na central de ajuda e chama um analista quando precisa.
				</p>
			</div>
			<div className="mx-auto mt-8 w-full max-w-[500px] rounded-[14px] border border-white/10 bg-white/5 p-3 text-xs">
				<p className="text-ink ml-auto w-fit rounded-[10px] bg-white px-3 py-2">
					Meu notebook não conecta na VPN. Erro 809.
				</p>
				<p className="mt-3 text-[11px] text-white/50">
					<span className="font-semibold text-white">Nexo Assist</span>{" "}
					consultou seus chamados · criou um chamado
				</p>
				<p className="mt-1 max-w-[270px] rounded-[10px] bg-white/10 px-3 py-2 text-white/90">
					Pronto: abri o chamado com prioridade alta. Um analista fala com você
					em até 4 h úteis.
				</p>
				<p className="text-ink mt-2 flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px]">
					<span className="size-1.5 rounded-full bg-amber-500" />
					<span className="font-data font-medium">INC-20517</span>
					<span className="text-ink-3">Rede e VPN · Alta · em até 4 h</span>
				</p>
			</div>
			<dl className="mt-auto grid grid-cols-3 border-t border-white/15 pt-4">
				<Stat number="8 s" label="primeira resposta, em média" />
				<Stat number="72%" label="resolvidos sem fila" />
				<Stat number="6" label="analistas online agora" live />
			</dl>
		</aside>
	);
}

function Stat({
	number,
	label,
	live = false,
}: {
	number: string;
	label: string;
	live?: boolean;
}) {
	return (
		<div className="border-l border-white/15 pl-4 first:border-l-0 first:pl-0">
			<dd className="font-display flex items-center gap-1.5 text-2xl">
				<span>{number}</span>
				{live && <span className="size-1.5 rounded-full bg-emerald-400" />}
			</dd>
			<dt className="mt-1 text-[11px] text-white/55">{label}</dt>
		</div>
	);
}

function PrivacyDialog({ onClose }: { onClose: () => void }) {
	const titleId = useId();
	return (
		<div className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="bg-paper w-full max-w-sm rounded-[14px] p-5 shadow-xl"
			>
				<div className="flex items-start justify-between gap-4">
					<h2 id={titleId} className="text-ink font-semibold">
						Privacidade e uso de dados
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fechar"
						className="text-ink-3 hover:text-ink rounded p-1"
					>
						<X className="size-4" />
					</button>
				</div>
				<p className="text-ink-2 mt-3 text-sm leading-relaxed">
					Cada funcionário vê só os próprios chamados. As conversas com o
					assistente ficam guardadas no chamado para o analista da TI que atende
					você.
				</p>
			</div>
		</div>
	);
}
