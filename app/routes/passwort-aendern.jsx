import AuthFrame from "../components/AuthFrame.jsx";
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
  const actionData = useActionData();
  const busy = useNavigation().state === "submitting";
  const en = locale === "en";
  const forced = Boolean(user.mustResetPassword);
  return (
    <AuthFrame locale={locale} title={en ? "Change password." : "Passwort ändern."}
      description={forced
        ? (en ? "Please choose a new password before continuing." : "Bitte vergeben Sie ein neues Passwort, bevor Sie fortfahren.")
        : (en ? "Update the password for your company account." : "Ändern Sie das Passwort für Ihr Firmenkonto.")}>
      {forced && <div className="lmb-auth-warning" role="status">{en ? "Your temporary password must be replaced." : "Ihr temporäres Passwort muss aus Sicherheitsgründen ersetzt werden."}</div>}
      {actionData?.message && <div role="alert" className="lmb-auth-notice">{actionData.message}</div>}
      <Form method="post" className="lmb-auth-form">
        {!forced && <div className="lmb-auth-field">
          <label htmlFor="change-current-password">{en ? "Current password" : "Aktuelles Passwort"}</label>
          <input className="lmb-auth-input" type="password" name="currentPassword" id="change-current-password" autoComplete="current-password" required />
        </div>}
        <div className="lmb-auth-field">
          <label htmlFor="change-new-password">{en ? "New password" : "Neues Passwort"}</label>
          <input className="lmb-auth-input" type="password" name="newPassword" id="change-new-password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="lmb-auth-field">
          <label htmlFor="change-confirm-password">{en ? "Confirm password" : "Passwort bestätigen"}</label>
          <input className="lmb-auth-input" type="password" name="confirmPassword" id="change-confirm-password" autoComplete="new-password" minLength={8} required />
        </div>
        <button className="lmb-auth-submit" type="submit" disabled={busy}>{busy ? (en ? "Saving …" : "Wird gespeichert …") : (en ? "Save new password" : "Neues Passwort speichern")}</button>
      </Form>
      {!forced && <div className="lmb-auth-links">
        <a href={withLang(user.isAdmin ? "/admin" : "/dashboard", locale)}>{en ? "Back to account" : "Zurück zum Konto"}</a>
      </div>}
    </AuthFrame>
  );
}
