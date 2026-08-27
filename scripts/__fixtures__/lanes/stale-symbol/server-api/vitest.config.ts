export default {
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'nightly-parallel',
          include: [],
          sequence: { groupOrder: 0 },
          maxWorkers: 1,
          retry: 0,
        },
      },
      {
        extends: true,
        test: {
          name: 'nightly-serial',
          include: [],
          sequence: { groupOrder: 1 },
          maxWorkers: 1,
          retry: 0,
        },
      },
    ],
  },
};

