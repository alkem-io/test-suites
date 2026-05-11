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
    };
    oidc: {
      hydraPublic: string;
      hydraAdmin: string;
      kratosAdmin: string;
      clientId: string;
      redirectUri: string;
      scopes: string;
      audience: string;
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
