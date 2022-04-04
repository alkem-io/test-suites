export type KratosFlow = {
  id: string;
  type: 'api';
  expires_at: string; // Date
  issued_at: string; // Date
  request_url: string;
  ui: {
    action: string;
    method: 'POST';
    nodes: KratosUiNode[];
  };
  messages?: FlowMessage[];
};

export type FlowMessage = {
  id: string;
  text: string;
  type: 'error' | 'info';
  context: Record<string, unknown>;
};

export type KratosUiNode = {
  type: 'input';
  group: string;
  attributes: UiNodeAttributes;
  messages: [];
  meta: Record<string, string>;
};

export type UiNodeAttributes = {
  name: string;
  type: string;
  value?: string;
  required: boolean;
  disabled: boolean;
  node_type: string;
};

export type KratosRegistrationParams = {
  'traits.email': string;
  'traits.name.first': string;
  'traits.name.last': string;
  'traits.accepted_terms': boolean;
  password: string;
  method: 'password';
};

export type KratosVerificationParams = {
  email: string;
  method: 'link';
};
