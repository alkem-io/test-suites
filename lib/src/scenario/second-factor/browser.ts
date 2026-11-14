import { type GraphqlActor } from '../../utils/graphql.actor';
import { postGraphqlRawAs } from '../../utils/graphql.raw.client';

/** Read-backs the browser track needs beside what the UI shows. */

/** The organisation rule's switch as the server stores it. */
export const readOrganizationSecondFactorRequired = async (
  organizationID: string,
  actor: GraphqlActor
): Promise<boolean> => {
  const response = await postGraphqlRawAs<{
    organization: { settings: { security: { secondFactorRequired: boolean } } };
  }>(
    actor,
    'query($id: UUID!) { organization(ID: $id) { settings { security { secondFactorRequired } } } }',
    { id: organizationID }
  );
  const value =
    response.body.data?.organization?.settings?.security?.secondFactorRequired;
  if (typeof value !== 'boolean') {
    throw new Error(
      `second-factor: read organisation rule failed: ${response.raw.slice(0, 400)}`
    );
  }
  return value;
};
