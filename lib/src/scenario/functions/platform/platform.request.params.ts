import { TestUser } from "../../../common/enums/test.user";
import { RoleName } from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import { postGraphqlRawAs } from "../../../utils/graphql.raw.client";

/** The platform's eligible UI languages and its default (anonymous-readable). */
export const readPlatformLanguageConfiguration = (
  actor: GraphqlActor = { anonymous: "private" },
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadPlatformLanguageConfiguration({}, headers),
  );

/** Name + version of every service the platform reports (anonymous-readable). */
export const readPlatformServiceVersions = (
  actor: GraphqlActor = { anonymous: "private" },
) => runAs(actor, (sdk, headers) => sdk.ReadPlatformServiceVersions({}, headers));

/** Whether the actor may use the web assistant. */
export const readPlatformVirtualAssistantAccess = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadPlatformVirtualAssistantAccess({}, headers),
  );

/** The forum id with every discussion's id and nameID. */
export const readPlatformForumDiscussions = (
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadPlatformForumDiscussions({}, headers));

/** Remove a platform role from a user. The counterpart of `assignPlatformRole`. */
export const removePlatformRoleFromUser = (
  actorID: string,
  role: RoleName,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.RemovePlatformRole({ roleData: { actorID, role } }, headers),
  );

export const deletePlatformInvitation = (
  invitationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.DeletePlatformInvitation({ invitationId }, headers),
  );

// ---------------------------------------------------------------------------
// Schema introspection. graphql-codegen refuses `__type` / `__schema`
// documents, so these two lib-owned documents go raw — the only reason they
// are strings here. They are read anonymously by default: a spec gates on the
// server's role model before any identity exists.
// ---------------------------------------------------------------------------

export type IntrospectedTypeRef = {
  kind: string;
  name: string | null;
  ofType?: IntrospectedTypeRef | null;
};
export type IntrospectedType = {
  name: string;
  fields: Array<{ name: string; type: IntrospectedTypeRef }> | null;
};

/** The values of an enum as the server under test declares it. */
export const introspectEnumValues = (
  enumName: string,
  actor: GraphqlActor = { anonymous: "private" },
) =>
  postGraphqlRawAs<{ __type: { enumValues: Array<{ name: string }> } | null }>(
    actor,
    "query IntrospectEnumValues($name: String!) { __type(name: $name) { enumValues { name } } }",
    { name: enumName },
  );

/** Every type with its fields and their (nested) type references. */
export const introspectSchemaFieldTypes = (
  actor: GraphqlActor = { anonymous: "private" },
) =>
  postGraphqlRawAs<{ __schema: { types: IntrospectedType[] } }>(
    actor,
    "{ __schema { types { name fields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } } }",
  );
