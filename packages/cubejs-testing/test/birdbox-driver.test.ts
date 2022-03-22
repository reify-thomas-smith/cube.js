import R from 'ramda';
import yargs from 'yargs/yargs';
// eslint-disable-next-line import/no-extraneous-dependencies
import cubejs, { Query, CubejsApi } from '@cubejs-client/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { afterAll, beforeAll, expect, jest } from '@jest/globals';
import { BirdBox, startBirdBoxFromCli, startBirdBoxFromContainer } from '../src';

const SERVER_MODES = ['cli', 'docker', 'local'];
type ServerMode = typeof SERVER_MODES[number];

interface Args {
  mode: ServerMode
}

const args: Args = yargs(process.argv.slice(2))
  .exitProcess(false)
  .options(
    {
      mode: {
        choices: SERVER_MODES,
        default: 'local',
        describe: 'how to stand up the server',
      }
    }
  )
  .argv as Args;

export function createDriverTestCase(type: string, envVars: string[]) {
  describe(type, () => {
    jest.setTimeout(60 * 5 * 1000);

    let birdbox: BirdBox;
    let httpClient: CubejsApi;
    let env = R.fromPairs(envVars.map(k => {
      const v = process.env[k];
      if (v === undefined) {
        throw new Error(`${k} is required`);
      }
      return [k, v];
    }));
    env = {
      ...env,
      CUBEJS_SCHEDULED_REFRESH_DEFAULT: 'false',
      CUBEJS_REFRESH_WORKER: 'true',
      CUBEJS_EXTERNAL_DEFAULT: 'true',
      CUBEJS_ROLLUP_ONLY: 'true',
    };

    beforeAll(async () => {
      try {
        switch (args.mode) {
          case 'cli':
          case 'local': {
            birdbox = await startBirdBoxFromCli(
              {
                cubejsConfig: 'single/cube.js',
                dbType: type,
                useCubejsServerBinary: args.mode === 'local',
                env,
              }
            );
            break;
          }

          case 'docker': {
            birdbox = await startBirdBoxFromContainer(
              {
                name: type,
                env
              }
            );
            break;
          }

          default: {
            throw new Error(`Bad serverMode ${args.mode}`);
          }
        }

        httpClient = cubejs(async () => 'test', {
          apiUrl: birdbox.configuration.apiUrl,
        });
      } catch (e) {
        console.log(e);
        process.exit(1);
      }
    });

    afterAll(async () => {
      await birdbox.stop();
    });

    it('query', async () => {
      const response = await httpClient.load(
        {
          measures: ['OrdersPA.amount2', 'OrdersPA.amount'],
          dimensions: [
            'OrdersPA.id2',
            'OrdersPA.status2',
            'OrdersPA.id',
            'OrdersPA.status'
          ],
        }
      );
      expect(response.rawData()).toMatchSnapshot('query');
    });

    describe('filters', () => {
      type QueryTestOptions = {
        name: string;
        ws?: true,
      };

      const containsAsserts: [options: QueryTestOptions, query: Query][] = [
        [
          {
            name: '#1 Orders.status.contains: ["e"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'contains',
                values: ['e'],
              },
            ],
          },
        ], [
          {
            name: '#2 Orders.status.contains: ["es"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'contains',
                values: ['es'],
              },
            ],
          },
        ], [
          {
            name: '#3 Orders.status.contains: ["es", "w"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'contains',
                values: ['es', 'w'],
              },
            ],
          },
        ], [
          {
            name: '#3 Orders.status.contains: ["a"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'contains',
                values: ['a'],
              },
            ],
          },
        ],
      ];
      const startsWithAsserts: [options: QueryTestOptions, query: Query][] = [
        [
          {
            name: '#1 Orders.status.startsWith: ["a"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'startsWith',
                values: ['a'],
              },
            ],
          },
        ], [
          {
            name: '#2 Orders.status.startsWith: ["n"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'startsWith',
                values: ['n'],
              },
            ],
          },
        ], [
          {
            name: '#3 Orders.status.startsWith: ["p"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'startsWith',
                values: ['p'],
              },
            ],
          },
        ], [
          {
            name: '#4 Orders.status.startsWith: ["sh"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'startsWith',
                values: ['sh'],
              },
            ],
          },
        ], [
          {
            name: '#5 Orders.status.startsWith: ["n", "p", "s"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'startsWith',
                values: ['n', 'p', 's'],
              },
            ],
          },
        ],
      ];
      const endsWithAsserts: [options: QueryTestOptions, query: Query][] = [
        [
          {
            name: '#1 Orders.status.endsWith: ["a"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'endsWith',
                values: ['a'],
              },
            ],
          },
        ], [
          {
            name: '#2 Orders.status.endsWith: ["w"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'endsWith',
                values: ['w'],
              },
            ],
          },
        ], [
          {
            name: '#3 Orders.status.endsWith: ["sed"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'endsWith',
                values: ['sed'],
              },
            ],
          },
        ], [
          {
            name: '#4 Orders.status.endsWith: ["ped"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'endsWith',
                values: ['ped'],
              },
            ],
          },
        ], [
          {
            name: '#4 Orders.status.endsWith: ["w", "sed", "ped"]',
          },
          {
            measures: [
              'Orders.count'
            ],
            filters: [
              {
                member: 'Orders.status',
                operator: 'endsWith',
                values: ['w', 'sed', 'ped'],
              },
            ],
          },
        ],
      ];

      describe('contains', () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const [options, query] of containsAsserts) {
          // eslint-disable-next-line no-loop-func
          it(`${options.name}`, async () => {
            const response = await httpClient.load(query);
            expect(response.rawData()).toMatchSnapshot('contains');
          });
        }
      });

      describe('startsWith', () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const [options, query] of startsWithAsserts) {
          // eslint-disable-next-line no-loop-func
          it(`${options.name}`, async () => {
            const response = await httpClient.load(query);
            // @ts-ignore
            expect(response.rawData()).toMatchSnapshot('startsWith');
          });
        }
      });

      describe('endsWith', () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const [options, query] of endsWithAsserts) {
          // eslint-disable-next-line no-loop-func
          it(`${options.name}`, async () => {
            const response = await httpClient.load(query);
            // @ts-ignore
            expect(response.rawData()).toMatchSnapshot('endsWith');
          });
        }
      });
    });
  });
}
