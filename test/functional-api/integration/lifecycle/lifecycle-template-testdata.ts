// Defaults
export const lifecycleDefaultDefinition = `{
  "initial": "new",
  "states": {
    "new": {
      "on": {
        "TEST": {
          "testing": "beingTested",
          "cond": "challengeStateUpdateAuthorized"
        },
        "ABANDONED": {
          "target": "abandoned",
          "cond": "challengeStateUpdateAuthorized"
        }
      }
    },
    "archived": { "type": "final" }
  }
}`;

export const templateDefaultInfo = {
  title: 'Template title',
  description: 'Template description',
  tags: ['Tag 1', 'Tag 2'],
};

// Updates
export const lifecycleDefinitionUpdate = `{
  "initial": "update",
  "states": {
    "update": {
      "on": {
        "UPDATE": {
          "testing": "beingUpdated",
          "cond": "challengeStateUpdateAuthorized"
        },
      },
    },
  }
}`;

export const templateInfoUpdate = {
  title: 'Template title update',
  description: 'Template description update',
  tags: ['Tag 1update', 'Tag 2update'],
};

// Empty

export const emptyLifecycleDefaultDefinition = '{}';

export const emptyTemplateInfo = {
  title: '',
  description: '',
  tags: [],
};

// Error messages
export const errorInvalidType =
  'Variable \\"$lifecycleTemplateInput\\" got invalid value \\" \\" at \\"lifecycleTemplateInput.type\\"; Value \\" \\" does not exist in \\"LifecycleType\\" enum.';
export const errorInvalidDescription = 'Error';
export const errorInvalidInfo = 'Error';
export const errorAuthCreateLifecycle =
  'Authorization: unable to grant \'create\' privilege: templates set create lifecycle template:';
export const errorAuthUpdateLifecycle =
  'Authorization: unable to grant \'update\' privilege: update lifecycle template:';
export const errorAuthDeleteLifecycle =
  'Authorization: unable to grant \'delete\' privilege: lifecycle template delete:';
export const errorNoLifecycle =
  'Not able to locate LifecycleTemplate with the specified ID: 0bade07d-6736-4ee2-93c0-b2af22a998ff';
