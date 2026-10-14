/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off by default. To enable: set `emailAndPasswordEnabled` to `true` below,
 * then build sign-up / sign-in forms with `authClient.signUp.email` /
 * `authClient.signIn.email` from `@/lib/auth/client` (see the auth skill).
 *
 * Password-reset support is configured here and consumed by the single spread
 * in server.ts so the existing auth architecture stays intact.
 */
export const emailAndPasswordEnabled = true;

/**
 * Better Auth emailAndPassword options.
 * sendResetPassword is required for the forget-password flow. Without an
 * external mail provider we log the reset URL (visible in server / Termux
 * logs) so the flow is fully testable. If RESEND_API_KEY + RESEND_FROM are
 * set, a real email is sent instead — no credentials are invented.
 */
export const emailAndPasswordOptions = {
  enabled: true as const,
  sendResetPassword: async ({
    user,
    url,
  }: {
    user: { email: string; name?: string | null };
    url: string;
    token: string;
  }) => {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const from =
      process.env.RESEND_FROM?.trim() ||
      "NextStep Coding <noreply@nextstep.local>";

    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: user.email,
            subject: "Reset your NextStep Coding password",
            html: `<p>Hi${user.name ? ` ${user.name}` : ""},</p>
<p>You requested a password reset for your NextStep Coding account.</p>
<p><a href="${url}">Click here to set a new password</a></p>
<p>This link expires soon. If you did not request it, you can ignore this email.</p>
<p>— NextStep Coding</p>`,
          }),
        });
        if (!res.ok) {
          console.error(
            "[auth] Resend password-reset email failed:",
            await res.text(),
          );
        }
        return;
      } catch (err) {
        console.error("[auth] Resend password-reset error:", err);
      }
    }

    // Development / Termux / no mail provider: log the link so the flow works.
    console.info(
      `[auth] Password reset for ${user.email}:\n  ${url}\n(Open this URL to complete the reset. Configure RESEND_API_KEY + RESEND_FROM for real email.)`,
    );
  },
};
