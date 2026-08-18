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
}
