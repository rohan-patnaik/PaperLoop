import { describe, it, expect } from 'vitest';
import { getCarIntent } from './CarController.js';

describe('getCarIntent', () => {
  it('sets throttle when pressing forward', () => {
    const intent = getCarIntent({ forward: true });
    expect(intent.throttle).toBe(1);
    expect(intent.reverse).toBe(0);
  });

  it('sets reverse when pressing back', () => {
    const intent = getCarIntent({ back: true });
    expect(intent.reverse).toBe(1);
    expect(intent.throttle).toBe(0);
  });

  it('clamps steering from left/right', () => {
    const intentLeft = getCarIntent({ left: true });
    const intentRight = getCarIntent({ right: true });
    expect(intentLeft.steer).toBe(1);
    expect(intentRight.steer).toBe(-1);

    const intentBoth = getCarIntent({ left: true, right: true });
    expect(intentBoth.steer).toBe(0);
  });

  it('brake overrides throttle and reverse', () => {
    const intent = getCarIntent({ forward: true, back: true, brake: true });
    expect(intent.brake).toBe(true);
    expect(intent.throttle).toBe(0);
    expect(intent.reverse).toBe(0);
  });

  it('boost flag is passed through', () => {
    const intent = getCarIntent({ boost: true });
    expect(intent.boost).toBe(true);
  });
});
