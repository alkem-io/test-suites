SELECT * FROM alkemio.community_policy;
SELECT * FROM alkemio.community_policy where member = '' or member is null;
SELECT * FROM alkemio.community_policy where admin = '' or admin is null;
SELECT * FROM alkemio.community_policy where community_policy.lead = '' or community_policy.lead is null;
