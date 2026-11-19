"""Authorization engine + policy model for the W1 access matrix.

This is a faithful re-implementation of the legacy server's authorization layer:
- the evaluation engine (src/core/authorization/authorization.service.ts): credential rules
  (any criterion matches a held credential by type, and by resourceID unless the criterion's
  resourceID is empty) grant privileges; privilege rules then map a privilege granted BY A
  CREDENTIAL RULE to further privileges (one hop, no chaining).
- inheritance (authorization.policy.service.ts#inheritParentAuthorization): a child policy starts
  from the parent's credential rules whose `cascade` flag is true; privilege rules never cascade.

Everything in `model.py` is a transcription of the `*.service.authorization.ts` builders; each
rule carries the file:line it was transcribed from. The enums, role definitions and rule-name
constants are parsed from the server source by `parse_server.py`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass(frozen=True)
class Criterion:
    type: str
    resource: str = ''  # '' = type-only criterion (matches any resourceID)
    via: str = 'own'    # own | parent | type-only | derived | data-dependent


@dataclass
class CredentialRule:
    name: str
    privileges: tuple[str, ...]
    criteria: tuple[Criterion, ...]
    cascade: bool
    evidence: str          # server file:line
    origin: str            # entity id the rule was appended on
    condition: str = ''    # settings branch the rule depends on, '' when unconditional


@dataclass
class PrivilegeRule:
    name: str
    source: str
    granted: tuple[str, ...]
    evidence: str
    origin: str
    condition: str = ''


@dataclass
class Policy:
    entity: str
    type: str
    credential_rules: list[CredentialRule] = field(default_factory=list)
    privilege_rules: list[PrivilegeRule] = field(default_factory=list)

    # --- builders mirroring AuthorizationPolicyService -------------------------------------
    def inherit(self, parent: 'Policy | None') -> 'Policy':
        """inheritParentAuthorization: reset, then copy the parent's cascading credential rules."""
        self.credential_rules = [r for r in (parent.credential_rules if parent else []) if r.cascade]
        self.privilege_rules = []
        return self

    def clone(self, entity: str | None = None) -> 'Policy':
        p = Policy(entity or self.entity, self.type)
        p.credential_rules = list(self.credential_rules)
        p.privilege_rules = list(self.privilege_rules)
        return p

    def add(self, name: str, privileges: Iterable[str], criteria: Iterable[Criterion], evidence: str,
            cascade: bool = True, condition: str = '') -> 'Policy':
        crit = tuple(criteria)
        if not crit:
            return self
        self.credential_rules.append(CredentialRule(name, tuple(privileges), crit, cascade, evidence, self.entity, condition))
        return self

    def add_types(self, name: str, privileges: Iterable[str], types: Iterable[str], evidence: str,
                  cascade: bool = True, condition: str = '') -> 'Policy':
        return self.add(name, privileges, [Criterion(t, '', 'type-only') for t in types], evidence, cascade, condition)

    def add_privilege_rule(self, name: str, source: str, granted: Iterable[str], evidence: str, condition: str = '') -> 'Policy':
        self.privilege_rules.append(PrivilegeRule(name, source, tuple(granted), evidence, self.entity, condition))
        return self

    def anonymous_registered_read(self, evidence: str, privilege: str = 'read', cascade: bool = True) -> 'Policy':
        return self.add_types("Anonymous agent granted 'read' anonymous registered access",
                              [privilege], ['global-anonymous', 'global-registered'], evidence, cascade)

    def registered_access(self, evidence: str, privilege: str = 'read', cascade: bool = True) -> 'Policy':
        return self.add_types("Anonymous agent granted 'read' registered access", [privilege], ['global-registered'], evidence, cascade)

    # --- evaluation mirroring AuthorizationService.getGrantedPrivileges -------------------------
    def evaluate(self, credentials: Iterable[Criterion]) -> dict[str, dict]:
        """Returns privilege -> {path, evidence} for the given held credentials."""
        held = list(credentials)
        granted: dict[str, dict] = {}
        for rule in self.credential_rules:
            for cred in held:
                hit = next((c for c in rule.criteria if c.type == cred.type and (c.resource == '' or c.resource == cred.resource)), None)
                if hit is None:
                    continue
                for p in rule.privileges:
                    if p not in granted:
                        granted[p] = {
                            'path': describe_path(self, rule, hit),
                            'evidence': rule.evidence,
                            'rule': rule.name,
                        }
                break
        by_credential = set(granted)
        for prule in self.privilege_rules:
            if prule.source in by_credential:
                for p in prule.granted:
                    if p not in granted:
                        granted[p] = {
                            'path': f"privilege-rule({prule.source}->{p})" + (f"|settings:{prule.condition}" if prule.condition else ''),
                            'evidence': prule.evidence,
                            'rule': prule.name,
                        }
        return granted


def describe_path(policy: Policy, rule: CredentialRule, hit: Criterion) -> str:
    parts = []
    parts.append('direct' if rule.origin == policy.entity else f'cascade({rule.origin})')
    if hit.via == 'parent':
        parts.append('parent-credential')
    elif hit.via == 'derived':
        parts.append('derived-credential')
    elif hit.via == 'type-only':
        parts.append('type-only')
    elif hit.via == 'data-dependent':
        parts.append('data-dependent')
    if rule.condition:
        parts.append(f'settings:{rule.condition}')
    return '|'.join(parts)
