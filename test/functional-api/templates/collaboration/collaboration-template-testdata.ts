import {
  CalloutGroupName,
  CalloutState,
  CalloutType,
  CreateCalloutInput,
  InnovationFlowState,
  TagsetReservedName,
  CreateCollaborationInput,
} from '@test/generated/graphql';
import { uniqueId } from '@test/utils/mutations/create-mutation';

export const lifecycleDefaultDefinition: InnovationFlowState[] = [
  {
    displayName: 'prepare',
    description: 'The innovation is being prepared.',
  },
  {
    displayName: 'in progress',
    description: 'The innovation is in progress.',
  },
  {
    displayName: 'summary',
    description: 'The summary of the flow results.',
  },
  { displayName: 'done', description: 'The flow is completed.' },
];

export const templateDefaultInfo = {
  displayName: `Template title ${uniqueId}`,
  description: 'Template description',
};

// Updates
export const lifecycleDefinitionUpdate: InnovationFlowState[] = [
  {
    displayName: 'prepare updated',
    description: 'The innovation is being prepared.',
  },
  {
    displayName: 'in progress updated',
    description: 'The innovation is in progress.',
  },
  {
    displayName: 'summary updated',
    description: 'The summary of the flow results.',
  },
  { displayName: 'done updated', description: 'The flow is completed.' },
];

export const templateInfoUpdate = {
  displayName: 'Template title update',
  description: 'Template description update',
};

// Defaults

export const bootstrapSpaceCallouts: CreateCalloutInput[] = [
  {
    nameID: 'welcome',
    type: CalloutType.Post,
    contributionPolicy: {
      state: CalloutState.Open,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.Home,
    framing: {
      profile: {
        displayName: '👋 Welcome to your space!',
        description: 'An empty space for you to configure!.',
        tagsets: [
          {
            name: TagsetReservedName.FlowState,
            tags: ['Home'],
          },
        ],
      },
    },
  },
];

export const createCollaborationInputData: CreateCollaborationInput = {
  calloutsData: bootstrapSpaceCallouts,
  innovationFlowData: {
    profile: {
      displayName: `Template title ${uniqueId}`,
      description: 'Template description',
    },
    states: lifecycleDefaultDefinition,
  },
};

export const emptyLifecycleDefaultDefinition = '{}';

export const emptyTemplateInfo = {
  displayName: '',
  description: '',
};

// Error messages
export const errorInvalidType =
  'Variable "$innovationFlowTemplateInput" got invalid value " " at "innovationFlowTemplateInput.type"; Value " " does not exist in "CollaborationType" enum.';
export const errorInvalidDescription =
  'Variable "$innovationFlowData" got invalid value "{}" at "innovationFlowData.states"; Expected type "CreateCollaborationStateInput" to be an object.';
export const errorInvalidInfo = 'Error';
export const errorAuthCreateCollaboration =
  "Authorization: unable to grant 'create' privilege: templates set create template:";
export const errorAuthUpdateCollaboration =
  "Authorization: unable to grant 'update' privilege: update template:";
export const errorAuthDeleteCollaboration =
  "Authorization: unable to grant 'delete' privilege: template delete:";
export const errorNoCollaboration =
  'Not able to locate Template with the specified ID: 0bade07d-6736-4ee2-93c0-b2af22a998ff';

export const errorDeleteLastCollaborationTemplate =
  'Cannot delete last innovationFlow template:';
