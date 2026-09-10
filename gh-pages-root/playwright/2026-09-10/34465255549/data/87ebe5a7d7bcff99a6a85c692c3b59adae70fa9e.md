# Page snapshot

```yaml
- generic [ref=e5]:
  - img [ref=e6]
  - heading "Oops!" [level=1] [ref=e8]
  - generic [ref=e10]:
    - paragraph [ref=e11]: "Looks like something went wrong: [Network error]: Response not successful: Received status code 400"
    - paragraph [ref=e12]: Please check that your server (https://test-alkem.io/api/private/graphql) is available, and reload the page.
  - generic [ref=e13]:
    - text: If the error persists please
    - link "contact support" [ref=e14] [cursor=pointer]:
      - /url: mailto:support@alkem.io?subject=Support%20Request&body=Hello%2C%0A%0AI%20encountered%20an%20error%20while%20using%20Alkemio.%0A%0APlease%20help%20me%20resolve%20this%20issue.%0A%0AThank%20you.
    - text: .
  - generic [ref=e15]: ApolloError at new e (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:63:153) at https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:67:80031 at h (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:8512) at https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:8427 at new Promise (<anonymous>) at Object.then (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:8394) at Object.error (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:8522) at Za (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:1947) at Ar (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:2316) at e.error (https://test-alkem.io/assets/vendor-apollozbYYwgvt.js:62:2889)
  - button "Reload" [active] [ref=e17] [cursor=pointer]
```