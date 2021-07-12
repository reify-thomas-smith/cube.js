// eslint-disable-next-line import/no-extraneous-dependencies
import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { BaseDriver } from '@cubejs-backend/query-orchestrator';
import { BaseQuery, prepareCompiler as originalPrepareCompiler } from '@cubejs-backend/schema-compiler';
import { StartedTestContainer } from 'testcontainers';

import { createCubeSchema } from './utils';

export const prepareCompiler = (content: any, options?: any) => originalPrepareCompiler({
  localPath: () => __dirname,
  dataSchemaFiles: () => Promise.resolve([
    { fileName: 'main.js', content }
  ])
}, { adapter: 'postgres', ...options });

export abstract class QueryTestAbstract<T extends BaseDriver = any> {
  abstract getQueryClass(): any;

  protected getQuery(a: any, b: any): BaseQuery {
    const QueryClass = this.getQueryClass();

    return new QueryClass(a, b);
  }

  public async testRefreshKeyImmutable(connection: T) {
    const { compiler, joinGraph, cubeEvaluator } = prepareCompiler(
      createCubeSchema({
        name: 'cards',
        refreshKey: `
          refreshKey: {
            immutable: true,
          },
        `,
        preAggregations: `
          countCreatedAt: {
              type: 'rollup',
              external: true,
              measureReferences: [count],
              timeDimensionReference: createdAt,
              granularity: \`day\`,
              partitionGranularity: \`month\`,
              scheduledRefresh: true,
          },
        `
      })
    );
    await compiler.compile();

    const query = this.getQuery({ joinGraph, cubeEvaluator, compiler }, {
      measures: [
        'cards.count'
      ],
      timeDimensions: [{
        dimension: 'cards.createdAt',
        granularity: 'day',
        dateRange: ['2016-12-30', '2017-01-05']
      }],
      filters: [],
      timezone: 'America/Los_Angeles',
    });

    const preAggregations: any = query.newPreAggregations().preAggregationsDescription();
    expect(preAggregations.length).toEqual(2);

    const [sql, params] = preAggregations[0].invalidateKeyQueries[0];

    console.log('Executing ', [sql, params]);

    await connection.query(sql, params, {});
  }

  public async testRefreshKeyIncremental(connection: T) {
    const { compiler, joinGraph, cubeEvaluator } = prepareCompiler(
      createCubeSchema({
        name: 'cards',
        refreshKey: `
          refreshKey: {
            immutable: true,
          },
        `,
        preAggregations: `
          countCreatedAt: {
              type: 'rollup',
              external: true,
              measureReferences: [count],
              timeDimensionReference: createdAt,
              granularity: \`day\`,
              partitionGranularity: \`month\`,
              scheduledRefresh: true,
              refreshKey: {
                every: \`1 day\`,
                incremental: true,
                updateWindow: \`7 day\`,
              },
          },
        `
      })
    );
    await compiler.compile();

    const query = this.getQuery({ joinGraph, cubeEvaluator, compiler }, {
      measures: [
        'cards.count'
      ],
      timeDimensions: [{
        dimension: 'cards.createdAt',
        granularity: 'day',
        dateRange: ['2016-12-30', '2017-01-05']
      }],
      filters: [],
      timezone: 'America/Los_Angeles',
    });

    const preAggregations: any = query.newPreAggregations().preAggregationsDescription();
    expect(preAggregations.length).toEqual(2);

    const [sql, params] = preAggregations[0].invalidateKeyQueries[0];

    console.log('Executing ', [sql, params]);

    await connection.query(sql, params, {});
  }
}

export interface QueryTestCaseOptions {
  name: string,
  connectionFactory: (container: StartedTestContainer) => BaseDriver,
  DbRunnerClass: any,
}

export function createQueryTestCase(test: QueryTestAbstract<any>, opts: QueryTestCaseOptions) {
  describe(`${opts.name}Query`, () => {
    jest.setTimeout(60 * 1000);

    let container: StartedTestContainer;
    let connection: BaseDriver;

    beforeAll(async () => {
      container = await opts.DbRunnerClass.startContainer({});
      connection = opts.connectionFactory(container);
    });

    afterAll(async () => {
      if (connection) {
        await connection.release();
      }

      if (container) {
        await container.stop();
      }
    });

    it('test refreshKey immutable', async () => test.testRefreshKeyImmutable(connection));
    it('test refreshKey incremental', async () => test.testRefreshKeyIncremental(connection));
  });
}
