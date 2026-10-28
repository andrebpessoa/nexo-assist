import { describe, expect, test } from "bun:test";

import { afterLogin, resolveAccess } from "./access";

describe("resolveAccess", () => {
	test("no session goes to login, keeping the route asked for", () => {
		expect(resolveAccess(null, "/atendimento")).toBe(
			"/login?redirect=%2Fatendimento",
		);
		expect(resolveAccess(null, "/console")).toBe("/login?redirect=%2Fconsole");
		expect(resolveAccess(null, "/perfil")).toBe("/login?redirect=%2Fperfil");
		expect(resolveAccess(null, "/")).toBe("/login");
		expect(resolveAccess(null, "/login")).toBeNull();
	});

	test("role areas: each role stays in its own area", () => {
		expect(resolveAccess("employee", "/console")).toBe("/atendimento");
		expect(resolveAccess("employee", "/console/INC-1")).toBe("/atendimento");
		expect(resolveAccess("employee", "/atendimento")).toBeNull();
		expect(resolveAccess("employee", "/perfil")).toBeNull();
		expect(resolveAccess("analyst", "/atendimento")).toBe("/console");
		expect(resolveAccess("analyst", "/perfil")).toBe("/console");
		expect(resolveAccess("analyst", "/console")).toBeNull();
	});

	test("role areas: a signed-in user leaves login and the root", () => {
		expect(resolveAccess("employee", "/login")).toBe("/atendimento");
		expect(resolveAccess("employee", "/")).toBe("/atendimento");
		expect(resolveAccess("analyst", "/login")).toBe("/console");
		expect(resolveAccess("analyst", "/")).toBe("/console");
	});

	test("after login returns to the route asked for only when it is the role's area", () => {
		expect(afterLogin("employee", "/perfil")).toBe("/perfil");
		expect(afterLogin("employee", "/console")).toBe("/atendimento");
		expect(afterLogin("analyst", "/console")).toBe("/console");
		expect(afterLogin("analyst", undefined)).toBe("/console");
		expect(afterLogin("employee", "https://evil.example/x")).toBe(
			"/atendimento",
		);
		expect(afterLogin("employee", "//evil.example")).toBe("/atendimento");
	});
});
