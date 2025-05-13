import { AlkemioTestConfig } from '@src/config/alkemio-test-config';
import { createConfigUsingEnvVars } from './create-config-using-envvars';

export const testConfiguration: AlkemioTestConfig = createConfigUsingEnvVars();
