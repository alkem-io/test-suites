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
