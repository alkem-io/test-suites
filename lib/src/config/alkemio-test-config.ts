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
