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
