export const kratosRegistrationFlowEndpoint = '/registration/api';
export const kratosVerificationFlowEndpoint = '/verification/api';
export const kratosDomain =
  process.env.KRATOS_ENDPOINT ??
  'http://localhost:3000/identity/ory/kratos/public/self-service';
