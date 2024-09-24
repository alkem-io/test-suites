import { uniqueId } from '@test/utils/mutations/create-mutation';

// Defaults
export const lifecycleDefaultDefinition = [
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
export const lifecycleDefinitionUpdate = [
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

// Empty

export const emptyLifecycleDefaultDefinition = '{}';

export const emptyTemplateInfo = {
  displayName: '',
  description: '',
};

// Error messages
export const errorInvalidType =
  'Variable "$innovationFlowTemplateInput" got invalid value " " at "innovationFlowTemplateInput.type"; Value " " does not exist in "InnovationFlowType" enum.';
export const errorInvalidDescription =
  'Variable "$innovationFlowData" got invalid value "{}" at "innovationFlowData.states"; Expected type "CreateInnovationFlowStateInput" to be an object.';
export const errorInvalidInfo = 'Error';
export const errorAuthCreateInnovationFlow =
  "Authorization: unable to grant 'create' privilege: templates set create template:";
export const errorAuthUpdateInnovationFlow =
  "Authorization: unable to grant 'update' privilege: update template:";
export const errorAuthDeleteInnovationFlow =
  "Authorization: unable to grant 'delete' privilege: template delete:";
export const errorNoInnovationFlow =
  'Not able to locate Template with the specified ID: 0bade07d-6736-4ee2-93c0-b2af22a998ff';

export const errorDeleteLastInnovationFlowTemplate =
  'Cannot delete last innovationFlow template:';
