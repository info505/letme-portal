import AuthLayout from "../components/AuthLayout.jsx";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  getUserFromRequest,
  hashPassword,
  verifyPassword,
} from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const freshUser = await prisma.portalUser.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
      companyName: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      mustResetPassword: true,
    },
  });

  if (!freshUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  return {
    locale,
    user: freshUser,
  };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const formData = await request.formData();

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const freshUser = await prisma.portalUser.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
      isAdmin: true,
      mustResetPassword: true,
    },
  });

  if (!freshUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  if (!newPassword || !confirmPassword) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Please enter and confirm your new password."
          : "Bitte gib dein neues Passwort ein und bestätige es.",
    };
  }

  if (newPassword.length < 8) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Your new password must be at least 8 characters long."
          : "Dein neues Passwort muss mindestens 8 Zeichen lang sein.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The passwords do not match."
          : "Die Passwörter stimmen nicht überein.",
    };
  }

  /*
    Wenn mustResetPassword aktiv ist, kommt der Kunde nach Admin-Reset hierher.
    Dann muss er sein altes Passwort nicht nochmal eingeben, weil er sich gerade
    mit dem temporären Passwort angemeldet hat.

    Wenn mustResetPassword NICHT aktiv ist, verlangen wir zur Sicherheit das aktuelle Passwort.
  */
  if (!freshUser.mustResetPassword) {
    if (!currentPassword) {
      return {
        ok: false,
        message:
          locale === "en"
            ? "Please enter your current password."
            : "Bitte gib dein aktuelles Passwort ein.",
      };
    }

    const currentPasswordOk = await verifyPassword(
      currentPassword,
      freshUser.passwordHash
    );

    if (!currentPasswordOk) {
      return {
        ok: false,
        message:
          locale === "en"
            ? "Your current password is incorrect."
            : "Dein aktuelles Passwort ist nicht korrekt.",
      };
    }
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.portalUser.update({
    where: { id: freshUser.id },
    data: {
      passwordHash,
      mustResetPassword: false,
    },
  });

  if (freshUser.isAdmin) {
    throw redirect(`/admin?lang=${locale}`);
  }

  throw redirect(`/dashboard?lang=${locale}`);
}

export default function ChangePasswordPage() {
  const { locale, user } = useLoaderData();
  const actionData = useActionData(), navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting", en = locale === "en";
  const forcedChange = Boolean(user.mustResetPassword);
  return <AuthLayout locale={locale} title={en ? "Change your password." : "Passwort ändern."} intro={forcedChange ? en ? "Please choose your own password before continuing." : "Bitte lege vor dem Fortfahren dein eigenes Passwort fest." : en ? "Keep your company account secure with a personal password." : "Schütze dein Firmenkonto mit einem persönlichen Passwort."}>
    {forcedChange && <p className="lmb-portal-alert" role="status">{en ? "You signed in with a temporary password." : "Du hast dich mit einem temporären Passwort angemeldet."}</p>}
    {actionData?.message && <p className="lmb-portal-alert is-error" role="alert">{actionData.message}</p>}
    <Form method="post" className="lmb-auth-form">
      {!forcedChange && <label className="lmb-portal-field"><span>{en ? "Current password" : "Aktuelles Passwort"}</span><input type="password" name="currentPassword" autoComplete="current-password" required /></label>}
      <label className="lmb-portal-field"><span>{en ? "New password" : "Neues Passwort"}</span><input type="password" name="newPassword" autoComplete="new-password" minLength={8} required /></label>
      <label className="lmb-portal-field"><span>{en ? "Confirm new password" : "Neues Passwort bestätigen"}</span><input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required /></label>
      <button type="submit" className="lmb-portal-button" disabled={isSubmitting}>{isSubmitting ? en ? "Saving…" : "Wird gespeichert…" : en ? "Save new password" : "Neues Passwort speichern"}</button>
    </Form>
    {!forcedChange && <p className="lmb-auth-back"><a href={withLang(user.isAdmin ? "/admin" : "/dashboard", locale)}>{en ? "Back to your account" : "Zurück zum Konto"}</a></p>}
  </AuthLayout>;
}
