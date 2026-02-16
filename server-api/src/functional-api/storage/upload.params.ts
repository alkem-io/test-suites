import {
  getGraphqlClient,
  setAuthHeader,
  testConfiguration,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { readFileSync, PathLike } from 'fs';
import nodePath from 'path';

 interface GraphQLError {
   message: string;
   extensions?: { code: string; stacktrace?: string[] };
 }

 interface GraphqlUploadResponse {
   data?: Record<string, Record<string, string> | null>;
   errors?: GraphQLError[];
 }

// --- GraphQL upload mutations ---

const UPLOAD_FILE_ON_REFERENCE = `
  mutation uploadFileOnReference(
    $file: Upload!
    $uploadData: StorageBucketUploadFileOnReferenceInput!
  ) {
    uploadFileOnReference(file: $file, uploadData: $uploadData) {
      id
      description
      name
      uri
    }
  }
`;

const UPLOAD_FILE_ON_LINK = `
  mutation uploadFileOnLink(
    $file: Upload!
    $uploadData: StorageBucketUploadFileOnLinkInput!
  ) {
    uploadFileOnLink(file: $file, uploadData: $uploadData) {
      id
      uri
    }
  }
`;

const UPLOAD_IMAGE_ON_VISUAL = `
  mutation uploadImageOnVisual(
    $file: Upload!
    $uploadData: VisualUploadImageInput!
  ) {
    uploadImageOnVisual(file: $file, uploadData: $uploadData) {
      id
      name
      uri
    }
  }
`;

const UPLOAD_FILE_ON_STORAGE_BUCKET = `
  mutation uploadFileOnStorageBucket(
    $file: Upload!
    $uploadData: StorageBucketUploadFileInput!
  ) {
    uploadFileOnStorageBucket(file: $file, uploadData: $uploadData) {
      id
      url
    }
  }
`;

// --- MIME type lookup ---

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.sql': 'application/sql',
};

function getMimeType(filePath: string): string {
  const ext = nodePath.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// --- GraphQL multipart upload (spec: https://github.com/jaydenseric/graphql-multipart-request-spec) ---

async function graphqlUpload(
  mutation: string,
  variables: Record<string, unknown>,
  filePath: PathLike,
  userRole: TestUser
): Promise<GraphqlUploadResponse> {
  const endpoint = testConfiguration.endPoints.graphql.private;
  const userModel = TestUserManager.getUserModelByType(userRole);
  const authToken = userModel.authToken;

  const filePathStr = filePath.toString();
  const fileBuffer = readFileSync(filePathStr);
  const fileName = nodePath.basename(filePathStr);
  const mimeType = getMimeType(filePathStr);

  const operations = JSON.stringify({
    query: mutation,
    variables: { ...variables, file: null },
  });
  const map = JSON.stringify({ '0': ['variables.file'] });

  const formData = new FormData();
  formData.append('operations', operations);
  formData.append('map', map);
  formData.append(
    '0',
    new Blob([fileBuffer], { type: mimeType }),
    fileName
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'apollo-require-preflight': 'true',
      'x-apollo-operation-name': 'true',
    },
    body: formData,
  });

  return response.json();
}

// --- Upload functions ---

export const uploadFileOnRef = async (
  path: PathLike,
  refId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlUpload(
    UPLOAD_FILE_ON_REFERENCE,
    { uploadData: { referenceID: refId } },
    path,
    userRole
  );
};

export const uploadFileOnLink = async (
  path: PathLike,
  linkId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlUpload(
    UPLOAD_FILE_ON_LINK,
    { uploadData: { linkID: linkId } },
    path,
    userRole
  );
};

export const uploadImageOnVisual = async (
  path: PathLike,
  visualId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlUpload(
    UPLOAD_IMAGE_ON_VISUAL,
    { uploadData: { visualID: visualId } },
    path,
    userRole
  );
};

export const uploadFileOnStorageBucket = async (
  path: PathLike,
  storageBucketId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlUpload(
    UPLOAD_FILE_ON_STORAGE_BUCKET,
    { uploadData: { storageBucketId } },
    path,
    userRole
  );
};

// --- Non-upload functions (unchanged) ---

export const deleteDocument = async (ID: string, userRole?: TestUser) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteDocument(
      {
        deleteData: {
          ID,
        },
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserReferenceUri = async (
  userId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserReferenceUri(
      {
        userId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgReferenceUri = async (
  organizationId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgReferenceUri(
      {
        organizationId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgVisualUri = async (
  organizationId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgVisualUri(
      {
        organizationId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgVisualUriInnovationHub = async (
  ID: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgVisualUriInnovationHub(
      {
        ID,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getProfileDocuments = async (
  profileID: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetProfileDocuments(
      {
        profileID,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};
