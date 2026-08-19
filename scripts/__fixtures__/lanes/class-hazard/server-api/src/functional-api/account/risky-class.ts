import { getMails } from '../../hazard-symbols';

// Mirrors the real TestScenarioFactory shape: an exported CLASS whose static
// method makes the hazard call, not a plain `export const` helper.
export class RiskyClass {
  static async doRiskyThing() {
    await getMails();
  }
}
