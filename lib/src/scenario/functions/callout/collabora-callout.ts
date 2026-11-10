import { TestUser } from "../../../common/enums/test.user";
import {
  CalloutFramingType,
  CalloutVisibility,
  CollaboraDocumentType,
  LicenseEntitlementType,
} from "../../../core/generated/alkemio-schema";
import type { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import {
  getLicensePlanByName,
  getSpaceLicenseEntitlements,
} from "../../baseFunctions";
import { assignLicensePlanToSpace } from "../space/space.request.params";
import { createCalloutWithData } from "./callout.request.params";

export type CollaboraFramedCallout = {
  calloutId: string;
  collaboraDocumentId: string;
  /** `/api/private/wopi/files/<fileID>/preview`; the file id is stable across saves. */
  previewUrl: string;
};

const OFFICE_DOCUMENTS_PLAN = "SPACE_FEATURE_OFFICE_DOCUMENTS";
const ENTITLEMENT_POLL_ATTEMPTS = 60;
const ENTITLEMENT_POLL_INTERVAL_MS = 500;

/**
 * Entitle a Space for Collabora documents and wait until the server reports
 * `SPACE_FLAG_OFFICE_DOCUMENTS` enabled: entitlements are resolved from the plan
 * credential and cached server-side, so the assignment is not visible the
 * instant the mutation returns. Throws if the platform has no such plan, or the
 * entitlement does not arrive within about 30 s.
 */
export const entitleSpaceForOfficeDocuments = async (
  spaceId: string
): Promise<void> => {
  const plan = await getLicensePlanByName(OFFICE_DOCUMENTS_PLAN);
  const licensePlanID = plan[0]?.id;
  if (!licensePlanID) {
    throw new Error(
      `no ${OFFICE_DOCUMENTS_PLAN} licence plan on this platform`
    );
  }
  const assigned = await assignLicensePlanToSpace(spaceId, licensePlanID);
  if (assigned.error || !assigned.data) {
    throw new Error(
      `assign the office documents plan failed: ${JSON.stringify(
        assigned.error?.errors
      )}`
    );
  }
  for (let attempt = 0; attempt < ENTITLEMENT_POLL_ATTEMPTS; attempt += 1) {
    const read = await getSpaceLicenseEntitlements(spaceId);
    const enabled = read.data?.lookup.space?.license.entitlements.find(
      (entitlement: { type: LicenseEntitlementType; enabled: boolean }) =>
        entitlement.type === LicenseEntitlementType.SpaceFlagOfficeDocuments
    )?.enabled;
    if (enabled) return;
    // Bounded poll on the server's own entitlement read; the cache is not observable otherwise.
    await new Promise<void>((resolve) =>
      setTimeout(resolve, ENTITLEMENT_POLL_INTERVAL_MS)
    );
  }
  throw new Error(
    "SPACE_FLAG_OFFICE_DOCUMENTS is not enabled on the Space after the plan was assigned"
  );
};

/**
 * A published callout that FRAMES a blank Collabora document of `documentType`.
 * The Space needs the office documents entitlement first
 * (`entitleSpaceForOfficeDocuments`). Throws on any failure: it is set-up.
 */
export const createCollaboraFramedCallout = async (
  calloutsSetId: string,
  data: {
    displayName: string;
    nameID: string;
    documentType: CollaboraDocumentType;
  },
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<CollaboraFramedCallout> => {
  const created = await createCalloutWithData(
    {
      calloutsSetID: calloutsSetId,
      nameID: data.nameID,
      framing: {
        profile: {
          displayName: data.displayName,
          description: "Collabora framing callout",
        },
        type: CalloutFramingType.CollaboraDocument,
        collaboraDocument: {
          displayName: data.displayName,
          documentType: data.documentType,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    },
    actor
  );
  const callout = created.data?.createCalloutOnCalloutsSet;
  const document = callout?.framing.collaboraDocument;
  if (!callout?.id || !document?.id || !document.previewUrl) {
    throw new Error(
      `create collabora callout failed: ${JSON.stringify(
        created.error?.errors ??
          "no document (with a previewUrl) in the response"
      )}`
    );
  }
  return {
    calloutId: callout.id,
    collaboraDocumentId: document.id,
    previewUrl: document.previewUrl,
  };
};

/**
 * The Collabora document a callout frames, as the actor sees it: type, preview
 * url (re-read it, never cache the file id) and what the actor may do with it.
 * No `lookup.collaboraDocument` exists, so the read goes through the callout.
 * NB `updatedDate` does not move when COOL saves: wopi writes the file store
 * directly and the server row is untouched.
 */
export const readCalloutCollaboraDocument = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutCollaboraDocument({ calloutId }, headers)
  );
