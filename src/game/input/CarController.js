const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getCarIntent = (input = {}) => {
  const forward = Boolean(input.forward);
  const back = Boolean(input.back);
  const brake = Boolean(input.brake);
  const boost = Boolean(input.boost);

  let throttle = forward ? 1 : 0;
  let reverse = back ? 1 : 0;

  if (brake) {
    throttle = 0;
    reverse = 0;
  }

  const left = Boolean(input.left);
  const right = Boolean(input.right);
  let steer = left ? 1 : 0;
  steer += right ? -1 : 0;
  if (left && right) {
    steer = 0;
  }
  steer = clamp(steer, -1, 1);

  return {
    throttle,
    reverse,
    brake,
    boost,
    steer
  };
};
