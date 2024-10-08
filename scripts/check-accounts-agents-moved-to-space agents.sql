SELECT distinct(cr.resourceID),   sp.nameID,sp.agentId as spaceAgent,cr.agentId as credentialAgent, 
acc.agentId as accountAgent, sp.id as spaceId, cr.resourceID, acc.id as accountId ##, cr.type 
FROM alkemio.account as acc
join alkemio.space as sp on (acc.id = sp.accountId)
join alkemio.credential as cr on (cr.agentId = acc.agentId or sp.agentId = cr.agentId)

where   sp.level = 0 ##sp.agentId = cr.agentId 