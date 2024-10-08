SELECT * FROM alkemio.callout_contribution_policy;
SELECT * FROM alkemio.callout_contribution_policy where allowedContributionTypes = '' or allowedContributionTypes is null;
SELECT * FROM alkemio.callout_contribution_policy where state = '' or state is null;