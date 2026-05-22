import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  buildAccountVerificationEmail,
  buildEmailVerificationRedirectUrl,
  buildSignupVerificationLinkParams,
} = jiti("../src/lib/auth/verification-email.ts");

test("buildEmailVerificationRedirectUrl sends verified users to welcome", () => {
  assert.equal(
    buildEmailVerificationRedirectUrl("https://app.flightlyceum.com/"),
    "https://app.flightlyceum.com/auth/callback?next=%2Fwelcome",
  );
});

test("buildSignupVerificationLinkParams creates unconfirmed signup link params", () => {
  assert.deepEqual(
    buildSignupVerificationLinkParams({
      email: "admin@school.test",
      password: "secret-password",
      redirectTo: "https://app.flightlyceum.com/auth/callback?next=%2Fwelcome",
      metadata: {
        display_name: "Alex Admin",
        school_name: "Nordic Flight Academy",
      },
    }),
    {
      type: "signup",
      email: "admin@school.test",
      password: "secret-password",
      options: {
        redirectTo: "https://app.flightlyceum.com/auth/callback?next=%2Fwelcome",
        data: {
          display_name: "Alex Admin",
          school_name: "Nordic Flight Academy",
        },
      },
    },
  );
});

test("buildAccountVerificationEmail includes welcome link and school context", () => {
  const email = buildAccountVerificationEmail({
    actionLink: "https://supabase.test/auth/v1/verify?token=abc",
    adminName: "Alex Admin",
    schoolName: "Nordic Flight Academy",
  });

  assert.equal(email.subject, "Verify your Flight Lyceum account");
  assert.match(email.text, /Nordic Flight Academy/);
  assert.match(email.text, /https:\/\/supabase\.test\/auth\/v1\/verify\?token=abc/);
  assert.match(email.html, /Verify account/);
  assert.match(email.html, /Nordic Flight Academy/);
});
