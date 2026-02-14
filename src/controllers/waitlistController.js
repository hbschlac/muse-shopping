const WaitlistService = require('../services/waitlistService');
const { successResponse } = require('../utils/responseFormatter');

class WaitlistController {
  /**
   * Add new waitlist signup (public endpoint)
   */
  static async addSignup(req, res, next) {
    console.log('[CONTROLLER] addSignup called');
    try {
      // Get IP address from request
      console.time('[PERF] Controller processing');
      const signup_ip_address =
        req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.ip;

      const user_agent = req.headers['user-agent'];

      const signupData = {
        ...req.body,
        signup_ip_address,
        user_agent,
      };

      console.log('[CONTROLLER] Calling WaitlistService.addSignup');
      const signup = await WaitlistService.addSignup(signupData);
      console.log('[CONTROLLER] WaitlistService.addSignup completed');
      console.timeEnd('[PERF] Controller processing');

      res.status(201).json(
        successResponse(
          {
            id: signup.id,
            email: signup.email,
            position: signup.position,
            total: signup.total,
            my_referral_code: signup.my_referral_code,
            priority_score: signup.priority_score,
            created_at: signup.created_at,
          },
          'Successfully joined the waitlist'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get waitlist signup by email (for user to check their status)
   */
  static async getStatus(req, res, next) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const signup = await WaitlistService.findByEmail(email);

      if (!signup) {
        return res.status(404).json({ success: false, message: 'Email not found on waitlist' });
      }

      const { position, total } = await WaitlistService.getWaitlistPosition(signup.id);

      res.json(
        successResponse({
          status: signup.status,
          position,
          total,
          my_referral_code: signup.my_referral_code,
          priority_score: signup.priority_score,
          created_at: signup.created_at,
          invite_sent_at: signup.invite_sent_at,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get waitlist statistics (admin only)
   */
  static async getStatistics(req, res, next) {
    try {
      const stats = await WaitlistService.getStatistics();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated waitlist (admin only)
   */
  static async getWaitlist(req, res, next) {
    try {
      const { page = 1, limit = 50, status, orderBy, orderDir } = req.query;

      const result = await WaitlistService.getWaitlist({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        orderBy,
        orderDir,
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update waitlist signup (admin only)
   */
  static async updateSignup(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const signup = await WaitlistService.updateSignup(id, updates);
      res.json(successResponse(signup, 'Waitlist signup updated'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send invite to waitlist signup (admin only)
   */
  static async sendInvite(req, res, next) {
    try {
      const { id } = req.params;

      const signup = await WaitlistService.markAsInvited(id);

      // TODO: Integrate with email service to send actual invite email
      // await emailService.sendWaitlistInvite(signup.email, signup.first_name);

      res.json(successResponse(signup, 'Invite sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch send invites (admin only)
   */
  static async batchSendInvites(req, res, next) {
    try {
      const { count = 10 } = req.body;

      // Get top priority pending signups
      const { signups } = await WaitlistService.getWaitlist({
        page: 1,
        limit: count,
        status: 'pending',
        orderBy: 'priority_score',
        orderDir: 'DESC',
      });

      const results = [];
      for (const signup of signups) {
        try {
          const updated = await WaitlistService.markAsInvited(signup.id);
          // TODO: Send actual email
          results.push({ id: signup.id, email: signup.email, success: true });
        } catch (error) {
          results.push({ id: signup.id, email: signup.email, success: false, error: error.message });
        }
      }

      res.json(successResponse({ invited: results, total: results.length }, 'Batch invites processed'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unsubscribe from waitlist
   */
  static async unsubscribe(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      await WaitlistService.unsubscribe(email);
      res.json(successResponse(null, 'Successfully unsubscribed from waitlist'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get waitlist signup by ID (admin only)
   */
  static async getSignupById(req, res, next) {
    try {
      const { id } = req.params;
      const signup = await WaitlistService.findById(id);

      if (!signup) {
        return res.status(404).json({ success: false, message: 'Waitlist signup not found' });
      }

      res.json(successResponse(signup));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral link for a user
   */
  static async getReferralLink(req, res, next) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const signup = await WaitlistService.findByEmail(email);

      if (!signup) {
        return res.status(404).json({ success: false, message: 'Email not found on waitlist' });
      }

      const referralLink = await WaitlistService.getReferralLink(email);
      const referralStats = await WaitlistService.getReferralStats(signup.my_referral_code);

      res.json(
        successResponse({
          referral_link: referralLink,
          referral_code: signup.my_referral_code,
          referral_count: referralStats.referral_count,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track when a user shares their referral link
   */
  static async trackShare(req, res, next) {
    try {
      const { email, share_method, share_platform } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const share_ip_address =
        req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.ip;
      const share_user_agent = req.headers['user-agent'];

      const share = await WaitlistService.trackReferralShare({
        email,
        share_method,
        share_platform,
        share_ip_address,
        share_user_agent,
      });

      res.json(successResponse(share, 'Share tracked successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track when someone clicks a referral link
   */
  static async trackClick(req, res, next) {
    try {
      const { referral_code, utm_source, utm_medium, utm_campaign } = req.body;

      if (!referral_code) {
        return res.status(400).json({ success: false, message: 'Referral code is required' });
      }

      const click_ip_address =
        req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.ip;
      const click_user_agent = req.headers['user-agent'];
      const http_referrer = req.headers.referer || req.headers.referrer;

      const click = await WaitlistService.trackReferralClick({
        referral_code,
        click_ip_address,
        click_user_agent,
        utm_source,
        utm_medium,
        utm_campaign,
        http_referrer,
      });

      res.json(successResponse(click, 'Click tracked successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral analytics for a user
   */
  static async getReferralAnalytics(req, res, next) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const details = await WaitlistService.getReferralDetails(email);

      res.json(successResponse(details));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WaitlistController;
