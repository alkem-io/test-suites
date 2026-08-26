export interface AlkemioTestConfig {
  registerUsers: boolean;
  endPoints: {
    server: string;
    ws: string;
    rest: string;
    mailSlurper: string;
    graphql: {
      private: string;
    };
    kratos: {
      public: string;
      private: string;
      /** In-cluster Kratos ADMIN API (network-isolated). Set on CI via a
       * port-forward for deterministic identity provisioning (#565 Phase 2);
       * empty when unavailable (local dev falls back to self-registration). */
      admin: string;
    };
    /** RabbitMQ management HTTP API (compose publishes 15672). Used for
     * emit-level assertions on internal queues (e.g. `alkemio-push-notifications`)
     * when there is no GraphQL surface to observe a dispatch — see workspace
     * feature 034-messaging-notifications, Operator Ruling 3c (push verified
     * to the emit/payload boundary only, never real browser delivery). */
    rabbitMqManagement: {
      url: string;
      user: string;
      password: string;
    };
  };
  identities: {
    admin: {
      email: string;
      password: string;
    };
    // user: {
    //   firstName: string;
    //   lastName: string;
    //   email: string;
    // };
  };
  /** Direct connection to the compose Redis the server's BFF session store
   * (`server/src/core/auth/oidc/session-store.redis.ts`) reads/writes —
   * used only to fabricate/age `alkemio_session` records for the
   * self-account-deletion freshness-gate it-specs (054-delete-own-account),
   * never for anything the GraphQL/REST surface already covers. */
  redis: {
    host: string;
    port: number;
  };
  /** Direct connection to the compose Postgres `alkemio` database — used ONLY
   * for assertions/seeds that have no GraphQL surface (audit-row reads,
   * externalSubscriptionID seeding — see 054-delete-own-account quickstart.md
   * §4). Never used to bypass a mutation that exists. */
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  /** Mirrors the subset of `server`'s `identity.authentication.providers.oidc`
   * config (alkemio.yml) the harness needs to fabricate a valid BFF cookie
   * session directly in Redis for a plain (non-`TestUser`) registered user —
   * see `scenario/registration/mint-bff-session.ts`. `sessionSigningKey` MUST
   * match the server's `SESSION_SIGNING_KEY`; both default to the same
   * committed, non-secret local-dev placeholder, so this only ever works
   * against an unmodified local/CI compose stack — never a real deployment. */
  oidc: {
    sessionCookieName: string;
    sessionSigningKey: string;
    webClientId: string;
    idleTtlS: number;
    absoluteTtlS: number;
  };
}
