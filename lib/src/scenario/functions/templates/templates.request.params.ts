import { TestUser } from "../../../common/enums/test.user";
import type {
  AddClassificationEntryFromTemplateInput,
  CreateTemplateOnTemplatesSetInput,
  UpdateClassificationEntrySelectionInput,
  UpdateTagsetInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import { postGraphqlMultipartAs, UploadFile } from "../callout/callout.request.params";

/** The templates of a templates set with their callout framing (type, memo, document) and allowed contribution types. */
export const readTemplatesSetTemplates = (
  templatesSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadTemplatesSetTemplates({ templatesSetId }, headers),
  );

/** Create a template from a full input; returns the id only. */
export const createTemplateWithData = (
  templateData: CreateTemplateOnTemplatesSetInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.CreateTemplateWithData({ templateData }, headers));

export type CollaboraDocumentFields = {
  id: string;
  documentType: string;
  previewUrl: string | null;
};

/**
 * Create a callout template whose framing is a Collabora document seeded
 * from an uploaded file (multipart — see `postGraphqlMultipartAs`).
 */
export const createCalloutTemplateWithFile = (
  templateData: CreateTemplateOnTemplatesSetInput,
  file: UploadFile,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  postGraphqlMultipartAs<{
    createTemplate: {
      id: string;
      callout: { framing: { collaboraDocument: CollaboraDocumentFields | null } } | null;
    };
  }>(
    actor,
    `mutation CreateCalloutTemplateWithFile($file: Upload, $templateData: CreateTemplateOnTemplatesSetInput!) {
      createTemplate(file: $file, templateData: $templateData) {
        id
        callout { framing { collaboraDocument { id documentType previewUrl } } }
      }
    }`,
    { file: null, templateData },
    "variables.file",
    file,
  );

// ---------------------------------------------------------------------------
// Classifications
// ---------------------------------------------------------------------------

export const readTemplatesSetClassificationTemplates = (
  templatesSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadTemplatesSetClassificationTemplates({ templatesSetId }, headers),
  );

/** Create a classification template; returns its cardinality and values. */
export const createClassificationTemplate = (
  templateData: CreateTemplateOnTemplatesSetInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.CreateClassificationTemplate({ templateData }, headers),
  );

/** Add a classification entry to a space from a template; returns the entry as the read API shows it. */
export const addClassificationEntryFromTemplate = (
  classificationData: AddClassificationEntryFromTemplateInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.AddClassificationEntryFromTemplate({ classificationData }, headers),
  );

export const updateClassificationEntrySelection = (
  classificationData: UpdateClassificationEntrySelectionInput,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateClassificationEntrySelection({ classificationData }, headers),
  );

export const updateTagsetTags = (
  updateData: UpdateTagsetInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UpdateTagsetTags({ updateData }, headers));
