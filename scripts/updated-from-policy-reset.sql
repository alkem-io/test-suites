SELECT au.updatedDate FROM alkemio.space as us
join alkemio.authorization_policy as au 
on (us.authorizationId = au.id)  where au.updatedDate like '%2024-08-16%';