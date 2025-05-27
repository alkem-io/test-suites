/**
 * Configuration interface for Alkemio test environment
 */
export interface AlkemioTestConfig {
  /**
   * Flag to determine if users should be automatically registered during test setup
   */
  registerUsers: boolean;
  /**
   * Endpoints for various services used during testing
   */
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
    };
  };
  /**
   * Authentication credentials for different user roles
   */
  identities: {
    admin: {
      email: string;
      password: string;
    };
  };
}
