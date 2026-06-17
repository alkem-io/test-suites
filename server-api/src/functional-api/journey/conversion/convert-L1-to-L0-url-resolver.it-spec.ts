/**
 * Convert L1 to L0 — URL resolution cache (alkem-io/server#6020;
 * verified against server#5290, client-web#9481)
 *
 * Scenarios:
 * - The new L0 URL resolves to the promoted space (urlResolver -> Resolved, Space, correct id/level).
 * - The old L1 URL no longer resolves after promotion (urlResolver -> NotFound).
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { urlResolver } from '@functional-api/url-resolver/url-resolver.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  SpaceLevel,
  UrlResolverResultState,
  UrlType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-url-resolver',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

// URL of the L1 before conversion (e.g. http://localhost:3000/<l0>/challenges/<l1>)
let oldL1Url: string;
// URL of the same space after promotion to a root L0 (e.g. http://localhost:3000/<l1nameId>)
let newL0Url: string;
let promotedSpaceId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const before = await getSpaceData(baseScenario.subspace.id);
  oldL1Url = before.data?.lookup.space?.about.profile.url ?? '';

  const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
  promotedSpaceId = res.data?.convertSpaceL1ToSpaceL0?.id ?? '';
  newL0Url = res.data?.convertSpaceL1ToSpaceL0?.about.profile.url ?? '';
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// alkem-io/server#6020 — promoting L1->L0 must invalidate the URL resolution cache for the
// source path: the new L0 path resolves to the promoted space and the old L1 path no longer
// resolves. Verified against alkem-io/server#5290 and alkem-io/client-web#9481.
describe('Convert L1 to L0 - URL resolution cache', () => {
  test('the new L0 url resolves to the promoted space', async () => {
    const res = await urlResolver(newL0Url);

    expect(res.data?.urlResolver.state).toEqual(
      UrlResolverResultState.Resolved
    );
    expect(res.data?.urlResolver.type).toEqual(UrlType.Space);
    expect(res.data?.urlResolver.space?.id).toEqual(promotedSpaceId);
    expect(res.data?.urlResolver.space?.level).toEqual(SpaceLevel.L0);
  });

  test('the old L1 url no longer resolves after promotion', async () => {
    const res = await urlResolver(oldL1Url);

    expect(res.data?.urlResolver.state).toEqual(
      UrlResolverResultState.NotFound
    );
  });
});
