/**
 * Agent payment rails: how Muse pays at a store once a partner approves it.
 * Nothing here is switched on in production yet; every store falls back to
 * "Check out at {store}" until a rail's configuration is set.
 */
module.exports = {
  ...require('./railSelector'),
  stripeSpt: require('./stripeSpt'),
};
