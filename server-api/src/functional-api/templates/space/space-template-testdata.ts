import { UniqueIDGenerator } from '@alkemio/tests-lib';;
const uniqueId = UniqueIDGenerator.getID();

export const templateDefaultInfo = {
  displayName: `Template title ${uniqueId}`,
  description: 'Template description',
};

export const templateInfoUpdate = {
  displayName: 'Template title update',
  description: 'Template description update',
};

// Defaults
export const emptyLifecycleDefaultDefinition = '{}';

// Error messages
export const errorInvalidType =
  'Variable "$innovationFlowTemplateInput" got invalid value " " at "innovationFlowTemplateInput.type"; Value " " does not exist in "CollaborationType" enum.';
export const errorInvalidDescription =
  'Variable "$innovationFlowData" got invalid value "{}" at "innovationFlowData.states"; Expected type "CreateCollaborationStateInput" to be an object.';
export const errorInvalidInfo = 'Error';

export const errorDeleteLastCollaborationTemplate =
  'Cannot delete last innovationFlow template:';
