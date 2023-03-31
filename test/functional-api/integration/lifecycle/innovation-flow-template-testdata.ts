// Defaults
export const lifecycleDefaultDefinition =
  '{"id":"challenge-lifecycle-default-3","context":{"parentID":"2f2f3241-a70c-4887-a2c8-262059f36dfc"},"initial":"new","states":{"new":{"on":{"REFINE":{"target":"beingRefined","cond":"challengeStateUpdateAuthorized"},"ABANDONED":{"target":"abandoned","cond":"challengeStateUpdateAuthorized"}}},"beingRefined":{"on":{"ACTIVE":{"target":"inProgress","cond":"challengeStateUpdateAuthorized"},"ABANDONED":{"target":"abandoned","cond":"challengeStateUpdateAuthorized"}}},"inProgress":{"entry":["sampleEvent"],"on":{"COMPLETED":{"target":"complete","cond":"challengeStateUpdateAuthorized"},"ABANDONED":{"target":"abandoned","cond":"challengeStateUpdateAuthorized"}}},"complete":{"on":{"ARCHIVE":"archived","ABANDONED":"abandoned"}},"abandoned":{"on":{"REOPEN":"inProgress","ARCHIVE":"archived"}},"archived":{"type":"final"}}}';

export const templateDefaultInfo = {
  displayName: 'Template title',
  description: 'Template description',
};

// Updates
export const lifecycleDefinitionUpdate = `{
  "id": "Test flows",
  "initial": "Start state",
  "states": {
    "Start state": {
      "on": {
        "Event name": {
          "target": "Second state"
        },
        "Event 2": {
          "target": "Third state"
        }
      }
    },
    "Second state": {
      "on": {
        "Event 3": {
          "target": "Third state"
        }
      }
    },
    "Third state": {
      "on": {
        "Event 4": {
          "target": "End state"
        }
      }
    },
    "End state": {
      "type": "final"
    }
  }
}`;

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
  'Variable \\"$innovationFlowTemplateInput\\" got invalid value \\" \\" at \\"innovationFlowTemplateInput.type\\"; Value \\" \\" does not exist in \\"LifecycleType\\" enum.';
export const errorInvalidDescription = 'Error';
export const errorInvalidInfo = 'Error';
export const errorAuthCreateInnovationFlow =
  "Authorization: unable to grant 'create' privilege: templates set create innovationFlow template:";
export const errorAuthUpdateInnovationFlow =
  "Authorization: unable to grant 'update' privilege: update innovationFlow template:";
export const errorAuthDeleteInnovationFlow =
  "Authorization: unable to grant 'delete' privilege: innovationFlow template delete:";
export const errorNoInnovationFlow =
  'Not able to locate InnovationFlowTemplate with the specified ID: 0bade07d-6736-4ee2-93c0-b2af22a998ff';

export const errorDeleteLastInnovationFlowTemplate =
  'Cannot delete last innovationFlow template:';
