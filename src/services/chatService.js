const axios = require('axios');
const pool = require('../db/pool');
const ItemService = require('./itemService');
const PreferencesService = require('./preferencesService');
const { AppError, ValidationError } = require('../utils/errors');
const ChatPersonalizationService = require('./chatPersonalizationService');
const ChatSafetyService = require('./chatSafetyService');
const ChatRetrievalService = require('./chatRetrievalService');
const PersonalizationHubService = require('./personalizationHubService');
const ChatPreferenceIngestionService = require('./chatPreferenceIngestionService');
const ChatFeedbackService = require('./chatFeedbackService');
const ChatUsageService = require('./chatUsageService');
const ChatSessionSummaryService = require('./chatSessionSummaryService');
const ChatNotificationService = require('./chatNotificationService');
const StyleProfileService = require('./styleProfileService');
const ImageContentModerationService = require('./imageContentModerationService');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06';
const OPENAI_INTENT_MODEL = process.env.OPENAI_INTENT_MODEL || 'gpt-4o-mini-2024-07-18';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 8;
const MAX_ITEMS = 12;

const intentSchema = {
  name: 'muse_chat_intent',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      intent: { type: 'string', enum: ['search', 'editorial', 'mixed', 'clarify'] },
      query: { type: ['string', 'null'] },
      filters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          min_price: { type: ['number', 'null'] },
          max_price: { type: ['number', 'null'] },
          categories: { type: ['array', 'null'], items: { type: 'string' } },
          subcategories: { type: ['array', 'null'], items: { type: 'string' } },
          attributes: { type: ['array', 'null'], items: { type: 'string' } },
          on_sale: { type: ['boolean', 'null'] },
          in_stock: { type: ['boolean', 'null'] },
          sort_by: { type: ['string', 'null'], enum: ['price_low', 'price_high', 'newest', 'popular', null] },
        },
      },
      needs_clarification: { type: 'boolean' },
      clarification_question: { type: ['string', 'null'] },
    },
    required: ['intent', 'query', 'filters', 'needs_clarification', 'clarification_question'],
  },
};

const replySchema = {
  name: 'muse_chat_reply',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      followups: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    },
    required: ['message', 'followups'],
  },
};

class ChatService {
  static async getChatResponse({ message, history = [], context = {}, userId = null, sessionId = null }) {
    const configuredDemoMode = process.env.CHAT_DEMO_MODE === 'true';
    const demoMode = configuredDemoMode || !OPENAI_API_KEY;
    if (!OPENAI_API_KEY && !configuredDemoMode) {
      console.warn('[chat] OPENAI_API_KEY missing, falling back to CHAT_DEMO_MODE behavior');
    }

    const trimmedMessage = String(message || '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (!trimmedMessage) {
      throw new ValidationError('message cannot be empty');
    }

    // Validate and moderate image if provided
    if (context && context.image) {
      const validation = await ImageContentModerationService.validateImageData(context.image);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid image');
      }

      const moderation = await ImageContentModerationService.moderateImage(context.image, {
        userId,
        sessionId,
        messageId: null, // Will be set after message is created
      });

      if (!moderation.safe) {
        throw new ValidationError(
          moderation.reason || 'The uploaded image contains inappropriate content. Please share fashion-related images only.'
        );
      }
    }

    if (demoMode) {
      return this._buildDemoResponse(trimmedMessage);
    }

    let normalizedHistory = this._normalizeHistory(history);
    let activeSessionId = sessionId || null;
    const preferences = await this._getPreferencesSafe(userId);
    const unifiedProfile = userId ? await PersonalizationHubService.getUnifiedProfile(userId, activeSessionId) : null;
    const userProfile = await ChatPersonalizationService.getUserProfile(userId);
    const sessionMemory = activeSessionId ? await ChatPersonalizationService.getSessionMemory(activeSessionId) : null;
    if (activeSessionId && normalizedHistory.length === 0) {
      normalizedHistory = await this._loadHistoryFromSession(activeSessionId, MAX_HISTORY_ITEMS);
    }

    const intent = await this._extractIntent({
      message: trimmedMessage,
      history: normalizedHistory,
      preferences,
      context,
      sessionId: activeSessionId,
    });
    if (intent.needs_clarification) {
      const sessionTitle = this._inferTitle(trimmedMessage);
      const ensuredSessionId = await this._ensureSession({
        sessionId: activeSessionId,
        userId,
        title: sessionTitle,
        metadata: { source: 'chat', context },
      });
      activeSessionId = ensuredSessionId;

      const userMessageId = await this._appendMessage({
        sessionId: activeSessionId,
        role: 'user',
        content: trimmedMessage,
        intent,
        filters: intent.filters,
        metadata: { context },
      });

      const assistantMessage = intent.clarification_question || 'What are you shopping for? Any price range or size?';
      await ChatSessionSummaryService.upsertSummary(activeSessionId, null, [intent.intent]);

    const assistantMessageId = await this._appendMessage({
        sessionId: activeSessionId,
        role: 'assistant',
        content: assistantMessage,
        intent,
        filters: intent.filters,
        metadata: { type: 'clarification' },
      });

      return {
        intent: intent.intent,
        query: intent.query,
        filters: intent.filters,
        needs_clarification: true,
        message: assistantMessage,
        followups: [],
        items: [],
        session_id: activeSessionId,
        message_id: userMessageId,
        assistant_message_id: assistantMessageId,
      };
    }

    let items = [];
    let retrievalSources = [];
    let retrievalContext = {};
    if (intent.intent === 'search' || intent.intent === 'mixed') {
      const retrieval = await this._searchItems(intent, trimmedMessage, userId, context);
      items = retrieval.items;
      retrievalSources = retrieval.sources || [];
      retrievalContext = retrieval.context || {};
      await ChatRetrievalService.logRetrieval({
        sessionId: activeSessionId,
        messageId: null,
        query: intent.query || trimmedMessage,
        sources: retrievalSources,
        items: items.map((i) => ({ id: i.id, name: i.canonical_name, brand: i.brand_name })),
        context: retrievalContext,
      });

      // NEW: Track product recommendations in style profile
      if (userId && items.length > 0) {
        await this._trackRecommendationsInStyleProfile(userId, items);
      }
    }

    const reply = await this._generateReply({
      message: trimmedMessage,
      history: normalizedHistory,
      preferences,
      intent,
      items,
      context,
      sessionId: activeSessionId,
    });

    if (process.env.CHAT_EMBEDDINGS_ENABLED === 'true' && activeSessionId) {
      try {
        const ChatEmbeddingService = require('./chatEmbeddingService');
        const embedding = await ChatEmbeddingService.generateEmbedding({
          text: `${trimmedMessage}\\n${reply.message}`,
          model: process.env.CHAT_EMBEDDINGS_MODEL || 'text-embedding-3-small',
        });
        if (embedding) {
          await ChatPersonalizationService.upsertSessionEmbedding({
            sessionId: activeSessionId,
            embedding,
            embeddingModel: process.env.CHAT_EMBEDDINGS_MODEL || 'text-embedding-3-small',
          });
        }
      } catch (error) {
        // Best-effort scaffold; ignore failures
      }
    }

    if (activeSessionId) {
      await ChatPersonalizationService.upsertSessionMemory({
        sessionId: activeSessionId,
        summary: null,
        entities: null,
        preferences: preferences || null,
      });
    }

    if (userId) {
      await ChatPreferenceIngestionService.ingestFromIntent({
        userId,
        sessionId: activeSessionId,
        messageId: null,
        intent,
        originalMessage: trimmedMessage,
      });
    }

    const sessionTitle = this._inferTitle(trimmedMessage);
    const ensuredSessionId = await this._ensureSession({
      sessionId: activeSessionId,
      userId,
      title: sessionTitle,
      metadata: { source: 'chat', context },
    });
    activeSessionId = ensuredSessionId;

    const userMessageId = await this._appendMessage({
      sessionId: activeSessionId,
      role: 'user',
      content: trimmedMessage,
      intent,
      filters: intent.filters,
      metadata: { context },
    });

    const safety = await ChatSafetyService.evaluate({
      sessionId: activeSessionId,
      userId,
      input: trimmedMessage,
      output: reply.message,
    });

    const finalReply = safety.decision === 'allow' ? reply.message : safety.safeResponse || reply.message;

    await ChatSessionSummaryService.upsertSummary(activeSessionId, null, [intent.intent]);

    const assistantMessageId = await this._appendMessage({
      sessionId: activeSessionId,
      role: 'assistant',
      content: finalReply,
      intent,
      filters: intent.filters,
      metadata: { followups: reply.followups, item_ids: items.map((i) => i.id) },
    });

    return {
      intent: intent.intent,
      query: intent.query,
      filters: intent.filters,
      needs_clarification: false,
      message: finalReply,
      followups: reply.followups,
      items,
      session_id: activeSessionId,
      message_id: userMessageId,
      assistant_message_id: assistantMessageId,
      personalization: {
        user_profile: userProfile ? { updated_at: userProfile.updated_at } : null,
        session_memory: sessionMemory ? { updated_at: sessionMemory.updated_at } : null,
      },
    };
  }

  static async _extractIntent({ message, history, preferences, context, sessionId = null }) {
    const system = [
      'You are Muse, a fashion shopping assistant.',
      'Classify the user intent and extract explicit filters.',
      'Only include filters when the user clearly states them.',
      'If the request is ambiguous for search or styling, set needs_clarification=true and ask ONE concise question.',
      'Return JSON that matches the schema. The response MUST be valid JSON.',
    ].join(' ');

    const userPayload = {
      message,
      history,
      preferences,
      context,
    };

    const content = await this._callOpenAI({
      model: OPENAI_INTENT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Return JSON only. Input: ${JSON.stringify(userPayload)}` },
      ],
      response_format: { type: 'json_schema', json_schema: intentSchema },
      temperature: 0.2,
      max_tokens: 300,
      sessionId,
    });

    const parsed = this._safeJsonParse(content);
    if (!parsed) {
      return {
        intent: 'search',
        query: message,
        filters: {},
        needs_clarification: false,
        clarification_question: null,
      };
    }

    return parsed;
  }

  static async _generateReply({ message, history, preferences, intent, items, context, sessionId = null }) {
    const system = [
      'You are Muse, an editorial fashion assistant and search curator.',
      'Be warm, concise, and practical. Use short paragraphs and clear guidance.',
      'If items are provided, curate up to 5 picks, each with a reason grounded in the provided data.',
      'Never invent products. Only reference items provided in the catalog data.',
      'If no items are provided, offer editorial guidance and ask for one missing detail.',
      'If an image is provided, analyze the style, colors, and aesthetics to provide styling advice.',
      'Return JSON that matches the schema. The response MUST be valid JSON.',
    ].join(' ');

    const itemSummaries = items.map((item) => ({
      id: item.id,
      name: item.canonical_name,
      brand: item.brand_name,
      category: item.category,
      subcategory: item.subcategory,
      price: item.sale_price || item.min_price,
      sale_price: item.sale_price,
      image_url: item.primary_image_url,
    }));

    const userPayload = {
      message,
      history,
      preferences,
      intent,
      items: itemSummaries,
      context: { ...context, image: undefined }, // Don't include image data in JSON payload
    };

    // Check if image is provided and use vision model
    const hasImage = context && context.image;
    const modelToUse = hasImage ? 'gpt-4o' : OPENAI_MODEL;

    let userMessage;
    if (hasImage) {
      // Use vision format with image
      userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Return JSON only. Input: ${JSON.stringify(userPayload)}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: context.image,
            },
          },
        ],
      };
    } else {
      // Standard text-only format
      userMessage = {
        role: 'user',
        content: `Return JSON only. Input: ${JSON.stringify(userPayload)}`,
      };
    }

    const content = await this._callOpenAI({
      model: modelToUse,
      messages: [
        { role: 'system', content: system },
        userMessage,
      ],
      response_format: { type: 'json_schema', json_schema: replySchema },
      temperature: 0.6,
      max_tokens: 450,
      sessionId,
    });

    const parsed = this._safeJsonParse(content);
    if (!parsed) {
      return {
        message: 'I can help curate picks. Want a specific style, budget, or occasion? ',
        followups: ['What budget range?', 'What occasion is this for?', 'Any preferred colors?'],
      };
    }

    return parsed;
  }

  static async _searchItems(intent, fallbackQuery, userId = null, context = {}) {
    const filters = intent.filters || {};
    const query = intent.query || fallbackQuery;
    const recommendationMode = context && context.recommendation_mode;
    const mode = recommendationMode === 'personalized' && !query ? 'personalized' : 'search';

    const { items, sources, context: retrievalContext } = await ChatRetrievalService.retrieve({
      query,
      filters,
      limit: MAX_ITEMS,
      userId,
      mode,
    });
    return { items, sources, context: retrievalContext };
  }

  static async _callOpenAI({ model, messages, response_format, temperature, max_tokens, sessionId = null, messageId = null }) {
    const url = `${OPENAI_API_BASE}/chat/completions`;
    const start = Date.now();
    const res = await axios.post(
      url,
      {
        model,
        messages,
        response_format,
        temperature,
        max_tokens,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: parseInt(process.env.CHAT_MODEL_TIMEOUT_MS || '20000', 10),
      }
    );
    const latencyMs = Date.now() - start;

    const choice = res.data && res.data.choices && res.data.choices[0];
    const content = choice && choice.message && choice.message.content;
    if (!content) {
      throw new AppError('OpenAI response was empty', 502, 'OPENAI_EMPTY_RESPONSE');
    }

    if (res.data && res.data.usage) {
      await ChatUsageService.logUsage({
        sessionId,
        messageId,
        model,
        usage: res.data.usage,
        latencyMs,
      });
    }

    return content;
  }

  static _safeJsonParse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  static _normalizeHistory(history) {
    if (!Array.isArray(history)) return [];
    const filtered = history
      .filter((msg) => msg && typeof msg.content === 'string' && typeof msg.role === 'string')
      .map((msg) => ({
        role: msg.role,
        content: msg.content.slice(0, 1000),
      }));

    return filtered.slice(-MAX_HISTORY_ITEMS);
  }

  static async _ensureSession({ sessionId, userId, title, metadata }) {
    if (sessionId) {
      const existing = await pool.query('SELECT id, user_id FROM chat_sessions WHERE id = $1', [sessionId]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (!row.user_id && userId) {
          await pool.query('UPDATE chat_sessions SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [userId, sessionId]);
        } else {
          await pool.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [sessionId]);
        }
        return row.id;
      }
    }

    const result = await pool.query(
      'INSERT INTO chat_sessions (user_id, title, metadata) VALUES ($1, $2, $3) RETURNING id',
      [userId, title || null, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0].id;
  }

  static async _appendMessage({ sessionId, role, content, intent = null, filters = null, metadata = null }) {
    const result = await pool.query(
      'INSERT INTO chat_messages (session_id, role, content, intent, filters, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [
        sessionId,
        role,
        content,
        intent ? JSON.stringify(intent) : null,
        filters ? JSON.stringify(filters) : null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    await pool.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [sessionId]);
    return result.rows[0].id;
  }

  static async _loadHistoryFromSession(sessionId, limit) {
    const result = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2',
      [sessionId, limit]
    );
    return result.rows.reverse();
  }

  static async listSessions({ limit = 50, userId = null, query = null, from = null, to = null } = {}) {
    const params = [];
    let whereClauses = [];
    let idx = 1;

    if (userId) {
      whereClauses.push(`s.user_id = $${idx++}`);
      params.push(userId);
    }

    if (from) {
      whereClauses.push(`s.updated_at >= $${idx++}`);
      params.push(from);
    }

    if (to) {
      whereClauses.push(`s.updated_at <= $${idx++}`);
      params.push(to);
    }

    if (query) {
      whereClauses.push(`EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id AND m.content ILIKE $${idx++})`);
      params.push(`%${query}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    params.push(limit);

    const result = await pool.query(
      `SELECT
        s.id,
        s.user_id,
        s.title,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions s
      ${whereSql}
      ORDER BY s.updated_at DESC
      LIMIT $${idx}`,
      params
    );

    return result.rows;
  }

  
  static async getSessionNotes(sessionId) {
    const result = await pool.query(
      'SELECT id, session_id, admin_user_id, note, created_at FROM chat_session_notes WHERE session_id = $1 ORDER BY created_at DESC',
      [sessionId]
    );
    return result.rows;
  }

  static async addSessionNote(sessionId, adminUserId, note) {
    const result = await pool.query(
      'INSERT INTO chat_session_notes (session_id, admin_user_id, note) VALUES ($1, $2, $3) RETURNING *',
      [sessionId, adminUserId, note]
    );
    return result.rows[0];
  }

  static async getSessionExport(sessionId) {
    const sessionRes = await pool.query('SELECT id, user_id, title, created_at, updated_at, metadata FROM chat_sessions WHERE id = $1', [sessionId]);
    const messages = await this.getSessionMessages(sessionId);
    const notes = await this.getSessionNotes(sessionId);
    return {
      session: sessionRes.rows[0] || null,
      messages,
      notes,
    };
  }

  
  static async listTags() {
    const result = await pool.query('SELECT id, name, created_at FROM chat_session_tags ORDER BY name ASC');
    return result.rows;
  }

  static async createTag(name) {
    const result = await pool.query(
      'INSERT INTO chat_session_tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name]
    );
    return result.rows[0];
  }

  static async getSessionTags(sessionId) {
    const result = await pool.query(
      `SELECT t.id, t.name, m.created_at, m.created_by
       FROM chat_session_tag_map m
       JOIN chat_session_tags t ON m.tag_id = t.id
       WHERE m.session_id = $1
       ORDER BY t.name ASC`,
      [sessionId]
    );
    return result.rows;
  }

  static async addTagToSession(sessionId, tagId, adminUserId) {
    const result = await pool.query(
      'INSERT INTO chat_session_tag_map (session_id, tag_id, created_by) VALUES ($1, $2, $3) ON CONFLICT (session_id, tag_id) DO NOTHING RETURNING *',
      [sessionId, tagId, adminUserId]
    );
    return result.rows[0] || null;
  }

  static async removeTagFromSession(sessionId, tagId) {
    const result = await pool.query(
      'DELETE FROM chat_session_tag_map WHERE session_id = $1 AND tag_id = $2 RETURNING *',
      [sessionId, tagId]
    );
    return result.rows[0] || null;
  }

  
  static async listFlagQueue() {
    const result = await pool.query(
      `SELECT
        f.id,
        f.session_id,
        f.reason,
        f.status,
        f.created_by,
        f.created_at,
        s.user_id,
        s.updated_at,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
       FROM chat_session_flags f
       JOIN chat_sessions s ON s.id = f.session_id
       WHERE f.status = 'open'
       ORDER BY f.created_at DESC`
    );
    return result.rows;
  }

  static async setSessionLabel(sessionId, label) {
    const result = await pool.query(
      'UPDATE chat_sessions SET label = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, label',
      [label, sessionId]
    );
    return result.rows[0] || null;
  }

  
  static async exportRange({ from = null, to = null, onlyFlagged = false, flagStatus = null } = {}) {
    const params = [];
    let whereClauses = [];
    let idx = 1;
    const joinFlags = onlyFlagged || flagStatus ? 'JOIN chat_session_flags f ON f.session_id = s.id' : '';

    if (from) {
      whereClauses.push(`s.updated_at >= $${idx++}`);
      params.push(from);
    }

    if (to) {
      whereClauses.push(`s.updated_at <= $${idx++}`);
      params.push(to);
    }

    if (flagStatus) {
      whereClauses.push(`f.status = $${idx++}`);
      params.push(flagStatus);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sessions = await pool.query(
      `SELECT s.id, s.user_id, s.title, s.label, s.created_at, s.updated_at
       FROM chat_sessions s
       ${joinFlags}
       ${whereSql}
       ORDER BY s.updated_at DESC`,
      params
    );

    const messages = await pool.query(
      `SELECT m.id, m.session_id, m.role, m.content, m.created_at
       FROM chat_messages m
       JOIN chat_sessions s ON s.id = m.session_id
       ${joinFlags}
       ${whereSql}
       ORDER BY m.created_at ASC`,
      params
    );

    const notes = await pool.query(
      `SELECT n.id, n.session_id, n.admin_user_id, n.note, n.created_at
       FROM chat_session_notes n
       JOIN chat_sessions s ON s.id = n.session_id
       ${joinFlags}
       ${whereSql}
       ORDER BY n.created_at ASC`,
      params
    );

    const flags = await pool.query(
      `SELECT f.id, f.session_id, f.reason, f.status, f.created_by, f.created_at, f.resolved_at, f.resolved_by
       FROM chat_session_flags f
       JOIN chat_sessions s ON s.id = f.session_id
       ${whereSql}
       ORDER BY f.created_at ASC`,
      params
    );

    return {
      sessions: sessions.rows,
      messages: messages.rows,
      notes: notes.rows,
      flags: flags.rows,
    };
  }

  static async logExportRun({
    storageProvider,
    bucket,
    exportKey,
    format,
    onlyFlagged,
    from,
    to,
    status = 'completed',
    recordCounts = null,
    createdBy = null,
  }) {
    const result = await pool.query(
      `INSERT INTO chat_export_runs
        (storage_provider, bucket, export_key, format, only_flagged, from_date, to_date, status, record_counts, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        storageProvider,
        bucket || null,
        exportKey || null,
        format,
        onlyFlagged || false,
        from,
        to,
        status,
        recordCounts ? JSON.stringify(recordCounts) : null,
        createdBy,
      ]
    );
    return result.rows[0];
  }

  static async listExportRuns(limit = 100) {
    const result = await pool.query(
      `SELECT id, storage_provider, bucket, export_key, format, only_flagged, from_date, to_date, status, record_counts, created_by, created_at
       FROM chat_export_runs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async listSavedSearches(adminUserId = null) {
    const result = await pool.query(
      'SELECT id, name, admin_user_id, filters, created_at FROM chat_admin_saved_searches WHERE ($1::int IS NULL OR admin_user_id = $1) ORDER BY created_at DESC',
      [adminUserId]
    );
    return result.rows;
  }

  static async createSavedSearch(name, adminUserId, filters) {
    const result = await pool.query(
      'INSERT INTO chat_admin_saved_searches (name, admin_user_id, filters) VALUES ($1, $2, $3) RETURNING *',
      [name, adminUserId, JSON.stringify(filters)]
    );
    return result.rows[0];
  }

  static async deleteSavedSearch(id, adminUserId) {
    const result = await pool.query(
      'DELETE FROM chat_admin_saved_searches WHERE id = $1 AND ($2::int IS NULL OR admin_user_id = $2) RETURNING *',
      [id, adminUserId]
    );
    return result.rows[0] || null;
  }

  static async listFlags({ status = null } = {}) {
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE status = $1';
    }
    const result = await pool.query(
      `SELECT id, session_id, reason, status, created_by, created_at, resolved_at, resolved_by
       FROM chat_session_flags ${where} ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  }

  static async listReviewItems(status = 'open') {
    const result = await pool.query(
      `SELECT id, session_id, message_id, reason, status, priority, assigned_to, created_by, created_at, resolved_at, resolution_notes
       FROM chat_review_items
       WHERE status = $1
       ORDER BY priority ASC, created_at DESC`,
      [status]
    );
    return result.rows;
  }

  static async createReviewItem({ sessionId, messageId = null, reason, priority = 2, createdBy = null }) {
    const result = await pool.query(
      `INSERT INTO chat_review_items (session_id, message_id, reason, priority, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, messageId, reason, priority, createdBy]
    );
    const review = result.rows[0];
    if (review) {
      try {
        await ChatNotificationService.sendReviewAlert({
          reviewId: review.id,
          sessionId,
          reason,
        });
      } catch (error) {
        // Notifications should not block review creation.
      }
    }
    return review;
  }

  static async resolveReviewItem({ reviewId, resolvedBy = null, resolutionNotes = null }) {
    const result = await pool.query(
      `UPDATE chat_review_items
       SET status = 'resolved',
           resolved_at = CURRENT_TIMESTAMP,
           assigned_to = COALESCE($2, assigned_to),
           resolution_notes = $3
       WHERE id = $1
       RETURNING *`,
      [reviewId, resolvedBy, resolutionNotes]
    );
    return result.rows[0] || null;
  }

  static async createFlag(sessionId, reason, adminUserId) {
    const result = await pool.query(
      'INSERT INTO chat_session_flags (session_id, reason, status, created_by) VALUES ($1, $2, \'open\', $3) RETURNING *',
      [sessionId, reason, adminUserId]
    );
    return result.rows[0];
  }

  static async resolveFlag(flagId, adminUserId) {
    const result = await pool.query(
      'UPDATE chat_session_flags SET status = \'resolved\', resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 WHERE id = $2 RETURNING *',
      [adminUserId, flagId]
    );
    return result.rows[0] || null;
  }

  static async getAnalytics({ from = null, to = null } = {}) {
    const params = [];
    let where = "WHERE role = 'user'";
    let idx = 1;

    if (from) {
      where += ` AND created_at >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      where += ` AND created_at <= $${idx++}`;
      params.push(to);
    }

    const intents = await pool.query(
      `SELECT COALESCE(intent->>'intent', 'unknown') as intent, COUNT(*)::int as count
       FROM chat_messages ${where} AND intent IS NOT NULL
       GROUP BY intent
       ORDER BY count DESC`,
      params
    );

    const queries = await pool.query(
      `SELECT intent->>'query' as query, COUNT(*)::int as count
       FROM chat_messages ${where} AND intent IS NOT NULL AND intent->>'query' IS NOT NULL
       GROUP BY query
       ORDER BY count DESC
       LIMIT 20`,
      params
    );

    const total = await pool.query(
      `SELECT COUNT(*)::int as total_messages FROM chat_messages ${where}`,
      params
    );

    return {
      total_messages: total.rows[0]?.total_messages || 0,
      intents: intents.rows,
      top_queries: queries.rows,
    };
  }

static async getSessionMessages(sessionId) {
    const result = await pool.query(
      'SELECT id, role, content, intent, filters, metadata, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return result.rows;
  }

  static async submitFeedback(messageId, rating, notes = null) {
    const result = await pool.query(
      'INSERT INTO chat_feedback (message_id, rating, notes) VALUES ($1, $2, $3) RETURNING *',
      [messageId, rating, notes]
    );
    await ChatFeedbackService.recordFeedback({ messageId, rating });
    return result.rows[0];
  }

  static _buildDemoResponse(message) {
    const reply = [
      "Totally — here’s a minimalist 5-piece capsule that’s neutral, arm-friendly, and long-lasting:",
      "1. Long-sleeve rib knit tee (oatmeal or taupe)",
      "2. Structured overshirt or light jacket (olive or stone)",
      "3. Straight-leg trouser (charcoal or espresso)",
      "4. Midi skirt or wide-leg pant (sand or camel)",
      "5. Longline cardigan or knit blazer (mocha or warm gray)",
      "",
      "If you share your sizes and whether you prefer pants over skirts, I can curate exact pieces.",
    ].join("\n");

    return {
      intent: "mixed",
      query: message,
      filters: {
        min_price: null,
        max_price: null,
        categories: ["tops", "outerwear", "bottoms", "knitwear"],
        subcategories: null,
        attributes: ["minimalist", "neutral", "earth-tones", "long-sleeve"],
        on_sale: null,
        in_stock: null,
        sort_by: null,
      },
      needs_clarification: true,
      message: reply,
      followups: [
        "What sizes do you typically wear for tops and bottoms?",
        "Do you prefer pants only, or are skirts okay?",
        "Any specific budget range per item?",
      ],
      items: [],
      session_id: `demo-${Date.now()}`,
      message_id: null,
      assistant_message_id: null,
    };
  }
  static _inferTitle(message) {
    if (!message) return null;
    const words = message.split(/\s+/).slice(0, 6).join(' ');
    return words.length > 0 ? words : null;
  }

  static async _getPreferencesSafe(userId) {
    if (!userId) return null;
    try {
      return await PreferencesService.getPreferences(userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Track product recommendations in style profile
   * Log 'click' events for each recommended item with its style metadata
   */
  static async _trackRecommendationsInStyleProfile(userId, items) {
    if (!userId || !items || items.length === 0) return;

    try {
      // Track up to first 3 items to avoid overwhelming the style profile
      const topItems = items.slice(0, 3);

      for (const item of topItems) {
        // Extract style metadata from item
        const styleArchetype = item.style_tags && item.style_tags.length > 0
          ? item.style_tags[0]
          : null;

        await StyleProfileService.updateProfile(
          userId,
          'click', // Chat recommendation view = click event (weight 0.5)
          'product',
          item.id,
          {
            style_archetype: styleArchetype,
            price_tier: item.price_tier || null,
            category_focus: this._mapCategoryToFocus(item.category),
            occasion_tag: item.occasion_tag || null
          }
        );
      }
    } catch (error) {
      // Don't fail the chat response if style tracking fails
      console.warn('Failed to track chat recommendations in style profile:', error.message);
    }
  }

  /**
   * Map product category to category_focus
   */
  static _mapCategoryToFocus(category) {
    const categoryMap = {
      'Handbags & Wallets': 'bags',
      'Shoes': 'shoes',
      'Denim': 'denim',
      'Workwear': 'workwear',
      'Dresses': 'occasion',
      'Accessories': 'accessories',
      'Activewear': 'active',
      'Athletic & Sneakers': 'active'
    };

    return categoryMap[category] || 'mixed';
  }
}

module.exports = ChatService;
