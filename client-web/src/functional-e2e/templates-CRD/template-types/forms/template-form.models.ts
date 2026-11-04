export interface TemplateForm {
  displayName: string;
  description: string;
  tags: string[];
}

export interface CommunityGuidelinesTemplateForm extends TemplateForm {
  guidelines: {
    displayName: string;
    description: string;
    references?: { title: string; url: string }[];
  }
}

export interface PostTemplateForm extends TemplateForm {
  defaultContent: string;
}

export interface WhiteboardTemplateForm extends TemplateForm {
  textInWhiteboard: string;
}