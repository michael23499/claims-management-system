import { ID_TRANSFORM, stripMongoId } from './to-json';

describe('stripMongoId', () => {
  it('removes _id from the serialized object', () => {
    const ret: Record<string, unknown> = { _id: 'abc', id: 'abc', title: 'X' };

    stripMongoId({}, ret);

    expect(ret._id).toBeUndefined();
    expect(ret.id).toBe('abc');
    expect(ret.title).toBe('X');
  });

  it('exposes the transform through ID_TRANSFORM', () => {
    expect(ID_TRANSFORM.virtuals).toBe(true);
    expect(ID_TRANSFORM.versionKey).toBe(false);
    expect(ID_TRANSFORM.transform).toBe(stripMongoId);
  });
});
