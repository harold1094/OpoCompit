import {
  avatarCatalog,
  avatarCategories,
  avatarItemById,
  defaultAvatarInventory,
  defaultAvatarLoadout,
} from './avatarCatalog';

describe('local avatar catalog', () => {
  it('contains every shop category and unique stable identifiers', () => {
    expect(new Set(avatarCatalog.map((item) => item.id)).size).toBe(avatarCatalog.length);
    expect(new Set(avatarCatalog.map((item) => item.category))).toEqual(
      new Set(avatarCategories.map((category) => category.id)),
    );
  });

  it('owns and equips a valid starter item for every slot', () => {
    const inventory = defaultAvatarInventory();
    Object.entries(defaultAvatarLoadout).forEach(([slot, itemId]) => {
      expect(inventory.ownedItemIds).toContain(itemId);
      expect(avatarItemById(itemId).slot).toBe(slot);
    });
  });
});
