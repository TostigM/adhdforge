/**
 * Unit tests: launchpad CRUD — list (lazy reset), add, check, update,
 * reorder, delete. Ownership and validation guards on every mutation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { getLaunchpadItems } from '../list-items';
import { addLaunchpadItem } from '../add-item';
import { checkLaunchpadItem } from '../check-item';
import { updateLaunchpadItem } from '../update-item';
import { reorderLaunchpadItems } from '../reorder-items';
import { deleteLaunchpadItem } from '../delete-item';

const OWNED = { id: 'item_1', userId: 'user_1' };
const NOW = new Date('2026-07-08T22:00:00Z');

let db: ReturnType<typeof makeMockPrisma>;

beforeEach(() => {
  db = makeMockPrisma();
  db.launchpadItem.updateMany.mockResolvedValue({ count: 0 });
  db.launchpadItem.findMany.mockResolvedValue([]);
  db.launchpadItem.findUnique.mockResolvedValue(OWNED);
  db.launchpadItem.update.mockResolvedValue({});
  db.launchpadItem.delete.mockResolvedValue({});
  db.event.create.mockResolvedValue({});
});

describe('getLaunchpadItems', () => {
  it('applies the lazy daily reset BEFORE reading the list', async () => {
    const order: string[] = [];
    db.launchpadItem.updateMany.mockImplementation(async () => {
      order.push('reset');
      return { count: 1 };
    });
    db.launchpadItem.findMany.mockImplementation(async () => {
      order.push('read');
      return [];
    });

    const result = await getLaunchpadItems(db, 'user_1', NOW);
    expect(result.ok).toBe(true);
    expect(order).toEqual(['reset', 'read']);
  });

  it('returns items ordered by displayOrder', async () => {
    await getLaunchpadItems(db, 'user_1', NOW);
    expect(db.launchpadItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1' },
        orderBy: { displayOrder: 'asc' },
      }),
    );
  });

  it('still returns the list when the lazy reset fails (cron heals later)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.launchpadItem.updateMany.mockRejectedValue(new Error('boom'));
    db.launchpadItem.findMany.mockResolvedValue([
      { id: 'i1', label: 'Keys', displayOrder: 0, isChecked: false, resetSchedule: 'daily' },
    ]);

    const result = await getLaunchpadItems(db, 'user_1', NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(1);
    spy.mockRestore();
  });
});

describe('addLaunchpadItem', () => {
  beforeEach(() => {
    db.launchpadItem.aggregate.mockResolvedValue({ _max: { displayOrder: 2 } });
    db.launchpadItem.create.mockResolvedValue({ id: 'item_new' });
  });

  it('rejects an empty label', async () => {
    const result = await addLaunchpadItem(db, { userId: 'user_1', label: '   ' });
    expect(result).toMatchObject({ ok: false, error: 'label_empty' });
  });

  it('rejects a label over 120 characters', async () => {
    const result = await addLaunchpadItem(db, { userId: 'user_1', label: 'x'.repeat(121) });
    expect(result).toMatchObject({ ok: false, error: 'label_too_long' });
  });

  it('appends at max displayOrder + 1 with daily as the default schedule', async () => {
    const result = await addLaunchpadItem(db, { userId: 'user_1', label: '  Keys ' });
    expect(result.ok).toBe(true);
    expect(db.launchpadItem.create).toHaveBeenCalledWith({
      data: { userId: 'user_1', label: 'Keys', displayOrder: 3, resetSchedule: 'daily' },
    });
  });

  it('first item lands at displayOrder 0', async () => {
    db.launchpadItem.aggregate.mockResolvedValue({ _max: { displayOrder: null } });
    await addLaunchpadItem(db, { userId: 'user_1', label: 'Wallet' });
    expect(db.launchpadItem.create.mock.calls[0]?.[0].data.displayOrder).toBe(0);
  });
});

describe('checkLaunchpadItem', () => {
  it('rejects another user’s item', async () => {
    const result = await checkLaunchpadItem(db, {
      itemId: 'item_1',
      userId: 'intruder',
      checked: true,
    });
    expect(result).toMatchObject({ ok: false, error: 'forbidden' });
    expect(db.launchpadItem.update).not.toHaveBeenCalled();
  });

  it('checking stamps lastCheckedAt and logs the event atomically', async () => {
    const result = await checkLaunchpadItem(db, {
      itemId: 'item_1',
      userId: 'user_1',
      checked: true,
    });
    expect(result.ok).toBe(true);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const updateArgs = db.launchpadItem.update.mock.calls[0]?.[0];
    expect(updateArgs?.data.isChecked).toBe(true);
    expect(updateArgs?.data.lastCheckedAt).toBeInstanceOf(Date);
    expect(db.event.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        eventType: 'launchpad_item.checked',
        payload: { itemId: 'item_1' },
      },
    });
  });

  it('unchecking clears isChecked but PRESERVES lastCheckedAt and logs nothing', async () => {
    await checkLaunchpadItem(db, { itemId: 'item_1', userId: 'user_1', checked: false });
    expect(db.launchpadItem.update).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { isChecked: false },
    });
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it('missing item → item_not_found', async () => {
    db.launchpadItem.findUnique.mockResolvedValue(null);
    const result = await checkLaunchpadItem(db, {
      itemId: 'gone',
      userId: 'user_1',
      checked: true,
    });
    expect(result).toMatchObject({ ok: false, error: 'item_not_found' });
  });
});

describe('updateLaunchpadItem', () => {
  it('validates the new label before touching the DB', async () => {
    const result = await updateLaunchpadItem(db, {
      itemId: 'item_1',
      userId: 'user_1',
      label: '',
    });
    expect(result).toMatchObject({ ok: false, error: 'label_empty' });
    expect(db.launchpadItem.findUnique).not.toHaveBeenCalled();
  });

  it('updates only the provided fields', async () => {
    await updateLaunchpadItem(db, {
      itemId: 'item_1',
      userId: 'user_1',
      resetSchedule: 'on_departure',
    });
    expect(db.launchpadItem.update).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { resetSchedule: 'on_departure' },
    });
  });

  it('rejects another user’s item', async () => {
    const result = await updateLaunchpadItem(db, {
      itemId: 'item_1',
      userId: 'intruder',
      label: 'Keys',
    });
    expect(result).toMatchObject({ ok: false, error: 'forbidden' });
  });
});

describe('reorderLaunchpadItems', () => {
  beforeEach(() => {
    db.launchpadItem.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('rejects an id list that does not exactly match the user’s items', async () => {
    const result = await reorderLaunchpadItems(db, {
      userId: 'user_1',
      orderedItemIds: ['a', 'b'], // missing c
    });
    expect(result).toMatchObject({ ok: false, error: 'invalid_item_set' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('writes displayOrder 0..n-1 in the given order, transactionally', async () => {
    const result = await reorderLaunchpadItems(db, {
      userId: 'user_1',
      orderedItemIds: ['c', 'a', 'b'],
    });
    expect(result.ok).toBe(true);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.launchpadItem.update.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: 'c' }, data: { displayOrder: 0 } },
      { where: { id: 'a' }, data: { displayOrder: 1 } },
      { where: { id: 'b' }, data: { displayOrder: 2 } },
    ]);
  });
});

describe('deleteLaunchpadItem', () => {
  it('deletes an owned item', async () => {
    const result = await deleteLaunchpadItem(db, { itemId: 'item_1', userId: 'user_1' });
    expect(result.ok).toBe(true);
    expect(db.launchpadItem.delete).toHaveBeenCalledWith({ where: { id: 'item_1' } });
  });

  it('rejects another user’s item without deleting', async () => {
    const result = await deleteLaunchpadItem(db, { itemId: 'item_1', userId: 'intruder' });
    expect(result).toMatchObject({ ok: false, error: 'forbidden' });
    expect(db.launchpadItem.delete).not.toHaveBeenCalled();
  });
});
