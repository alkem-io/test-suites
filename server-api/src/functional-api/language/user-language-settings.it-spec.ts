// Feature 029-detect-signup-language — the per-user language store itself.
//
// This is the "stored per user, not just per web client" half of
// alkem-io/alkemio#2017, and the server contract behind the client-web US1-AS2 /
// US1-AS3 (an accept or decline is RECORDED on the account) and US2 walks.
//
// The contract under test (user.settings.service.ts):
//   (a) any non-null language write also latches languageOfferAnswered = true;
//   (b) languageOfferAnswered = true WITHOUT a language is the decline path;
//   (c) languageOfferAnswered = false is rejected — the latch is one-way.
//
// Every test that writes gets its own throwaway account, so the file has no
// ordering dependencies and leaves no seeded persona in another language.
//
// mapping: client-web/src/functional-e2e/language-offer/language-offer-test-plan.md

import { TestUser, TestUserManager, UniqueIDGenerator } from '@alkemio/tests-lib';
// This file needs no scenario data (no space, no org), so it never calls
// TestScenarioFactory — which is what normally populates the user/token cache.
// It therefore primes the cache itself; the call is idempotent.
import { deleteUser } from '../contributor-management/user/user.request.params';
import {
  createUserWithEmail,
  getLanguageConfig,
  getUserLanguageSettings,
  updateUserLanguageSettings,
} from './language.request.params';

const uniqueId = UniqueIDGenerator.getID();

/**
 * `eligible` and `default` are different concepts, not the same value:
 *   eligible — the set the platform proactively detects, offers, and accepts as
 *              an invitation suggestion (empty = offers switched off);
 *   default  — the fallback shown when the user has expressed no preference.
 * On the current configuration they are also disjoint (eligible `['nl']`,
 * default `en`), but nothing enforces that — a config could make the default
 * eligible too.
 *
 * These walks therefore write an eligible language that is NOT the default
 * wherever one exists, so "the language was stored" stays distinguishable from
 * "the user is seeing the platform fallback".
 */
let eligibleLanguage = '';
let defaultLanguage = '';
/** True when the chosen language differs from the platform fallback. */
let languageIsDistinguishableFromDefault = false;

const createdUserIds: string[] = [];

/** A brand-new account with a clean language slate. */
const createThrowawayUser = async (label: string) => {
  const response = await createUserWithEmail(
    // RFC 2606 reserved TLD — never the real alkem.io domain, so registering a
    // throwaway account can't generate outbound mail or match a domain-joined org.
    `lang029-${label}-${uniqueId}@alkemio.test`,
    `Lang${label}`,
    `User${uniqueId}`
  );
  expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();
  const user = response.body.data.createUser;
  createdUserIds.push(user.id);
  return user;
};

const readSettings = async (userID: string) => {
  const response = await getUserLanguageSettings(userID);
  expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();
  return response.body.data.lookup.user.settings;
};

beforeAll(async () => {
  await TestUserManager.populateUserModelMap();

  const config = await getLanguageConfig();
  const language = config.body.data.platform.configuration.language;
  defaultLanguage = language.default;
  // Prefer an eligible language that is not the platform fallback.
  // `?? ''` guards the empty eligible set (R-8 kill switch) — see the walks
  // below, which skip themselves rather than sending an undefined language.
  eligibleLanguage =
    language.eligible.find((code: string) => code !== defaultLanguage) ?? language.eligible[0] ?? '';
  languageIsDistinguishableFromDefault = eligibleLanguage !== defaultLanguage;
});

afterAll(async () => {
  for (const id of createdUserIds) {
    await deleteUser(id);
  }
});

describe('029 — language is a per-user account setting', () => {
  // The state the one-time offer depends on: nothing chosen, nothing answered.
  test('a new account starts with no language and an unanswered offer', async () => {
    const user = await createThrowawayUser('fresh');

    expect(user.settings.language).toBeNull();
    expect(user.settings.languageOfferAnswered).toBe(false);
  });

  // US1-AS2 / US3 accept: recording a language also records that the offer was
  // answered, so it is never made twice.
  test('US1-AS2 — accepting: writing a language latches languageOfferAnswered', async ctx => {
    if (eligibleLanguage === '') {
      ctx.skip('no eligible languages configured — nothing to write (R-8 kill switch)');
    }
    const user = await createThrowawayUser('accept');

    const response = await updateUserLanguageSettings(user.id, { language: eligibleLanguage });
    expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();

    const settings = response.body.data.updateUserSettings.settings;
    expect(settings.language).toEqual(eligibleLanguage);
    expect(settings.languageOfferAnswered).toBe(true);
    // The stored value is a real choice, not the fallback the user would have
    // been shown anyway (skipped only if the platform offers nothing but its own
    // default, where the two are indistinguishable by construction).
    if (languageIsDistinguishableFromDefault) {
      expect(settings.language).not.toEqual(defaultLanguage);
    }

    // US2: the preference lives on the account, so any later session/device reads
    // the same value. (The browser-side half is the client-web US2 walks.)
    expect((await readSettings(user.id)).language).toEqual(eligibleLanguage);
  });

  // US1-AS3 / US3 decline: the answer is recorded WITHOUT choosing a language —
  // the user stays on the platform default and is not asked again.
  test('US1-AS3 — declining: the answer is recorded without setting a language', async () => {
    const user = await createThrowawayUser('decline');

    const response = await updateUserLanguageSettings(user.id, { languageOfferAnswered: true });
    expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();

    const settings = response.body.data.updateUserSettings.settings;
    expect(settings.languageOfferAnswered).toBe(true);
    expect(
      settings.language,
      'a decline must not choose a language — the user stays on the platform default'
    ).toBeNull();
  });

  // One-way latch: the offer cannot be re-armed, so a user who answered is never
  // re-offered (the invariant behind "one-time offer").
  test('languageOfferAnswered is a one-way latch — it cannot be set back to false', async ctx => {
    if (eligibleLanguage === '') {
      ctx.skip('no eligible languages configured — nothing to write (R-8 kill switch)');
    }
    const user = await createThrowawayUser('latch');
    await updateUserLanguageSettings(user.id, { language: eligibleLanguage });

    const response = await updateUserLanguageSettings(user.id, { languageOfferAnswered: false });
    expect(response.body.errors, 'setting the latch back to false must be rejected').toBeDefined();

    expect((await readSettings(user.id)).languageOfferAnswered).toBe(true);
  });

  // Documented no-op: `language: null` means "leave it alone", not "clear it".
  // Asserted explicitly so a future change to clearing semantics is caught here
  // rather than surfacing as a mysterious UI regression.
  test('language: null is a no-op — a stored language is not cleared', async ctx => {
    if (eligibleLanguage === '') {
      ctx.skip('no eligible languages configured — nothing to write (R-8 kill switch)');
    }
    const user = await createThrowawayUser('nullnoop');
    await updateUserLanguageSettings(user.id, { language: eligibleLanguage });

    const response = await updateUserLanguageSettings(user.id, { language: null });
    expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();

    expect(response.body.data.updateUserSettings.settings.language).toEqual(eligibleLanguage);
    expect((await readSettings(user.id)).language).toEqual(eligibleLanguage);
  });

  // Only supported interface languages may be stored.
  test('an unsupported language is rejected', async () => {
    const user = await createThrowawayUser('unsupported');

    const response = await updateUserLanguageSettings(user.id, { language: 'xx' });
    expect(response.body.errors, 'an unsupported language code must be rejected').toBeDefined();

    expect((await readSettings(user.id)).language).toBeNull();
  });

  // The platform default is what an un-answered user is shown; it must be a real
  // supported language, not empty.
  test('the platform default language is configured', async () => {
    expect(defaultLanguage).toBeTruthy();
  });

  // The setting is personal: another (non-admin) user must not be able to write it.
  test('a different user cannot write this account language', async ctx => {
    if (eligibleLanguage === '') {
      ctx.skip('no eligible languages configured — nothing to write (R-8 kill switch)');
    }
    const user = await createThrowawayUser('foreign');

    const response = await updateUserLanguageSettings(
      user.id,
      { language: eligibleLanguage },
      TestUser.NON_SPACE_MEMBER
    );
    expect(response.body.errors, "another user must not be able to set this account's language").toBeDefined();

    expect((await readSettings(user.id)).language).toBeNull();
  });

  // Sanity: the personas the client-web walks rely on are readable here too, so a
  // failure in those walks can be triaged against the stored value.
  test('a seeded persona exposes its language settings', async () => {
    const personaId = TestUserManager.getUserModelByType(TestUser.NON_SPACE_MEMBER).id;
    const settings = await readSettings(personaId);

    expect(settings).toHaveProperty('language');
    expect(settings).toHaveProperty('languageOfferAnswered');
  });
});
