import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:3000/graphql',
  documents: ['graphql/**/*.graphql'],
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
  generates: {
    'test/generated/alkemio-schema.ts': {
      plugins: ['typescript', 'typescript-resolvers', 'typescript-operations'],
      config: {
        skipTypename: true,
        maybeValue: 'T | undefined',
        scalars: {
          Upload: "import('graphql-upload').FileUpload",
          NameID: 'string',
          UUID: 'string',
          UUID_NAMEID: 'string',
          UUID_NAMEID_EMAIL: 'string',
          DID: 'string',
          DateTime: 'Date',
          JSON: 'string',
        },
      },
    },
    'test/generated/graphql.ts': {
      preset: 'import-types',
      presetConfig: {
        typesPath: './alkemio-schema',
        importTypesNamespace: 'SchemaTypes',
      },
      plugins: [
        {
          add: {
            content: '/* eslint-disable @typescript-eslint/no-explicit-any */',
          },
        },
        'typescript',
        'typescript-resolvers',
        'typescript-operations',
        'typescript-graphql-request',
      ],
      config: {
        maybeValue: 'T | undefined',
        rawRequest: true,
        preResolveTypes: true,
        skipTypename: true,
        scalars: {
          Upload: "import('graphql-upload').FileUpload",
          NameID: 'string',
          UUID: 'string',
          UUID_NAMEID: 'string',
          UUID_NAMEID_EMAIL: 'string',
          DID: 'string',
          DateTime: 'Date',
          JSON: 'string',
        },
      },
    },
  },
};

export default config;
