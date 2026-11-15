import { computeTargetPath, pickNew, type PhotoAsset } from '../src/photos';

const asset = (over: Partial<PhotoAsset>): PhotoAsset => ({
  id: 'a1',
  filename: 'IMG_0001.jpg',
  mediaType: 'photo',
  timestamp: Math.floor(Date.UTC(2026, 0, 5, 10, 30) / 1000), // 2026-01-05
  ...over,
});

describe('computeTargetPath', () => {
  it('builds photos/yyyy/MM/dd/<filename> with zero padding', () => {
    expect(computeTargetPath(asset({}), '')).toBe('photos/2026/01/05/IMG_0001.jpg');
  });

  it('scopes the path under the owner (per-user server rule)', () => {
    expect(computeTargetPath(asset({}), 'testuser')).toBe('testuser/photos/2026/01/05/IMG_0001.jpg');
  });

  it('falls back to a sanitized id when filename is empty', () => {
    expect(
      computeTargetPath(asset({ filename: '', id: 'ph://ABC 12/34' }), ''),
    ).toBe('photos/2026/01/05/ph___ABC_12_34');
  });
});

describe('pickNew', () => {
  it('keeps only assets not already indexed', () => {
    const assets = [asset({ id: 'a1' }), asset({ id: 'a2' }), asset({ id: 'a3' })];
    expect(pickNew(assets, new Set(['a1', 'a3'])).map(a => a.id)).toEqual(['a2']);
    expect(pickNew(assets, new Set())).toHaveLength(3);
  });
});
