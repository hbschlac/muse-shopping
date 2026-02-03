const User = require('../models/User');
const { NotFoundError } = require('../utils/errors');

class UserService {
  static async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const profile = await User.getProfile(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        profile_image_url: user.profile_image_url,
        is_verified: user.is_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      profile: profile || {},
    };
  }

  static async updateUser(userId, updates) {
    const user = await User.update(userId, updates);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  static async updateUserProfile(userId, updates) {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if profile exists, create if not
    let profile = await User.getProfile(userId);
    if (!profile) {
      profile = await User.createProfile(userId);
    }

    // Update profile
    const updatedProfile = await User.updateProfile(userId, updates);
    return updatedProfile;
  }

  static async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    await User.delete(userId);
  }
}

module.exports = UserService;
