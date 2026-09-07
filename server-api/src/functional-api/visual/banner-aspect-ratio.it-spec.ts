// Release 71 — adjustable space banner (server#6346 + client-web#10121).
//
// Derived from the requirement, not from existing coverage: at the time of
// writing NO integration test in this repo referenced `aspectRatio` at all.
//
// The contract under test has two halves that read from DIFFERENT sources, and
// conflating them is the feature's main failure mode:
//
//   VisualService.validateAspectRatio  reads DEFAULT_VISUAL_CONSTRAINTS
//                                      (the compiled-in CONSTANTS).
//   VisualService.validateImageWidth   reads the STORED visual ROW.
//   VisualService.validateImageHeight  ditto.
//
// Consequence: the ratio range works on a server that has the R71 code even if
// the data migration `WidenSpaceBannerVisualConstraints` never ran — while every
// pre-existing space silently keeps rejecting banner UPLOADS at the old
// 1536x256 ceiling. Test 3 is the gate that catches that; the ratio walks alone
// would pass straight through it.
//
// BANNER is the one adjustable visual type (6..10). Every other type has
// minAspectRatio == maxAspectRatio, i.e. a fixed shape.
//
// Deliberately NOT covered here: actual image uploads. Those need a working
// file-service and are the subject of the manual ACC walk — see
// docs/test-plan-2026-08-13-r71-acc.md section 6.3.
//
// mapping: docs/test-plan-2026-08-13-r71-acc.md sections 5.3 and 6.3

import { TestScenarioFactory, UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import {
  getSpaceBannerVisual,
  getVisualTypeConstraints,
  updateVisualAspectRatio,
} from './visual.request.params';

const uniqueId = UniqueIDGenerator.getID();

/** From visual.constraints.ts — BANNER after server#6346. */
const BANNER_MIN_RATIO = 6;
const BANNER_MAX_RATIO = 10;
/**
 * Post-migration stored bounds: WidenSpaceBannerVisualConstraints (server#6346)
 * then LowerSpaceBannerMinWidth (server#6439, client-web#10178) — the floor
 * dropped 1536x154 -> 1200x120, minHeight staying ceil(minWidth / maxRatio).
 */
const BANNER_ROW_BOUNDS = {
  minWidth: 1200,
  maxWidth: 3840,
  minHeight: 120,
  maxHeight: 640,
};

let baseScenario: OrganizationWithSpaceModel;
let bannerVisualId = '';
let bannerVisualUri = '';

const scenarioConfig: TestScenarioConfig = {
  name: `banner-aspect-ratio-${uniqueId}`,
  space: {},
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const res = await getSpaceBannerVisual(baseScenario.space.id);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  const visual = res.body.data?.lookup?.space?.about?.profile?.visual;
  bannerVisualId = visual?.id ?? '';
  // `uri` is required by UpdateVisualInput, so every ratio write must carry the
  // CURRENT uri or it fails at variable coercion before validation is reached.
  bannerVisualUri = visual?.uri ?? '';
  expect(bannerVisualId, 'space has no BANNER visual').not.toEqual('');
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('R71 banner aspect ratio — the CONSTANTS contract', () => {
  test('BANNER is the adjustable type: the ratio range is 6..10', async () => {
    const res = await getVisualTypeConstraints('BANNER');
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const c =
      res.body.data.platform.configuration.defaultVisualTypeConstraints;
    expect(c.minAspectRatio).toEqual(BANNER_MIN_RATIO);
    expect(c.maxAspectRatio).toEqual(BANNER_MAX_RATIO);
    // The DEFAULT shape: 6:1 after server#6346 (R71), moved to 10:1 by
    // server#6452 (R74) so client and server agree on the bannerless shape.
    expect(c.aspectRatio).toEqual(BANNER_MAX_RATIO);
    // Height bounds must span the WHOLE ratio range, not one shape:
    //   minHeight = ceil(minWidth / maxAspectRatio), maxHeight = maxWidth / minAspectRatio
    expect(c.minHeight).toEqual(Math.ceil(c.minWidth / c.maxAspectRatio));
    expect(c.maxHeight).toEqual(c.maxWidth / c.minAspectRatio);
  });

  test.each([
    ['AVATAR', 1],
    ['BANNER_WIDE', 10],
    ['CARD', 1.6],
  ])('%s keeps a FIXED shape (min == max == %s)', async (type, ratio) => {
    const res = await getVisualTypeConstraints(type);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const c =
      res.body.data.platform.configuration.defaultVisualTypeConstraints;
    expect(c.minAspectRatio).toEqual(ratio);
    expect(c.maxAspectRatio).toEqual(ratio);
    expect(c.aspectRatio).toEqual(ratio);
  });
});

describe('R71 banner aspect ratio — the STORED ROW (migration gate)', () => {
  // This is the check that distinguishes "the code shipped" from "the migration
  // ran". The upload validator reads these numbers, so if they are stale the
  // feature is broken for every pre-existing space no matter what the
  // constants say.
  test('the space BANNER row carries the WIDENED bounds', async () => {
    const res = await getSpaceBannerVisual(baseScenario.space.id);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const v = res.body.data.lookup.space.about.profile.visual;
    expect({
      minWidth: v.minWidth,
      maxWidth: v.maxWidth,
      minHeight: v.minHeight,
      maxHeight: v.maxHeight,
    }).toEqual(BANNER_ROW_BOUNDS);
  });
});

describe('R71 banner aspect ratio — updateVisual boundaries', () => {
  test.each([
    ['the lower bound', BANNER_MIN_RATIO],
    ['an interior value', 8],
    ['the upper bound', BANNER_MAX_RATIO],
  ])('accepts %s (%s) and persists it', async (_label, ratio) => {
    const res = await updateVisualAspectRatio(bannerVisualId, ratio as number, bannerVisualUri);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data.updateVisual.aspectRatio).toEqual(ratio);

    // Round-trip: re-read rather than trusting the mutation's own echo.
    const read = await getSpaceBannerVisual(baseScenario.space.id);
    expect(read.body.data.lookup.space.about.profile.visual.aspectRatio).toEqual(
      ratio
    );
  });

  test.each([
    ['just below the lower bound', 5.9],
    ['just above the upper bound', 10.1],
    ['far below', 1],
  ])('rejects %s (%s)', async (_label, ratio) => {
    const res = await updateVisualAspectRatio(bannerVisualId, ratio as number, bannerVisualUri);
    expect(res.body.errors, 'expected a validation error').toBeDefined();
    expect(res.body.errors[0].message).toContain(
      `not in the allowed range of ${BANNER_MIN_RATIO} - ${BANNER_MAX_RATIO}`
    );
  });

  test('a rejected write leaves the stored ratio untouched', async () => {
    await updateVisualAspectRatio(bannerVisualId, BANNER_MAX_RATIO, bannerVisualUri);
    await updateVisualAspectRatio(bannerVisualId, 99, bannerVisualUri);

    const read = await getSpaceBannerVisual(baseScenario.space.id);
    expect(read.body.data.lookup.space.about.profile.visual.aspectRatio).toEqual(
      BANNER_MAX_RATIO
    );
  });
});
