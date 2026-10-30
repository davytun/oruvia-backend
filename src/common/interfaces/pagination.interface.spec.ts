import { buildPaginated } from './pagination.interface.js';

describe('buildPaginated', () => {
  it('produces the { items, meta: { page, limit, total } } envelope', () => {
    const result = buildPaginated(['a', 'b'], 2, 12, 42);

    expect(result).toEqual({
      items: ['a', 'b'],
      meta: { page: 2, limit: 12, total: 42 },
    });
  });

  it('emits no derived fields such as totalPages', () => {
    const result = buildPaginated<number>([], 1, 12, 0);

    expect(result.items).toEqual([]);
    expect(Object.keys(result.meta)).toEqual(['page', 'limit', 'total']);
  });
});
