// Model Injector Pro for ChatGPT — page-context script

(function () {
    'use strict';

    const PREFIX = 'cgpt_v12_';
    const IS_TOP_FRAME = window.top === window;
    const SCRIPT_BUILD = '2026-08-25-pow-difficulty-v23';
    const PROJECT_REPOSITORY_URL = 'https://github.com/simplez2/model-injector-pro';
    const PACKET_LOG_LIMIT = 48;
    const MODELS_ENDPOINT = '/backend-api/models';
    const CES_STATS_ENDPOINT = '/ces/statsc/flush';
    const SENTINEL_REQUIREMENTS_PREPARE_PATH_RE = /^\/(?:backend-api|backend-anon|api|unauth-mweb)\/sentinel\/chat-requirements(?:\/prepare)?\/?$/i;
    const SENTINEL_REQUIREMENTS_FINALIZE_PATH_RE = /^\/(?:backend-api|backend-anon|api|unauth-mweb)\/sentinel\/chat-requirements\/finalize\/?$/i;
    // PoW diagnostics read only the public requirement metadata. Never keep seed, proof, or token contents.
    const WORKSPACE_AGENT_PREFIX = 'workspace-agent:';
    const HERMES_AGENT_PATH_RE = /\/backend-api\/hermes\/agent\/(agt_[a-z0-9_:-]+)(?:\/|$)/i;
    const AGENT_PAGE_PATH_RE = /\/agents\/a\/(agt_[a-z0-9_:-]+)/i;
    const AGENT_LINK_SELECTOR = 'a[href*="/agents/a/"], [href*="/agents/a/"], [data-href*="/agents/a/"]';
    const CONVERSATION_SURFACE_SELECTOR = '[data-message-author-role], [data-testid^="conversation-turn-"], article';
    const CHAT_CONVERSATION_PATH_RE = /\/c\/([0-9a-f]{8}-[0-9a-f-]{20,})/i;
    const BACKEND_CONVERSATION_PATH_RE = /\/backend-api\/conversation\/([0-9a-f]{8}-[0-9a-f-]{20,})/i;
    const CONVERSATION_ID_FIELD_RE = /^(?:id|conversation_id|conversationId|conversation|conversation_uuid|conversationUuid)$/i;
    const WORKSPACE_AGENT_RECORD_IGNORED_KEY_RE = /prompt|instructions?|system_message/i;
    const WORKSPACE_AGENT_MARKER_IGNORED_KEY_RE = /prompt|content|text|parts/i;
    const WORKSPACE_AGENT_SYSTEM_HINT_KEY_RE = /^(?:system_hints|systemHints)$/i;
    const WORKSPACE_AGENT_CUSTOM_RUN_RE = /custom[_-]?agent[_-]?run/i;
    const WORKSPACE_AGENT_AUTHOR_STRING_KEY_RE = /^(?:content|parts|text|message|messages)$/i;
    const STRUCTURED_AGENT_CONTAINER_KEY_RE = /^(?:metadata|client_contextual_info|conversation_mode|conversationMode|system_hints|systemHints|mode|tools?|selected_tools|selectedTools|enabled_tools|enabledTools|features?|workspace|gizmo|assistant)$/i;
    const STREAM_CONTENT_TYPE_RE = /text\/event-stream|application\/x-ndjson/i;
    const RESPONSE_CAPTURE_CONTENT_TYPE_RE = /text\/event-stream|application\/x-ndjson|json/i;
    const BUTTON_SIZE = 56;
    const VIEW_MARGIN = 12;
    const PANEL_MAIN_HEIGHT = 680;
    const PANEL_SETTINGS_HEIGHT = 604;
    const PANEL_MIN_SIDE_HEIGHT = 280;
    const PANEL_MOTION_DURATION = 400;
    const PANEL_MOTION_CLOSE_RATE = 1.12;
    const PANEL_MOTION_PRIME_LEASE = 300;
    const PANEL_FIRST_PAINT_IDLE_TIMEOUT = 240;
    const PANEL_MOTION_SAMPLE_COUNT = 25;
    const PANEL_MOTION_CONTENT_DELAY = 0.22;
    const PANEL_VIEW_MOTION_DURATION = 420;
    const DROPDOWN_MOTION_DURATION = 230;
    const DROPDOWN_MOTION_SAMPLE_COUNT = 11;
    const BUTTON_RING = 194.78;
    const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const COLORS = ['#007aff', '#2563eb', '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
    const EFFORTS = ['light', 'standard', 'extended', 'heavy'];
    const EFFORT_ALIASES = {
        light: ['min', 'none', 'low', 'light'],
        standard: ['standard', 'medium'],
        extended: ['extended', 'high'],
        heavy: ['max', 'xhigh', 'heavy']
    };
    const EFFORT_FALLBACKS = {
        light: 'min',
        standard: 'standard',
        extended: 'extended',
        heavy: 'max'
    };
    // [slug, displayName, thinking, group]
    // Catalog synced 2026-07-10 from /backend-api/models (title: Latest / GPT-5.5)
    // "latest" version now exposes official gpt-5-6-thinking + gpt-5-6-pro (not work-mode).
    const PRESETS = [
        ['auto', 'Auto', false, 'default'],
        // Latest — official GPT-5.6 product line
        ['gpt-5-6-pro', 'GPT-5.6 Pro', true, 'current'],
        ['gpt-5-6-thinking', 'GPT-5.6 Thinking', true, 'current'],
        // GPT-5.5 product line
        ['gpt-5-5-pro', 'GPT-5.5 Pro', true, 'current'],
        ['gpt-5-5-thinking', 'GPT-5.5 Thinking', true, 'current'],
        ['gpt-5-5-instant', 'GPT-5.5 Instant', false, 'current'],
        ['gpt-5-5', 'GPT-5.5', false, 'current'],
        ['gpt-5-5-mini', 'GPT-5.5 Mini', false, 'current'],
        // Soft-deprecated 5.4 / 5.3 (hard deprecation 2026-07-23)
        ['gpt-5-4-pro', 'GPT-5.4 Pro', true, 'current'],
        ['gpt-5-4-thinking', 'GPT-5.4 Thinking', true, 'current'],
        ['gpt-5-4-t-mini', 'GPT-5.4 Thinking Mini', true, 'current'],
        ['gpt-5-3-instant', 'GPT-5.3 Instant', false, 'current'],
        ['gpt-5-3', 'GPT-5.3', false, 'current'],
        ['gpt-5-3-mini', 'GPT-5.3 Mini', false, 'current'],
        // Reasoning / special
        ['o3', 'o3', true, 'reasoning'],
        ['research', 'Deep Research', true, 'special'],
        ['agent-mode', 'Agent', false, 'special'],
        // Work Mode internal slugs (dotted version, is_work_mode_model)
        // Note: normal chat may silently fall back; keep for experimental inject.
        ['gpt-5.5-wm', 'GPT-5.5 Work', true, 'work'],
        ['gpt-5.5-cca-wm', 'GPT-5.5 CCA', true, 'work'],
        ['gpt-5.6-sol-wm', 'GPT-5.6 Sol', true, 'work'],
        ['gpt-5.6-terra-wm', 'GPT-5.6 Terra', true, 'work'],
        ['gpt-5.6-luna-wm', 'GPT-5.6 Luna', true, 'work'],
        // Legacy inject targets
        ['gpt-5-2', 'GPT-5.2', false, 'legacy'],
        ['gpt-5-2-instant', 'GPT-5.2 Instant', false, 'legacy'],
        ['gpt-5-2-thinking', 'GPT-5.2 Thinking', true, 'legacy'],
        ['gpt-5-2-pro', 'GPT-5.2 Pro', true, 'legacy'],
        ['gpt-5-1', 'GPT-5.1', false, 'legacy'],
        ['gpt-5-1-instant', 'GPT-5.1 Instant', false, 'legacy'],
        ['gpt-5-1-thinking', 'GPT-5.1 Thinking', true, 'legacy'],
        ['gpt-5-1-pro', 'GPT-5.1 Pro', true, 'legacy'],
        ['gpt-5', 'GPT-5', false, 'legacy'],
        ['gpt-5-instant', 'GPT-5 Instant', false, 'legacy'],
        ['gpt-5-thinking', 'GPT-5 Thinking', true, 'legacy'],
        ['gpt-5-mini', 'GPT-5 Mini', false, 'legacy'],
        ['gpt-5-t-mini', 'GPT-5 Thinking Mini', true, 'legacy'],
        ['gpt-5-pro', 'GPT-5 Pro', true, 'legacy'],
        ['gpt-4.5', 'GPT-4.5', false, 'legacy'],
        ['chatgpt_alpha_model_external_access_reserved_gate_13', 'Alpha', true, 'special']
    ];
    const MODELS_REQUEST_HEADER_ALLOWLIST = new Set([
        'accept',
        'accept-language',
        'authorization',
        'chatgpt-account-id',
        'oai-client-build-number',
        'oai-client-version',
        'oai-language',
        'x-openai-target-path',
        'x-openai-target-route'
    ]);
    const HIDDEN_MODEL_IDS = new Set([
        'gpt-5-3-thinking'
    ]);
    function isHiddenModelId(id) {
        const value = String(id || '').trim().toLowerCase();
        if (!value) return false;
        if (HIDDEN_MODEL_IDS.has(value)) return true;
        if (/^o4-mini(?:$|-)/i.test(value)) return true;
        if (/^gpt-4/i.test(value) && !/^(?:gpt-4\.5|gpt-4-5)(?:$|-)/i.test(value)) return true;
        return false;
    }
    const PRESET_ORDER = new Map(PRESETS.map((item, index) => [item[0], index]));
    const SPECIAL_MODEL_IDS = new Set(PRESETS.filter(([, , , group]) => group === 'special').map(([id]) => id));
    const MENU_LABELS = {
        auto: 'Auto',
        // 5.6 official
        'gpt-5-6-pro': 'Pro',
        'gpt-5-6-thinking': 'Thinking',
        // 5.5
        'gpt-5-5': 'Auto',
        'gpt-5-5-instant': 'Instant',
        'gpt-5-5-thinking': 'Thinking',
        'gpt-5-5-pro': 'Pro',
        'gpt-5-5-mini': 'Mini',
        // 5.4
        'gpt-5-4-pro': 'Pro',
        'gpt-5-4-thinking': 'Thinking',
        'gpt-5-4-t-mini': 'Thinking Mini',
        // 5.3
        'gpt-5-3': 'Standard',
        'gpt-5-3-instant': 'Instant',
        'gpt-5-3-mini': 'Mini',
        // 5.2 / 5.1 / 5
        'gpt-5-2': 'Standard',
        'gpt-5-2-instant': 'Instant',
        'gpt-5-2-thinking': 'Thinking',
        'gpt-5-2-pro': 'Pro',
        'gpt-5-1': 'Standard',
        'gpt-5-1-instant': 'Instant',
        'gpt-5-1-thinking': 'Thinking',
        'gpt-5-1-pro': 'Pro',
        'gpt-5': 'Standard',
        'gpt-5-instant': 'Instant',
        'gpt-5-thinking': 'Thinking',
        'gpt-5-t-mini': 'Thinking Mini',
        'gpt-5-mini': 'Mini',
        'gpt-5-pro': 'Pro',
        // Work Mode (dotted slugs)
        'gpt-5.5-wm': 'Work',
        'gpt-5.5-cca-wm': 'CCA',
        'gpt-5.6-sol-wm': 'Sol',
        'gpt-5.6-terra-wm': 'Terra',
        'gpt-5.6-luna-wm': 'Luna',
        // Other
        'o3': 'o3',
        'o3-pro': 'o3-pro',
        'gpt-4.5': 'GPT-4.5',
        'gpt-4-5': 'GPT-4.5',
        research: 'Deep Research',
        'agent-mode': 'Agent',
        chatgpt_alpha_model_external_access_reserved_gate_13: 'Alpha'
    };
    // Family matchers: accept both hyphen (gpt-5-5 / gpt-5-6-thinking)
    // and dotted work-mode slugs (gpt-5.5-wm / gpt-5.6-terra-wm).
    // Longer / more specific families must come first.
    const MODEL_MENU_SECTIONS = [
        {
            key: 'gpt',
            titleKey: 'section_gpt',
            families: [
                ['GPT-5.6', /^gpt-5[.-]6(?:$|-)/i],
                ['GPT-5.5', /^gpt-5[.-]5(?:$|-)/i],
                ['GPT-5.4', /^gpt-5[.-]4(?:$|-)/i],
                ['GPT-5.3', /^gpt-5[.-]3(?:$|-)/i],
                ['GPT-5.2', /^gpt-5[.-]2(?:$|-)/i],
                ['GPT-5.1', /^gpt-5[.-]1(?:$|-)/i],
                ['GPT-5', /^gpt-5(?:$|-)/i]
            ]
        },
        {
            key: 'o3',
            titleKey: 'section_o3',
            families: [
                ['o3', /^o3(?:$|-)/i]
            ]
        },
        {
            key: 'gpt4',
            titleKey: 'section_gpt4',
            families: [
                ['GPT-4.5', /^(?:gpt-4\.5|gpt-4-5)(?:$|-)/i]
            ]
        },
        {
            key: 'special',
            titleKey: 'section_special',
            families: [
                ['Special', /^(research|agent-mode|chatgpt_alpha_model_external_access_reserved_gate_13)$/i]
            ]
        }
    ];
    const LOAD_DELAY = 1500;
    const PRESET_MAP = new Map(PRESETS.map(([id, name, thinking, group]) => [id, { id, name, thinking, group }]));
    const TOKEN_CACHE_LIMIT = 256;
    const TOKEN_PRECISE_CHAR_LIMIT = 12000;
    const tokenCache = new Map();
    let preciseTokenTimer = 0;
    let tokenBurstUntil = 0;
    let packetLog = [];
    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    const nativeSendBeacon = typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : null;
    const nativeXHROpen = window.XMLHttpRequest?.prototype?.open;
    const nativeXHRSend = window.XMLHttpRequest?.prototype?.send;

    const S = {
        on: readMainToggle(),
        model: readString('m', ''),
        effort: readString('e', 'standard'),
        effortOn: readFlag('eo', false),
        debug: readFlag('d', false),
        privacyOn: readFlag('pv', false),
        privacyTzMode: readString('pvtz', 'auto'),
        privacyLangMode: readString('pvlang', 'auto'),
        lang: readString('lang', 'zh-CN'),
        bgColor: readString('bg', '#007aff'),
        diagOpen: readFlag('diag_open', false),
        api: sanitizeApiList(readJson('api', [])),
        agents: sanitizeWorkspaceAgentList(readJson('agents', [])),
        lastAgentFetch: readString('laf', ''),
        custom: sanitizeStringList(readJson('custom', [])),
        recent: sanitizeStringList(readJson('recent', [])),
        lastFetch: readString('lf', ''),
        pos: readJson('pos', null),
        cnt: 0
    };
    const liveApiModelIds = new Set();
    let apiEntryCacheSource = null;
    let apiEntryCache = new Map();
    const menuModelCache = {
        source: null,
        items: [],
        presentations: new Map()
    };
    if (S.model === 'auto') S.model = '';
    if (!EFFORTS.includes(S.effort)) S.effort = 'standard';
    if (isHiddenModelId(S.model)) S.model = '';
    if (Array.isArray(S.custom)) S.custom = S.custom.filter(id => !isHiddenModelId(id));
    if (Array.isArray(S.recent)) S.recent = S.recent.filter(id => !isHiddenModelId(id));
    if (!S.debug) writePacketLog([]);

    let host = null;
    let refs = {};
    let modelsRequestSnapshot = null;
    let lastSentinelFinalize = null;
    let lastPowDetection = null;
    let observer = null;
    let contextTimer = 0;
    let contextIdleJob = 0;
    let tokenRefreshDeferred = false;
    let suppressClick = false;
    let lastFocusedElement = null;
    let panelFocusFrame = 0;
    let panelFocusTimer = 0;
    let panelMotionAnimation = null;
    let panelContentMotionAnimation = null;
    let panelBridgeMotionAnimation = null;
    let hostBridgeMotionAnimation = null;
    let panelMotionAnimationKey = '';
    let panelMotionOpening = null;
    let panelMotionGeneration = 0;
    let panelMotionLayoutKey = '';
    let panelMotionPrimeFrame = 0;
    let panelMotionPrimeTimer = 0;
    let panelMotionGeometry = { originX: 340, originY: 652, shiftX: 0, shiftY: 44, width: 368, height: 680 };
    let panelFirstPaintIdleJob = 0;
    let panelFirstPaintIdleUsesTimeout = false;
    let panelFirstPaintFrame = 0;
    let panelFirstPaintGeneration = 0;
    let panelFirstPaintState = 'cold';
    let buttonPressTimer = 0;
    let buttonMotionTimer = 0;
    let liveCatalogSyncAttempted = false;
    let panelToggleGeneration = 0;
    let iconMotionCycle = 0;
    let dropdownMotionAnimation = null;
    let dropdownMotionOpening = null;
    let dropdownMotionGeneration = 0;
    let dropdownOpenFrame = 0;
    let dropdownRenderSignature = '';
    let dropdownWarmJob = 0;
    let modelMenuOfflineExpanded = false;
    let panelViewMotionGeneration = 0;
    let panelViewMotionAnimations = [];
    let hookInstalled = false;
    let wrappedFetch = null;
    let wrappedSendBeacon = null;
    let wrappedXHROpen = null;
    let wrappedXHRSend = null;
    let fetchHookKeepalive = 0;
    let calcFeedbackTimer = 0;
    let modelConfirmTimer = 0;
    let reducedMotionQuery = null;
    let lastStats = { msgs: 0, plain: 0, chat: null, used: 0, limit: 196000, pct: 0 };
    let modelSyncStatus = 'idle';
    let injectionDiagnostic = {
        selected: '',
        lastModel: '',
        originalModel: '',
        thinkingEffort: '',
        effortRequested: '',
        effortEnabled: false,
        effortApplied: false,
        responseModel: '',
        routeStatus: 'unknown',
        workspaceAgentId: '',
        workspaceAgentName: '',
        workspaceAgentStatus: 'unknown',
        at: '',
        error: '',
        skipReason: '',
        packetRequest: null,
        packetResponse: null,
        pow: null
    };

    function cleanupStaleUi() {
        document.querySelectorAll('[id="mi"]').forEach(node => node.remove());
        document.querySelectorAll('.mi-tooltip').forEach(node => node.remove());
    }

    function getTooltipElement() {
        const tooltips = [...document.querySelectorAll('.mi-tooltip')];
        if (tooltips.length > 1) tooltips.slice(1).forEach(node => node.remove());
        if (tooltips[0]) return tooltips[0];

        const element = document.createElement('div');
        element.className = 'mi-tooltip';
        document.body.appendChild(element);
        return element;
    }

    const LANGUAGE_OPTIONS = [
        ['zh-CN', '中文'],
        ['en', 'English'],
        ['ja', '日本語'],
        ['ru', 'Русский']
    ];

    const I18N = {
        'zh-CN': {
            group_default: '默认',
            group_current: '当前 GPT-5',
            group_reasoning: '推理',
            group_legacy: '历史',
            group_special: '特殊',
            group_api: '发现',
            section_gpt: 'GPT 系列',
            section_o3: 'o3 系列',
            section_gpt4: 'GPT-4 系列',
            section_special: '特殊能力',
            section_workspace_agents: 'Workspace Agent',
            default_model: '默认模型',
            workspace_agent: 'Workspace Agent',
            workspace_agent_detected: '已检测',
            workspace_agent_ready: '已保持',
            workspace_agent_pending: '待请求确认',
            workspace_agent_open: '打开 Agent',
            workspace_agent_required: '当前请求未处于该 Agent 上下文',
            workspace_agent_none: '未探测',
            search_models: '搜索模型或 Agent',
            search_models_hint: '输入 / 只看 Workspace Agent',
            search_quick_title: '快速查找',
            search_placeholder: '输入模型、Agent 或 slug',
            search_agent_mode: 'Workspace Agent 模式',
            search_clear: '清除搜索',
            no_menu_results: '没有匹配结果',
            custom_group: '自定义',
            delete_custom_model: '删除自定义模型',
            title_enable: '启用注入',
            subtitle_enable: '覆盖请求',
            title_effort: '思考深度',
            subtitle_effort: '推理模型生效',
            state_on: '已开启',
            state_off: '已关闭',
            title_context: '上下文用量',
            used: '已用',
            free: '剩余',
            messages: '消息',
            limit: '上限',
            settings: '设置',
            theme_color: '主题颜色',
            custom_color: '自定义颜色',
            debug_mode: '调试模式（打开控制台查看日志）',
            privacy_title: '隐私优先',
            privacy_body: '抓包诊断仅保留在内存中，关闭调试模式后会立即清除。',
            privacy_spoof: 'IP 伪装',
            privacy_subtitle: '时区与语言伪装（默认关闭）',
            privacy_timezone: '时区',
            privacy_language: '主语言',
            privacy_auto: '自动匹配出口 IP',
            privacy_status_none: '未检测出口位置',
            privacy_status_loading: '正在检测出口位置…',
            privacy_status_geo: '出口位置',
            privacy_status_error: '检测失败，请重试',
            privacy_refresh: '重新检测',
            diagnostic_clear: '清除诊断',
            language: '语言',
            choose_model: '选择模型',
            refresh_list: '刷新列表',
            refresh_context: '刷新上下文统计',
            add_model: '添加模型 slug',
            support_dev: '感谢开发者',
            view_repository: '项目仓库',
            tooltip_context: '上下文长度',
            tooltip_reasoning: '推理类型',
            tooltip_version: '版本',
            online: '在线',
            online_models: '在线模型',
            offline_models: '未在线模型',
            show_offline_models: '展开未在线模型',
            hide_offline_models: '收起未在线模型',
            paused: '已暂停',
            status_ready: '就绪',
            models_unit: '个模型',
            status_no_models: '尚未加载模型',
            sync_idle: '待同步',
            sync_syncing: '同步中',
            sync_updated: '已更新',
            sync_failed: '同步失败',
            sync_cached: '使用缓存请求头',
            diagnostic_title: '注入诊断',
            diagnostic_selected: '当前模型',
            diagnostic_last: '上次改写',
            diagnostic_effort: '思考深度',
            diagnostic_response_model: '响应模型',
            diagnostic_pow: 'PoW 难度',
            pow_not_seen: '尚未获取',
            pow_absent: '未返回 difficulty',
            pow_not_required: '无需 PoW',
            pow_grade_excellent: '优秀',
            pow_grade_normal: '正常',
            pow_grade_elevated: '风险偏高',
            pow_grade_high_risk: '高风险',
            pow_grade_unknown: '未知',
            pow_grade_disclaimer: '评级按公开社区工具常用的十六进制有效位数规则生成，仅供趋势参考，不是 OpenAI 官方等级。',
            diagnostic_workspace_agent: 'Workspace Agent',
            diagnostic_error: '失败原因',
            diagnostic_none: '无',
            diagnostic_not_yet: '尚未改写',
            diagnostic_skipped_agent: '已跳过代理模式',
            diagnostic_expand: '展开诊断',
            diagnostic_collapse: '收起诊断',
            diagnostic_export: '导出抓包留档',
            diagnostic_status_ok: '无异常',
            diagnostic_status_error: '有失败',
            route_unknown: '未探测',
            route_hidden: '未暴露',
            route_same: '一致',
            route_routed: '已路由',
            route_skipped: '已跳过',
            effort_disabled: '未启用',
            effort_not_applied: '未应用',
            effort_light: '快速',
            effort_standard: '标准',
            effort_extended: '进阶',
            effort_heavy: '深入',
            effort_light_sub: '响应最快',
            effort_standard_sub: '默认平衡',
            effort_extended_sub: '更多推理',
            effort_heavy_sub: '最大强度',
            custom_subtitle: '自定义',
            auto_label: '自动'
        },
        'en': {
            group_default: 'Default',
            group_current: 'Current GPT-5',
            group_reasoning: 'Reasoning',
            group_legacy: 'Legacy',
            group_special: 'Special',
            group_api: 'Discovered',
            section_gpt: 'GPT Series',
            section_o3: 'o3 Series',
            section_gpt4: 'GPT-4 Series',
            section_special: 'Special Capabilities',
            section_workspace_agents: 'Workspace Agent',
            default_model: 'Default model',
            workspace_agent: 'Workspace Agent',
            workspace_agent_detected: 'Detected',
            workspace_agent_ready: 'Preserved',
            workspace_agent_pending: 'Awaiting request check',
            workspace_agent_open: 'Open agent',
            workspace_agent_required: 'Current request is not in this agent context',
            workspace_agent_none: 'Not detected',
            search_models: 'Search models or agents',
            search_models_hint: 'Type / for Workspace Agent only',
            search_quick_title: 'Quick find',
            search_placeholder: 'Type model, Agent, or slug',
            search_agent_mode: 'Workspace Agent mode',
            search_clear: 'Clear search',
            no_menu_results: 'No matching results',
            custom_group: 'Custom',
            delete_custom_model: 'Delete custom model',
            title_enable: 'Enable override',
            subtitle_enable: 'Override request',
            title_effort: 'Thinking effort',
            subtitle_effort: 'Applies to reasoning models',
            state_on: 'On',
            state_off: 'Off',
            title_context: 'Context usage',
            used: 'Used',
            free: 'Free',
            messages: 'Messages',
            limit: 'Limit',
            settings: 'Settings',
            theme_color: 'Theme color',
            custom_color: 'Custom color',
            debug_mode: 'Debug mode (open console for logs)',
            privacy_title: 'Privacy by default',
            privacy_body: 'Packet diagnostics stay in memory and are erased when debug mode is turned off.',
            privacy_spoof: 'IP spoofing',
            privacy_subtitle: 'Timezone & language masking (off by default)',
            privacy_timezone: 'Timezone',
            privacy_language: 'Main language',
            privacy_auto: 'Match egress IP automatically',
            privacy_status_none: 'Egress location not detected yet',
            privacy_status_loading: 'Detecting egress location…',
            privacy_status_geo: 'Egress',
            privacy_status_error: 'Detection failed, try again',
            privacy_refresh: 'Redetect',
            diagnostic_clear: 'Clear diagnostics',
            language: 'Language',
            choose_model: 'Choose model',
            refresh_list: 'Refresh list',
            refresh_context: 'Refresh context stats',
            add_model: 'Add model slug',
            support_dev: 'Support developer',
            view_repository: 'Source repository',
            tooltip_context: 'Context window',
            tooltip_reasoning: 'Reasoning mode',
            tooltip_version: 'Version',
            online: 'Online',
            online_models: 'Online models',
            offline_models: 'Offline models',
            show_offline_models: 'Show offline models',
            hide_offline_models: 'Hide offline models',
            paused: 'Paused',
            status_ready: 'Ready',
            models_unit: 'models',
            status_no_models: 'No models loaded',
            sync_idle: 'Idle',
            sync_syncing: 'Syncing',
            sync_updated: 'Updated',
            sync_failed: 'Failed',
            sync_cached: 'Using cached headers',
            diagnostic_title: 'Injection diagnostics',
            diagnostic_selected: 'Selected model',
            diagnostic_last: 'Last rewrite',
            diagnostic_effort: 'Thinking effort',
            diagnostic_response_model: 'Response model',
            diagnostic_pow: 'PoW difficulty',
            pow_not_seen: 'Not captured',
            pow_absent: 'No difficulty returned',
            pow_not_required: 'PoW not required',
            pow_grade_excellent: 'Excellent',
            pow_grade_normal: 'Normal',
            pow_grade_elevated: 'Elevated risk',
            pow_grade_high_risk: 'High risk',
            pow_grade_unknown: 'Unknown',
            pow_grade_disclaimer: 'The rating uses a hexadecimal significant-digit rule commonly used by community tools. It is for trend reference only, not an official OpenAI rating.',
            diagnostic_workspace_agent: 'Workspace Agent',
            diagnostic_error: 'Failure reason',
            diagnostic_none: 'None',
            diagnostic_not_yet: 'Not yet',
            diagnostic_skipped_agent: 'Skipped agent mode',
            diagnostic_expand: 'Expand diagnostics',
            diagnostic_collapse: 'Collapse diagnostics',
            diagnostic_export: 'Export packet log',
            diagnostic_status_ok: 'No failure',
            diagnostic_status_error: 'Failure',
            route_unknown: 'Not checked',
            route_hidden: 'Not exposed',
            route_same: 'Same',
            route_routed: 'Routed',
            route_skipped: 'Skipped',
            effort_disabled: 'Disabled',
            effort_not_applied: 'Not applied',
            effort_light: 'Light',
            effort_standard: 'Standard',
            effort_extended: 'Extended',
            effort_heavy: 'Heavy',
            effort_light_sub: 'Fastest response',
            effort_standard_sub: 'Balanced default',
            effort_extended_sub: 'More reasoning',
            effort_heavy_sub: 'Maximum depth',
            custom_subtitle: 'Custom',
            auto_label: 'Auto'
        },
        'ja': {
            group_default: 'デフォルト',
            group_current: '現在の GPT-5',
            group_reasoning: '推論',
            group_legacy: '旧モデル',
            group_special: '特別',
            group_api: '検出モデル',
            section_gpt: 'GPTシリーズ',
            section_o3: 'o3シリーズ',
            section_gpt4: 'GPT-4シリーズ',
            section_special: '特殊機能',
            section_workspace_agents: 'Workspace Agent',
            default_model: 'デフォルトモデル',
            workspace_agent: 'Workspace Agent',
            workspace_agent_detected: '検出済み',
            workspace_agent_ready: '保持済み',
            workspace_agent_pending: 'リクエスト確認待ち',
            workspace_agent_open: 'Agent を開く',
            workspace_agent_required: '現在のリクエストはこの Agent の文脈ではありません',
            workspace_agent_none: '未検出',
            search_models: 'モデルまたは Agent を検索',
            search_models_hint: '/ で Workspace Agent のみ表示',
            search_quick_title: 'クイック検索',
            search_placeholder: 'モデル、Agent、slug を入力',
            search_agent_mode: 'Workspace Agent モード',
            search_clear: '検索をクリア',
            no_menu_results: '一致する結果がありません',
            custom_group: 'カスタム',
            delete_custom_model: 'カスタムモデルを削除',
            title_enable: '上書きを有効化',
            subtitle_enable: 'リクエストを上書き',
            title_effort: '思考強度',
            subtitle_effort: '推論モデルのみ有効',
            state_on: 'オン',
            state_off: 'オフ',
            title_context: 'コンテキスト使用量',
            used: '使用',
            free: '残り',
            messages: 'メッセージ',
            limit: '上限',
            settings: '設定',
            theme_color: 'テーマカラー',
            custom_color: 'カスタムカラー',
            debug_mode: 'デバッグモード（コンソールで確認）',
            privacy_title: 'プライバシー優先',
            privacy_body: 'パケット診断はメモリ内だけに保持され、デバッグモードをオフにすると消去されます。',
            privacy_spoof: 'IP なりすまし',
            privacy_subtitle: 'タイムゾーンと言語の偽装（既定はオフ）',
            privacy_timezone: 'タイムゾーン',
            privacy_language: '主要言語',
            privacy_auto: '出口 IP に自動一致',
            privacy_status_none: '出口位置は未検出です',
            privacy_status_loading: '出口位置を検出中…',
            privacy_status_geo: '出口',
            privacy_status_error: '検出に失敗しました。再試行してください',
            privacy_refresh: '再検出',
            diagnostic_clear: '診断を消去',
            language: '言語',
            choose_model: 'モデルを選択',
            refresh_list: '一覧を更新',
            refresh_context: 'コンテキストを更新',
            add_model: 'モデル slug を追加',
            support_dev: '開発者を支援',
            view_repository: 'ソースリポジトリ',
            tooltip_context: 'コンテキスト長',
            tooltip_reasoning: '推論タイプ',
            tooltip_version: 'バージョン',
            online: 'オンライン',
            online_models: 'オンラインモデル',
            offline_models: 'オフラインモデル',
            show_offline_models: 'オフラインモデルを表示',
            hide_offline_models: 'オフラインモデルを隠す',
            paused: '一時停止',
            status_ready: '準備完了',
            models_unit: 'モデル',
            status_no_models: 'モデル未読み込み',
            sync_idle: '待機中',
            sync_syncing: '同期中',
            sync_updated: '更新済み',
            sync_failed: '同期失敗',
            sync_cached: '保存済みヘッダーを使用',
            diagnostic_title: '注入診断',
            diagnostic_selected: '選択中モデル',
            diagnostic_last: '前回の書き換え',
            diagnostic_effort: '思考深度',
            diagnostic_response_model: '応答モデル',
            diagnostic_pow: 'PoW 難易度',
            pow_not_seen: '未取得',
            pow_absent: 'difficulty なし',
            pow_not_required: 'PoW 不要',
            pow_grade_excellent: '優秀',
            pow_grade_normal: '正常',
            pow_grade_elevated: 'リスクやや高め',
            pow_grade_high_risk: '高リスク',
            pow_grade_unknown: '不明',
            pow_grade_disclaimer: '評価はコミュニティツールで一般的な16進数の有効桁数ルールによる参考値で、OpenAI公式の評価ではありません。',
            diagnostic_workspace_agent: 'Workspace Agent',
            diagnostic_error: '失敗理由',
            diagnostic_none: 'なし',
            diagnostic_not_yet: 'まだありません',
            diagnostic_skipped_agent: 'エージェントモードをスキップ',
            diagnostic_expand: '診断を展開',
            diagnostic_collapse: '診断を閉じる',
            diagnostic_export: 'パケットログを書き出す',
            diagnostic_status_ok: '異常なし',
            diagnostic_status_error: '失敗あり',
            route_unknown: '未確認',
            route_hidden: '非公開',
            route_same: '一致',
            route_routed: 'ルーティング済み',
            route_skipped: 'スキップ済み',
            effort_disabled: '無効',
            effort_not_applied: '未適用',
            effort_light: '高速',
            effort_standard: '標準',
            effort_extended: '詳細',
            effort_heavy: '深い',
            effort_light_sub: '最速応答',
            effort_standard_sub: '標準バランス',
            effort_extended_sub: 'より多く推論',
            effort_heavy_sub: '最大深度',
            custom_subtitle: 'カスタム',
            auto_label: '自動'
        },
        'ru': {
            group_default: 'По умолчанию',
            group_current: 'Текущие GPT-5',
            group_reasoning: 'Рассуждение',
            group_legacy: 'Устаревшие',
            group_special: 'Специальные',
            group_api: 'Обнаруженные',
            section_gpt: 'Серия GPT',
            section_o3: 'Серия o3',
            section_gpt4: 'Серия GPT-4',
            section_special: 'Специальные возможности',
            section_workspace_agents: 'Workspace Agent',
            default_model: 'Модель по умолчанию',
            workspace_agent: 'Workspace Agent',
            workspace_agent_detected: 'Обнаружен',
            workspace_agent_ready: 'Сохранен',
            workspace_agent_pending: 'Ожидает проверки запроса',
            workspace_agent_open: 'Открыть Agent',
            workspace_agent_required: 'Текущий запрос не в контексте этого Agent',
            workspace_agent_none: 'Не обнаружен',
            search_models: 'Поиск моделей или Agent',
            search_models_hint: 'Введите / только для Workspace Agent',
            search_quick_title: 'Быстрый поиск',
            search_placeholder: 'Введите модель, Agent или slug',
            search_agent_mode: 'Режим Workspace Agent',
            search_clear: 'Очистить поиск',
            no_menu_results: 'Нет совпадений',
            custom_group: 'Пользовательские',
            delete_custom_model: 'Удалить пользовательскую модель',
            title_enable: 'Включить подмену',
            subtitle_enable: 'Переопределять запрос',
            title_effort: 'Глубина мышления',
            subtitle_effort: 'Только для reasoning-моделей',
            state_on: 'Включено',
            state_off: 'Выключено',
            title_context: 'Использование контекста',
            used: 'Использовано',
            free: 'Осталось',
            messages: 'Сообщения',
            limit: 'Лимит',
            settings: 'Настройки',
            theme_color: 'Цвет темы',
            custom_color: 'Свой цвет',
            debug_mode: 'Режим отладки (смотрите консоль)',
            privacy_title: 'Приватность по умолчанию',
            privacy_body: 'Диагностика пакетов хранится только в памяти и очищается при отключении режима отладки.',
            privacy_spoof: 'IP-маскировка',
            privacy_subtitle: 'Маскировка часового пояса и языка (по умолчанию выкл.)',
            privacy_timezone: 'Часовой пояс',
            privacy_language: 'Основной язык',
            privacy_auto: 'Авто по выходному IP',
            privacy_status_none: 'Выходное расположение не определено',
            privacy_status_loading: 'Определение выходного расположения…',
            privacy_status_geo: 'Выходной IP',
            privacy_status_error: 'Не удалось определить, повторите попытку',
            privacy_refresh: 'Повторить',
            diagnostic_clear: 'Очистить диагностику',
            language: 'Язык',
            choose_model: 'Выберите модель',
            refresh_list: 'Обновить список',
            refresh_context: 'Обновить контекст',
            add_model: 'Добавить slug модели',
            support_dev: 'Поддержать разработчика',
            view_repository: 'Репозиторий исходного кода',
            tooltip_context: 'Окно контекста',
            tooltip_reasoning: 'Режим рассуждения',
            tooltip_version: 'Версия',
            online: 'Онлайн',
            online_models: 'Онлайн-модели',
            offline_models: 'Неактивные модели',
            show_offline_models: 'Показать неактивные модели',
            hide_offline_models: 'Скрыть неактивные модели',
            paused: 'Пауза',
            status_ready: 'Готово',
            models_unit: 'моделей',
            status_no_models: 'Модели не загружены',
            sync_idle: 'Ожидание',
            sync_syncing: 'Синхронизация',
            sync_updated: 'Обновлено',
            sync_failed: 'Ошибка синхронизации',
            sync_cached: 'Используются сохраненные заголовки',
            diagnostic_title: 'Диагностика подмены',
            diagnostic_selected: 'Текущая модель',
            diagnostic_last: 'Последняя подмена',
            diagnostic_effort: 'Глубина мышления',
            diagnostic_response_model: 'Модель ответа',
            diagnostic_pow: 'Сложность PoW',
            pow_not_seen: 'Не получено',
            pow_absent: 'Difficulty не возвращён',
            pow_not_required: 'PoW не требуется',
            pow_grade_excellent: 'Отлично',
            pow_grade_normal: 'Норма',
            pow_grade_elevated: 'Повышенный риск',
            pow_grade_high_risk: 'Высокий риск',
            pow_grade_unknown: 'Неизвестно',
            pow_grade_disclaimer: 'Оценка основана на правиле значащих шестнадцатеричных разрядов, принятом в инструментах сообщества. Это лишь ориентир, а не официальная оценка OpenAI.',
            diagnostic_workspace_agent: 'Workspace Agent',
            diagnostic_error: 'Причина ошибки',
            diagnostic_none: 'Нет',
            diagnostic_not_yet: 'Еще не было',
            diagnostic_skipped_agent: 'Режим агента пропущен',
            diagnostic_expand: 'Развернуть диагностику',
            diagnostic_collapse: 'Свернуть диагностику',
            diagnostic_export: 'Экспорт журнала пакетов',
            diagnostic_status_ok: 'Без ошибок',
            diagnostic_status_error: 'Есть ошибка',
            route_unknown: 'Не проверено',
            route_hidden: 'Не раскрыто',
            route_same: 'Совпадает',
            route_routed: 'Маршрутизировано',
            route_skipped: 'Пропущено',
            effort_disabled: 'Выключено',
            effort_not_applied: 'Не применено',
            effort_light: 'Быстро',
            effort_standard: 'Стандарт',
            effort_extended: 'Расширенно',
            effort_heavy: 'Глубоко',
            effort_light_sub: 'Самый быстрый ответ',
            effort_standard_sub: 'Базовый баланс',
            effort_extended_sub: 'Больше рассуждений',
            effort_heavy_sub: 'Максимальная глубина',
            custom_subtitle: 'Пользовательская',
            auto_label: 'Авто'
        }
    };
    function t(key) {
        return I18N[S.lang]?.[key] || I18N.en[key] || key;
    }

    function storageKey(key) { return PREFIX + key; }
    function readString(key, fallback) { try { const value = localStorage.getItem(storageKey(key)); return value == null ? fallback : String(value); } catch { return fallback; } }
    function readJson(key, fallback) { try { const raw = localStorage.getItem(storageKey(key)); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
    function readFlag(key, fallback) { const value = readString(key, ''); return value ? value === '1' || value === 'true' : fallback; }
    function readMainToggle() { try { return localStorage.getItem(storageKey('on')) !== '0'; } catch { return true; } }
    function saveValue(key, value) { try { localStorage.setItem(storageKey(key), typeof value === 'string' ? value : String(value)); } catch {} }
    function saveJson(key, value) { try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch {} }
    function save(key, value) { typeof value === 'object' ? saveJson(key, value) : saveValue(key, value); }
    function readPacketLog() {
        return packetLog.slice();
    }
    function writePacketLog(entries) {
        packetLog = Array.isArray(entries) ? entries.slice(-PACKET_LOG_LIMIT) : [];
    }
    function clearDiagnosticArtifacts() {
        writePacketLog([]);
        lastPowDetection = null;
        document.documentElement.removeAttribute('data-mi-packet-log-size');
        document.documentElement.removeAttribute('data-mi-diagnostic');
    }

    // ===== Egress IP privacy spoofing (opt-in) =====

    const PRIVACY_TZ_SELECT_OPTIONS = [
        ['UTC', 'UTC'],
        ['Asia/Shanghai', 'Asia/Shanghai'],
        ['Asia/Hong_Kong', 'Asia/Hong_Kong'],
        ['Asia/Macau', 'Asia/Macau'],
        ['Asia/Taipei', 'Asia/Taipei'],
        ['Asia/Singapore', 'Asia/Singapore'],
        ['Asia/Kuala_Lumpur', 'Asia/Kuala_Lumpur'],
        ['Asia/Bangkok', 'Asia/Bangkok'],
        ['Asia/Jakarta', 'Asia/Jakarta'],
        ['Asia/Manila', 'Asia/Manila'],
        ['Asia/Ho_Chi_Minh', 'Asia/Ho_Chi_Minh'],
        ['Asia/Tokyo', 'Asia/Tokyo'],
        ['Asia/Seoul', 'Asia/Seoul'],
        ['Asia/Kolkata', 'Asia/Kolkata'],
        ['Asia/Dubai', 'Asia/Dubai'],
        ['Europe/London', 'Europe/London'],
        ['Europe/Dublin', 'Europe/Dublin'],
        ['Europe/Paris', 'Europe/Paris'],
        ['Europe/Berlin', 'Europe/Berlin'],
        ['Europe/Zurich', 'Europe/Zurich'],
        ['Europe/Rome', 'Europe/Rome'],
        ['Europe/Madrid', 'Europe/Madrid'],
        ['Europe/Amsterdam', 'Europe/Amsterdam'],
        ['Europe/Stockholm', 'Europe/Stockholm'],
        ['Europe/Warsaw', 'Europe/Warsaw'],
        ['Europe/Moscow', 'Europe/Moscow'],
        ['America/New_York', 'America/New_York'],
        ['America/Toronto', 'America/Toronto'],
        ['America/Chicago', 'America/Chicago'],
        ['America/Denver', 'America/Denver'],
        ['America/Phoenix', 'America/Phoenix'],
        ['America/Los_Angeles', 'America/Los_Angeles'],
        ['America/Vancouver', 'America/Vancouver'],
        ['America/Mexico_City', 'America/Mexico_City'],
        ['America/Sao_Paulo', 'America/Sao_Paulo'],
        ['America/Buenos_Aires', 'America/Buenos_Aires'],
        ['Australia/Sydney', 'Australia/Sydney'],
        ['Australia/Melbourne', 'Australia/Melbourne'],
        ['Pacific/Auckland', 'Pacific/Auckland']
    ];

    const PRIVACY_LANG_SELECT_OPTIONS = [
        ['zh-CN', '\u4e2d\u6587\u7b80\u4f53'],
        ['zh-TW', '\u4e2d\u6587\u7e41\u9ad4'],
        ['en', 'English'],
        ['en-GB', 'English (UK)'],
        ['ja', '\u65e5\u672c\u8a9e'],
        ['ko', '\ud55c\uad6d\uc5b4'],
        ['de', 'Deutsch'],
        ['fr', 'Fran\u00e7ais'],
        ['es', 'Espa\u00f1ol'],
        ['es-MX', 'Espa\u00f1ol (MX)'],
        ['pt-BR', 'Portugu\u00eas (BR)'],
        ['pt', 'Portugu\u00eas'],
        ['it', 'Italiano'],
        ['nl', 'Nederlands'],
        ['sv', 'Svenska'],
        ['pl', 'Polski'],
        ['tr', 'T\u00fcrk\u00e7e'],
        ['ru', '\u0420\u0443\u0441\u0441\u043a\u0438\u0439'],
        ['uk', '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430'],
        ['ar', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629'],
        ['he', '\u05e2\u05d1\u05e8\u05d9\u05ea'],
        ['hi', '\u0939\u093f\u0928\u094d\u0926\u0940'],
        ['th', '\u0e44\u0e17\u0e22'],
        ['vi', 'Ti\u1ebfng Vi\u1ec7t'],
        ['id', 'Bahasa Indonesia'],
        ['ms', 'Bahasa Melayu']
    ];

    const privacyState = {
        originals: null,
        nativeDate: window.Date,
        nativeDateTimeFormat: Intl.DateTimeFormat,
        formatterCache: new Map()
    };
    const PRIVACY_BRIDGE_REQUEST_EVENT = 'mi-geo-request';
    const PRIVACY_BRIDGE_RESPONSE_EVENT = 'mi-geo-response';
    const PRIVACY_BRIDGE_TIMEOUT_MS = 15000;
    const privacyBridgePending = new Map();
    let privacyBridgeSeq = 0;

    window.addEventListener(PRIVACY_BRIDGE_RESPONSE_EVENT, event => {
        const detail = event.detail;
        if (!detail || typeof detail.seq === 'undefined') return;
        const pending = privacyBridgePending.get(detail.seq);
        if (!pending) return;
        privacyBridgePending.delete(detail.seq);
        if (pending.timer) window.clearTimeout(pending.timer);
        pending.resolve(detail);
    });

    function requestFromBackground(message) {
        return new Promise(resolve => {
            const seq = ++privacyBridgeSeq;
            const pending = { resolve, timer: 0 };
            privacyBridgePending.set(seq, pending);
            window.dispatchEvent(new CustomEvent(PRIVACY_BRIDGE_REQUEST_EVENT, {
                detail: { seq, message }
            }));
            pending.timer = window.setTimeout(() => {
                if (privacyBridgePending.has(seq)) {
                    privacyBridgePending.delete(seq);
                    resolve({ ok: false, error: 'timeout' });
                }
            }, PRIVACY_BRIDGE_TIMEOUT_MS);
        });
    }

    function readPrivacyGeo() { return readJson('pv_geo', null); }

    function resolveSpoofValue(mode, geo, kind) {
        if (mode && mode !== 'auto') return mode;
        if (!geo) return '';
        if (kind === 'tz') return geo.timezone || '';
        const first = Array.isArray(geo.languages) ? geo.languages[0] : '';
        return first || '';
    }

    function getPrivacyDateFormatter(timeZone) {
        let formatter = privacyState.formatterCache.get(timeZone);
        if (!formatter) {
            formatter = new privacyState.nativeDateTimeFormat('en-US-u-ca-gregory-nu-latn', {
                timeZone,
                hourCycle: 'h23',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            privacyState.formatterCache.set(timeZone, formatter);
        }
        return formatter;
    }

    function computeZonedDateParts(date, timeZone) {
        if (!date || !Number.isFinite(date.getTime())) return null;
        try {
            const raw = {};
            for (const part of getPrivacyDateFormatter(timeZone).formatToParts(date)) {
                if (part.type !== 'literal') raw[part.type] = part.value;
            }
            const parts = {
                year: Number(raw.year),
                month: Number(raw.month),
                day: Number(raw.day),
                hour: Number(raw.hour),
                minute: Number(raw.minute),
                second: Number(raw.second),
                millisecond: date.getUTCMilliseconds()
            };
            if (!Object.values(parts).every(Number.isFinite)) return null;
            parts.weekday = new privacyState.nativeDate(
                privacyState.nativeDate.UTC(parts.year, parts.month - 1, parts.day)
            ).getUTCDay();
            return parts;
        } catch {
            return null;
        }
    }

    function computeSpoofedOffset(date, timeZone) {
        const parts = computeZonedDateParts(date, timeZone);
        if (!parts) return null;
        const asUtc = privacyState.nativeDate.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
            parts.millisecond
        );
        const offsetMinutesEastOfUtc = Math.round((asUtc - date.getTime()) / 60000);
        return Number.isFinite(offsetMinutesEastOfUtc) ? -offsetMinutesEastOfUtc : null;
    }

    function privacyFunctionProxy(nativeFunction, handler) {
        return new Proxy(nativeFunction, {
            apply(target, receiver, args) {
                return handler(target, receiver, args);
            }
        });
    }

    function installPrivacyMethod(originals, key, target, name, handler) {
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        if (!descriptor || typeof descriptor.value !== 'function') return;
        originals.methodDescriptors ||= {};
        originals.methodDescriptors[key] = { target, name, descriptor };
        Object.defineProperty(target, name, {
            ...descriptor,
            value: privacyFunctionProxy(descriptor.value, handler)
        });
    }

    function privacyLocaleList(language) {
        if (!language) return [];
        const values = [language];
        const base = language.split('-')[0];
        if (base && base !== language) values.push(base);
        return [...new Set(values)];
    }

    function privacyLocaleOptions(options, timeZone, mode) {
        const next = options && typeof options === 'object' ? { ...options } : {};
        if (timeZone && !next.timeZone) next.timeZone = timeZone;
        const hasStyle = next.dateStyle || next.timeStyle;
        const hasComponent = [
            'weekday', 'era', 'year', 'month', 'day', 'dayPeriod',
            'hour', 'minute', 'second', 'fractionalSecondDigits', 'timeZoneName'
        ].some(key => next[key] !== undefined);
        if (!hasStyle && !hasComponent) {
            if (mode !== 'time') Object.assign(next, { year: 'numeric', month: 'numeric', day: 'numeric' });
            if (mode !== 'date') Object.assign(next, { hour: 'numeric', minute: 'numeric', second: 'numeric' });
        }
        return next;
    }

    function formatPrivacyDateString(date, timeZone, includeDate, includeTime) {
        if (!Number.isFinite(date.getTime())) return 'Invalid Date';
        const parts = computeZonedDateParts(date, timeZone);
        const offset = computeSpoofedOffset(date, timeZone);
        if (!parts || offset == null) return 'Invalid Date';
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const pad = value => String(value).padStart(2, '0');
        const dateText = `${weekdays[parts.weekday]} ${months[parts.month - 1]} ${pad(parts.day)} ${parts.year}`;
        const sign = offset > 0 ? '-' : '+';
        const absolute = Math.abs(offset);
        const offsetText = `${sign}${pad(Math.floor(absolute / 60))}${pad(absolute % 60)}`;
        let zoneName = timeZone;
        try {
            const formatter = new privacyState.nativeDateTimeFormat('en-US', { timeZone, timeZoneName: 'long' });
            zoneName = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || timeZone;
        } catch {}
        const timeText = `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} GMT${offsetText} (${zoneName})`;
        if (includeDate && includeTime) return `${dateText} ${timeText}`;
        return includeDate ? dateText : timeText;
    }

    function installIntlPrivacySpoof(originals, timeZone, language) {
        originals.intlConstructors = {};
        for (const name of [
            'DateTimeFormat', 'NumberFormat', 'Collator', 'PluralRules',
            'RelativeTimeFormat', 'ListFormat', 'DisplayNames', 'Segmenter'
        ]) {
            const NativeConstructor = Intl[name];
            if (typeof NativeConstructor !== 'function') continue;
            let proxy;
            const normalize = args => {
                const next = [...args];
                if (language && next[0] == null) next[0] = language;
                if (name === 'DateTimeFormat' && timeZone) {
                    const options = next[1] && typeof next[1] === 'object' ? { ...next[1] } : {};
                    if (!options.timeZone) options.timeZone = timeZone;
                    next[1] = options;
                }
                return next;
            };
            proxy = new Proxy(NativeConstructor, {
                apply(target, receiver, args) {
                    return Reflect.apply(target, receiver, normalize(args));
                },
                construct(target, args, newTarget) {
                    return Reflect.construct(target, normalize(args), newTarget === proxy ? target : newTarget);
                }
            });
            originals.intlConstructors[name] = NativeConstructor;
            Intl[name] = proxy;
        }
    }
    const PRIVACY_BROADCAST_CHANNEL = '__mi_privacy_config_v2';

    function privacyWorkerBootstrap(initialConfig) {
        'use strict';
        const state = { originals: null };
        const NativeDate = Date;
        const NativeDateTimeFormat = Intl.DateTimeFormat;
        const proxy = (native, handler) => new Proxy(native, {
            apply: (target, receiver, args) => handler(target, receiver, args)
        });
        const dateParts = (date, timeZone) => {
            if (!Number.isFinite(date.getTime())) return null;
            try {
                const raw = {};
                const formatter = new NativeDateTimeFormat('en-US-u-ca-gregory-nu-latn', {
                    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
                    weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
                for (const part of formatter.formatToParts(date)) if (part.type !== 'literal') raw[part.type] = part.value;
                const result = {
                    year: +raw.year, month: +raw.month, day: +raw.day,
                    hour: +raw.hour, minute: +raw.minute, second: +raw.second,
                    millisecond: date.getUTCMilliseconds()
                };
                if (!Object.values(result).every(Number.isFinite)) return null;
                result.weekday = new NativeDate(NativeDate.UTC(result.year, result.month - 1, result.day)).getUTCDay();
                return result;
            } catch { return null; }
        };
        const offset = (date, timeZone) => {
            const value = dateParts(date, timeZone);
            if (!value) return null;
            return -Math.round((NativeDate.UTC(
                value.year, value.month - 1, value.day, value.hour,
                value.minute, value.second, value.millisecond
            ) - date.getTime()) / 60000);
        };
        const dateString = (date, timeZone, includeDate, includeTime) => {
            const value = dateParts(date, timeZone);
            const zoneOffset = offset(date, timeZone);
            if (!value || zoneOffset == null) return 'Invalid Date';
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const pad = item => String(item).padStart(2, '0');
            const dateText = `${weekdays[value.weekday]} ${months[value.month - 1]} ${pad(value.day)} ${value.year}`;
            const absolute = Math.abs(zoneOffset);
            const offsetText = `${zoneOffset > 0 ? '-' : '+'}${pad(Math.floor(absolute / 60))}${pad(absolute % 60)}`;
            const timeText = `${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)} GMT${offsetText} (${timeZone})`;
            return includeDate && includeTime ? `${dateText} ${timeText}` : includeDate ? dateText : timeText;
        };
        const restore = () => {
            const originals = state.originals;
            if (!originals) return;
            state.originals = null;
            for (const [name, constructor] of Object.entries(originals.intl || {})) Intl[name] = constructor;
            for (const item of Object.values(originals.methods || {})) Object.defineProperty(item.target, item.name, item.descriptor);
            if (originals.navigator) for (const [name, descriptor] of Object.entries(originals.navigator.descriptors)) {
                if (descriptor) Object.defineProperty(originals.navigator.prototype, name, descriptor);
                else delete originals.navigator.prototype[name];
            }
            if (originals.temporal && typeof Temporal !== 'undefined') {
                for (const [name, method] of Object.entries(originals.temporal)) Temporal.Now[name] = method;
            }
            self.Date = originals.globalDate || NativeDate;
        };
        const apply = config => {
            restore();
            if (!config?.enabled) return;
            const timeZone = config.timeZone || '';
            const language = config.language || '';
            const originals = { intl: {}, methods: {}, navigator: null, temporal: null, globalDate: self.Date };
            const replace = (key, target, name, handler) => {
                const descriptor = Object.getOwnPropertyDescriptor(target, name);
                if (!descriptor || typeof descriptor.value !== 'function') return;
                originals.methods[key] = { target, name, descriptor };
                Object.defineProperty(target, name, { ...descriptor, value: proxy(descriptor.value, handler) });
            };
            for (const name of ['DateTimeFormat', 'NumberFormat', 'Collator', 'PluralRules', 'RelativeTimeFormat', 'ListFormat', 'DisplayNames', 'Segmenter']) {
                const NativeConstructor = Intl[name];
                if (typeof NativeConstructor !== 'function') continue;
                let wrapped;
                const normalize = args => {
                    const next = [...args];
                    if (language && next[0] == null) next[0] = language;
                    if (name === 'DateTimeFormat' && timeZone) {
                        const options = next[1] && typeof next[1] === 'object' ? { ...next[1] } : {};
                        if (!options.timeZone) options.timeZone = timeZone;
                        next[1] = options;
                    }
                    return next;
                };
                wrapped = new Proxy(NativeConstructor, {
                    apply: (target, receiver, args) => Reflect.apply(target, receiver, normalize(args)),
                    construct: (target, args, newTarget) => Reflect.construct(target, normalize(args), newTarget === wrapped ? target : newTarget)
                });
                originals.intl[name] = NativeConstructor;
                Intl[name] = wrapped;
            }
            if (timeZone) {
                let DateProxy;
                DateProxy = new Proxy(NativeDate, {
                    apply: () => dateString(new NativeDate(), timeZone, true, true),
                    construct: (target, args, newTarget) => Reflect.construct(target, args, newTarget === DateProxy ? target : newTarget)
                });
                self.Date = DateProxy;
                replace('offset', NativeDate.prototype, 'getTimezoneOffset', (native, receiver) => offset(receiver, timeZone) ?? Reflect.apply(native, receiver, []));
                const getters = { getFullYear: 'year', getYear: 'year', getMonth: 'month', getDate: 'day', getDay: 'weekday', getHours: 'hour', getMinutes: 'minute', getSeconds: 'second', getMilliseconds: 'millisecond' };
                for (const [name, partName] of Object.entries(getters)) replace(name, NativeDate.prototype, name, (native, receiver) => {
                    const value = dateParts(receiver, timeZone);
                    if (!value) return Reflect.apply(native, receiver, []);
                    if (name === 'getMonth') return value[partName] - 1;
                    if (name === 'getYear') return value[partName] - 1900;
                    return value[partName];
                });
                replace('toString', NativeDate.prototype, 'toString', (_native, receiver) => dateString(receiver, timeZone, true, true));
                replace('toDateString', NativeDate.prototype, 'toDateString', (_native, receiver) => dateString(receiver, timeZone, true, false));
                replace('toTimeString', NativeDate.prototype, 'toTimeString', (_native, receiver) => dateString(receiver, timeZone, false, true));
            }
            if (language && typeof navigator !== 'undefined') {
                const values = [language];
                const base = language.split('-')[0];
                if (base && base !== language) values.push(base);
                const prototype = Object.getPrototypeOf(navigator);
                originals.navigator = { prototype, descriptors: {} };
                for (const [name, getter] of [['language', () => values[0]], ['languages', () => values.slice()], ['userLanguage', () => values[0]], ['browserLanguage', () => values[0]], ['systemLanguage', () => values[0]]]) {
                    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
                    originals.navigator.descriptors[name] = descriptor || null;
                    Object.defineProperty(prototype, name, {
                        configurable: true,
                        enumerable: descriptor?.enumerable ?? true,
                        get: proxy(descriptor?.get || function () {}, () => getter())
                    });
                }
            }
            if (timeZone && typeof Temporal !== 'undefined' && Temporal.Now) {
                originals.temporal = {};
                const instant = Temporal.Now.instant.bind(Temporal.Now);
                for (const [name, handler] of [
                    ['timeZoneId', () => timeZone],
                    ['zonedDateTimeISO', () => instant().toZonedDateTimeISO(timeZone)],
                    ['plainDateTimeISO', () => instant().toZonedDateTimeISO(timeZone).toPlainDateTime()],
                    ['plainDateISO', () => instant().toZonedDateTimeISO(timeZone).toPlainDate()],
                    ['plainTimeISO', () => instant().toZonedDateTimeISO(timeZone).toPlainTime()]
                ]) if (typeof Temporal.Now[name] === 'function') {
                    originals.temporal[name] = Temporal.Now[name];
                    Temporal.Now[name] = proxy(Temporal.Now[name], handler);
                }
            }
            state.originals = originals;
        };
        apply(initialConfig);
        try {
            const channel = new BroadcastChannel('__mi_privacy_config_v2');
            channel.addEventListener('message', event => apply(event.data));
        } catch {}
    }

    function installWorkerPrivacySpoof(originals, timeZone, language) {
        const workerUrls = new Set();
        const sharedWorkerUrls = new Map();
        const createWrappedUrl = (url, options, persistent = false) => {
            const absolute = new URL(String(url), document.baseURI).href;
            const isModule = Boolean(options && typeof options === 'object' && options.type === 'module');
            const cacheKey = `${isModule ? 'module' : 'classic'}\n${absolute}`;
            if (persistent && sharedWorkerUrls.has(cacheKey)) return sharedWorkerUrls.get(cacheKey);
            const bootstrap = `;(${privacyWorkerBootstrap.toString()})(${JSON.stringify({ enabled: true, timeZone, language })});`;
            const source = isModule
                ? `${bootstrap}\nimport ${JSON.stringify(absolute)};`
                : `${bootstrap}\nimportScripts(${JSON.stringify(absolute)});`;
            const wrappedUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
            workerUrls.add(wrappedUrl);
            if (persistent) sharedWorkerUrls.set(cacheKey, wrappedUrl);
            return wrappedUrl;
        };

        if (typeof Worker === 'function') {
            const NativeWorker = Worker;
            let WorkerProxy;
            WorkerProxy = new Proxy(NativeWorker, {
                construct(target, args, newTarget) {
                    let wrappedUrl = '';
                    try {
                        wrappedUrl = createWrappedUrl(args[0], args[1]);
                        const worker = Reflect.construct(target, [wrappedUrl, args[1]], newTarget === WorkerProxy ? target : newTarget);
                        setTimeout(() => {
                            URL.revokeObjectURL(wrappedUrl);
                            workerUrls.delete(wrappedUrl);
                        }, 60000);
                        return worker;
                    } catch {
                        if (wrappedUrl) {
                            URL.revokeObjectURL(wrappedUrl);
                            workerUrls.delete(wrappedUrl);
                        }
                        return Reflect.construct(target, args, newTarget === WorkerProxy ? target : newTarget);
                    }
                }
            });
            originals.worker = NativeWorker;
            window.Worker = WorkerProxy;
        }

        if (typeof SharedWorker === 'function') {
            const NativeSharedWorker = SharedWorker;
            let SharedWorkerProxy;
            SharedWorkerProxy = new Proxy(NativeSharedWorker, {
                construct(target, args, newTarget) {
                    try {
                        const wrappedUrl = createWrappedUrl(args[0], args[1], true);
                        return Reflect.construct(target, [wrappedUrl, args[1]], newTarget === SharedWorkerProxy ? target : newTarget);
                    } catch {
                        return Reflect.construct(target, args, newTarget === SharedWorkerProxy ? target : newTarget);
                    }
                }
            });
            originals.sharedWorker = NativeSharedWorker;
            window.SharedWorker = SharedWorkerProxy;
        }

        if (workerUrls.size) originals.workerUrls = workerUrls;
    }

    function broadcastPrivacyConfig(enabled, timeZone = '', language = '') {
        if (typeof BroadcastChannel !== 'function') return;
        try {
            const channel = new BroadcastChannel(PRIVACY_BROADCAST_CHANNEL);
            channel.postMessage({ enabled, timeZone, language });
            channel.close();
        } catch {}
    }
    function installPrivacySpoof(timeZone, language) {
        const originals = { methodDescriptors: {} };
        try {
            installIntlPrivacySpoof(originals, timeZone, language);

            if (timeZone) {
                const NativeDate = privacyState.nativeDate;
                const datePrototype = NativeDate.prototype;
                originals.globalDate = window.Date;
                let DateProxy;
                DateProxy = new Proxy(NativeDate, {
                    apply() {
                        return formatPrivacyDateString(new NativeDate(), timeZone, true, true);
                    },
                    construct(target, args, newTarget) {
                        return Reflect.construct(target, args, newTarget === DateProxy ? target : newTarget);
                    }
                });
                window.Date = DateProxy;

                installPrivacyMethod(originals, 'date.getTimezoneOffset', datePrototype, 'getTimezoneOffset', (native, receiver) => {
                    const spoofed = computeSpoofedOffset(receiver, timeZone);
                    return spoofed == null ? Reflect.apply(native, receiver, []) : spoofed;
                });

                const dateGetterParts = {
                    getFullYear: 'year',
                    getYear: 'year',
                    getMonth: 'month',
                    getDate: 'day',
                    getDay: 'weekday',
                    getHours: 'hour',
                    getMinutes: 'minute',
                    getSeconds: 'second',
                    getMilliseconds: 'millisecond'
                };
                for (const [name, partName] of Object.entries(dateGetterParts)) {
                    installPrivacyMethod(originals, `date.${name}`, datePrototype, name, (native, receiver) => {
                        const parts = computeZonedDateParts(receiver, timeZone);
                        if (!parts) return Reflect.apply(native, receiver, []);
                        if (name === 'getMonth') return parts[partName] - 1;
                        if (name === 'getYear') return parts[partName] - 1900;
                        return parts[partName];
                    });
                }

                installPrivacyMethod(originals, 'date.toString', datePrototype, 'toString', (_native, receiver) =>
                    formatPrivacyDateString(receiver, timeZone, true, true));
                installPrivacyMethod(originals, 'date.toDateString', datePrototype, 'toDateString', (_native, receiver) =>
                    formatPrivacyDateString(receiver, timeZone, true, false));
                installPrivacyMethod(originals, 'date.toTimeString', datePrototype, 'toTimeString', (_native, receiver) =>
                    formatPrivacyDateString(receiver, timeZone, false, true));

                for (const [name, mode] of [
                    ['toLocaleString', 'all'],
                    ['toLocaleDateString', 'date'],
                    ['toLocaleTimeString', 'time']
                ]) {
                    installPrivacyMethod(originals, `date.${name}`, datePrototype, name, (native, receiver, args) => {
                        if (!Number.isFinite(receiver.getTime())) return Reflect.apply(native, receiver, args);
                        const locales = args[0] == null && language ? language : args[0];
                        return new privacyState.nativeDateTimeFormat(
                            locales,
                            privacyLocaleOptions(args[1], timeZone, mode)
                        ).format(receiver);
                    });
                }
            }

            if (language && typeof navigator !== 'undefined') {
                const languages = privacyLocaleList(language);
                const prototype = Object.getPrototypeOf(navigator);
                originals.navigator = { prototype, descriptors: {} };
                for (const [name, value] of [
                    ['language', () => languages[0]],
                    ['languages', () => languages.slice()],
                    ['userLanguage', () => languages[0]],
                    ['browserLanguage', () => languages[0]],
                    ['systemLanguage', () => languages[0]]
                ]) {
                    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
                    originals.navigator.descriptors[name] = descriptor || null;
                    const nativeGetter = descriptor?.get || function () {};
                    Object.defineProperty(prototype, name, {
                        configurable: true,
                        enumerable: descriptor?.enumerable ?? true,
                        get: privacyFunctionProxy(nativeGetter, () => value())
                    });
                }

                installPrivacyMethod(originals, 'number.toLocaleString', Number.prototype, 'toLocaleString', (native, receiver, args) =>
                    Reflect.apply(native, receiver, [args[0] == null ? language : args[0], args[1]]));
                if (typeof BigInt !== 'undefined') {
                    installPrivacyMethod(originals, 'bigint.toLocaleString', BigInt.prototype, 'toLocaleString', (native, receiver, args) =>
                        Reflect.apply(native, receiver, [args[0] == null ? language : args[0], args[1]]));
                }
                installPrivacyMethod(originals, 'string.localeCompare', String.prototype, 'localeCompare', (native, receiver, args) =>
                    Reflect.apply(native, receiver, [args[0], args[1] == null ? language : args[1], args[2]]));

                if (document.documentElement) {
                    const root = document.documentElement;
                    const state = { root, latestNative: root.getAttribute('lang'), applying: false, observer: null };
                    const applyLanguage = () => {
                        if (root.getAttribute('lang') === language) return;
                        state.applying = true;
                        root.setAttribute('lang', language);
                        state.applying = false;
                    };
                    state.observer = new MutationObserver(() => {
                        if (state.applying) return;
                        const next = root.getAttribute('lang');
                        if (next !== language) state.latestNative = next;
                        applyLanguage();
                    });
                    state.observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
                    applyLanguage();
                    originals.documentLanguage = state;
                }
            }

            if (timeZone && typeof Temporal !== 'undefined' && Temporal.Now) {
                originals.temporalMethods = {};
                const instant = typeof Temporal.Now.instant === 'function'
                    ? Temporal.Now.instant.bind(Temporal.Now)
                    : null;
                const replaceTemporal = (name, handler) => {
                    if (typeof Temporal.Now[name] !== 'function') return;
                    originals.temporalMethods[name] = Temporal.Now[name];
                    Temporal.Now[name] = privacyFunctionProxy(Temporal.Now[name], handler);
                };
                replaceTemporal('timeZoneId', () => timeZone);
                replaceTemporal('zonedDateTimeISO', (native, receiver, args) =>
                    instant ? instant().toZonedDateTimeISO(timeZone) : Reflect.apply(native, receiver, args));
                replaceTemporal('plainDateTimeISO', (native, receiver, args) =>
                    instant ? instant().toZonedDateTimeISO(timeZone).toPlainDateTime() : Reflect.apply(native, receiver, args));
                replaceTemporal('plainDateISO', (native, receiver, args) =>
                    instant ? instant().toZonedDateTimeISO(timeZone).toPlainDate() : Reflect.apply(native, receiver, args));
                replaceTemporal('plainTimeISO', (native, receiver, args) =>
                    instant ? instant().toZonedDateTimeISO(timeZone).toPlainTime() : Reflect.apply(native, receiver, args));
            }

            installWorkerPrivacySpoof(originals, timeZone, language);
            privacyState.originals = originals;
        } catch (error) {
            privacyState.originals = originals;
            restorePrivacySpoof();
            console.warn('[Model Injector] Privacy spoof installation failed', error);
        }
    }

    function restorePrivacySpoof() {
        const originals = privacyState.originals;
        if (!originals) return;
        privacyState.originals = null;
        try {
            for (const [name, constructor] of Object.entries(originals.intlConstructors || {})) {
                Intl[name] = constructor;
            }
            for (const item of Object.values(originals.methodDescriptors || {})) {
                Object.defineProperty(item.target, item.name, item.descriptor);
            }
            if (originals.globalDate) window.Date = originals.globalDate;
            if (originals.navigator) {
                for (const [name, descriptor] of Object.entries(originals.navigator.descriptors)) {
                    if (descriptor) Object.defineProperty(originals.navigator.prototype, name, descriptor);
                    else delete originals.navigator.prototype[name];
                }
            }
            if (originals.documentLanguage) {
                const state = originals.documentLanguage;
                state.observer?.disconnect();
                if (state.latestNative == null) state.root.removeAttribute('lang');
                else state.root.setAttribute('lang', state.latestNative);
            }
            if (originals.temporalMethods && typeof Temporal !== 'undefined') {
                for (const [name, method] of Object.entries(originals.temporalMethods)) {
                    Temporal.Now[name] = method;
                }
            }
            if (originals.worker) window.Worker = originals.worker;
            if (originals.sharedWorker) window.SharedWorker = originals.sharedWorker;
            for (const url of originals.workerUrls || []) {
                try { URL.revokeObjectURL(url); } catch {}
            }
        } catch (error) {
            console.warn('[Model Injector] Privacy spoof restoration failed', error);
        }
    }

    function applyPrivacySpoof() {
        restorePrivacySpoof();
        if (!S.privacyOn) {
            broadcastPrivacyConfig(false);
            return;
        }
        const geo = readPrivacyGeo();
        const timeZone = resolveSpoofValue(S.privacyTzMode, geo, 'tz');
        const language = resolveSpoofValue(S.privacyLangMode, geo, 'lang');
        if (timeZone || language) installPrivacySpoof(timeZone, language);
        broadcastPrivacyConfig(Boolean(timeZone || language), timeZone, language);
    }

    function restorePrivacyOnStartup() {
        applyPrivacySpoof();
        if (!IS_TOP_FRAME) return;
        syncAcceptLanguageRule();
        if (S.privacyOn && !readPrivacyGeo()
            && (S.privacyTzMode === 'auto' || S.privacyLangMode === 'auto')) {
            refreshPrivacyGeo(false);
        }
    }

    function syncAcceptLanguageRule() {
        let value = '';
        if (S.privacyOn) value = resolveSpoofValue(S.privacyLangMode, readPrivacyGeo(), 'lang');
        requestFromBackground({
            type: 'mi-accept-language',
            enabled: Boolean(value),
            value
        }).catch(() => {});
    }

    restorePrivacyOnStartup();

    function formatPrivacyGeo(geo) {
        if (!geo) return '';
        const place = [geo.city, geo.country].filter(Boolean).join(', ')
            || geo.countryCode || '--';
        const ip = geo.ip ? ` \u00b7 ${geo.ip}` : '';
        return `${t('privacy_status_geo')} ${place}${ip}`;
    }

    function renderPrivacySettings() {
        const toggle = q('mi-sw-privacy');
        if (toggle) {
            toggle.classList.toggle('on', Boolean(S.privacyOn));
            toggle.setAttribute('aria-checked', String(Boolean(S.privacyOn)));
        }
        const geo = readPrivacyGeo();
        const status = q('mi-privacy-status');
        if (status) status.textContent = geo ? formatPrivacyGeo(geo) : t('privacy_status_none');
        renderPrivacySelect('tz', PRIVACY_TZ_SELECT_OPTIONS);
        renderPrivacySelect('lang', PRIVACY_LANG_SELECT_OPTIONS);
        const refresh = q('mi-privacy-refresh');
        if (refresh) refresh.textContent = t('privacy_refresh');
    }

    const privacySelectState = {
        tz: { open: false },
        lang: { open: false }
    };

    function privacySelectLabel(kind, options) {
        const mode = kind === 'tz' ? S.privacyTzMode : S.privacyLangMode;
        if (mode === 'auto') return t('privacy_auto');
        return options.find(([value]) => value === mode)?.[1] || mode;
    }

    function renderPrivacySelect(kind, options) {
        const current = q(`mi-privacy-${kind}-current`);
        const menu = q(`mi-privacy-${kind}-menu`);
        if (!current || !menu) return;
        current.textContent = privacySelectLabel(kind, options);
        menu.innerHTML = [
            ['auto', t('privacy_auto')],
            ...options
        ].map(([value, label]) => `
            <button type="button" class="mi-lang-option ${value === (kind === 'tz' ? S.privacyTzMode : S.privacyLangMode) ? 'active' : ''}" data-privacy-value="${escapeHtml(value)}" role="option" aria-selected="${value === (kind === 'tz' ? S.privacyTzMode : S.privacyLangMode)}" tabindex="-1">
                <span>${escapeHtml(label)}</span>
            </button>
        `).join('');
    }

    function setPrivacySelectOpen(kind, open) {
        const picker = q(`mi-privacy-${kind}-picker`);
        const trigger = q(`mi-privacy-${kind}-trigger`);
        const menu = q(`mi-privacy-${kind}-menu`);
        if (!picker || !trigger || !menu) return;
        privacySelectState[kind].open = open;
        picker.classList.toggle('open', open);
        menu.classList.toggle('show', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        menu.toggleAttribute('inert', !open);
    }

    function selectPrivacyOption(kind, value) {
        if (kind === 'tz') {
            S.privacyTzMode = value;
            save('pvtz', value);
            applyPrivacySpoof();
        } else {
            S.privacyLangMode = value;
            save('pvlang', value);
            applyPrivacySpoof();
            syncAcceptLanguageRule();
        }
        setPrivacySelectOpen(kind, false);
        renderPrivacySettings();
    }

    function positionPrivacySelectMenu(kind) {
        const panel = q('mi-p');
        const trigger = q(`mi-privacy-${kind}-trigger`);
        const menu = q(`mi-privacy-${kind}-menu`);
        if (!panel || !trigger || !menu) return;

        const panelRect = panel.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        const gap = 8;
        const edge = 10;
        const naturalHeight = Math.max(112, menu.scrollHeight || 0);
        const availablePanelHeight = Math.max(0, panelRect.height - (edge * 2));
        const menuWidth = Math.min(
            Math.max(0, panelRect.width - (edge * 2)),
            Math.max(148, Math.round(triggerRect.width))
        );
        const left = clamp(
            triggerRect.left - panelRect.left,
            edge,
            Math.max(edge, panelRect.width - menuWidth - edge)
        );
        const spaceBelow = Math.max(0, panelRect.bottom - triggerRect.bottom - gap - edge);
        const spaceAbove = Math.max(0, triggerRect.top - panelRect.top - gap - edge);
        const overlay = Math.max(spaceAbove, spaceBelow) < Math.min(naturalHeight, 112);

        menu.style.left = `${Math.round(left)}px`;
        menu.style.right = 'auto';
        menu.style.width = `${Math.round(menuWidth)}px`;
        if (overlay) {
            menu.style.top = `${edge}px`;
            menu.style.bottom = 'auto';
            menu.style.maxHeight = `${Math.round(availablePanelHeight)}px`;
            menu.dataset.compact = 'true';
            menu.dataset.placement = 'overlay';
            menu.style.transformOrigin = 'center center';
            return;
        }

        const placeAbove = spaceAbove >= naturalHeight
            || (spaceBelow < naturalHeight && spaceAbove > spaceBelow);
        const maxHeight = Math.min(naturalHeight, placeAbove ? spaceAbove : spaceBelow);
        menu.style.maxHeight = `${Math.round(maxHeight)}px`;
        menu.dataset.compact = maxHeight < naturalHeight ? 'true' : 'false';
        menu.dataset.placement = placeAbove ? 'above' : 'below';
        menu.style.transformOrigin = placeAbove ? 'bottom right' : 'top right';
        if (placeAbove) {
            menu.style.top = 'auto';
            menu.style.bottom = `${Math.round(panelRect.bottom - triggerRect.top + gap)}px`;
        } else {
            menu.style.top = `${Math.round(triggerRect.bottom - panelRect.top + gap)}px`;
            menu.style.bottom = 'auto';
        }
    }

    async function refreshPrivacyGeo(force) {
        const status = q('mi-privacy-status');
        if (status) status.textContent = t('privacy_status_loading');
        const response = await requestFromBackground({ type: 'mi-geo', force: Boolean(force) });
        if (response && response.ok && response.geo) {
            S.privacyGeo = response.geo;
            save('pv_geo', response.geo);
            syncAcceptLanguageRule();
            applyPrivacySpoof();
            renderPrivacySettings();
        } else if (status) {
            status.textContent = t('privacy_status_error');
        }
    }

    function resetDiagnostics() {
        clearDiagnosticArtifacts();
        injectionDiagnostic = {
            selected: S.model || '',
            lastModel: '',
            originalModel: '',
            thinkingEffort: '',
            effortRequested: '',
            effortEnabled: false,
            effortApplied: false,
            responseModel: '',
            routeStatus: 'unknown',
            workspaceAgentId: '',
            workspaceAgentName: '',
            workspaceAgentStatus: 'unknown',
            at: '',
            error: '',
            skipReason: '',
            packetRequest: null,
            packetResponse: null
        };
        updateDiagnostics();
    }

    function sanitizeStringList(value) {
        return Array.isArray(value)
            ? [...new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))]
            : [];
    }

    function getConversationIdFromValue(value) {
        const text = typeof value === 'string' ? value.trim() : '';
        return /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(text) ? text : '';
    }

    function sanitizeConversationList(value) {
        return Array.isArray(value)
            ? [...new Set(value.map(getConversationIdFromValue).filter(Boolean))]
            : [];
    }

    function sanitizeApiList(value) {
        if (!Array.isArray(value)) return [];
        const seen = new Set();
        const normalized = [];
        for (const item of value) {
            const id = typeof item?.id === 'string' ? item.id.trim() : '';
            if (!id || seen.has(id) || isHiddenModelId(id)) continue;
            seen.add(id);
            normalized.push({
                id,
                name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id,
                tokens: Number(item.tokens) > 0 ? Number(item.tokens) : 0,
                desc: typeof item.desc === 'string' ? item.desc : '',
                tools: sanitizeStringList(item.tools),
                reasoning: typeof item.reasoning === 'string' ? item.reasoning : '',
                configurableEffort: Boolean(item.configurableEffort),
                thinkingEfforts: sanitizeStringList(extractThinkingEffortIds(item.thinkingEfforts)),
                workMode: Boolean(item.workMode),
                deprecated: Boolean(item.deprecated),
                deprecationDate: typeof item.deprecationDate === 'string' ? item.deprecationDate : '',
                category: typeof item.category === 'string' ? item.category : '',
                categoryName: typeof item.categoryName === 'string' ? item.categoryName : '',
                categoryLabel: typeof item.categoryLabel === 'string' ? item.categoryLabel : '',
                categoryLane: typeof item.categoryLane === 'string' ? item.categoryLane : '',
                version: typeof item.version === 'string' ? item.version : '',
                versionLabel: typeof item.versionLabel === 'string' ? item.versionLabel : '',
                shortExplainer: typeof item.shortExplainer === 'string' ? item.shortExplainer : '',
                tagline: typeof item.tagline === 'string' ? item.tagline : ''
            });
        }
        return normalized.sort(sortModelEntries);
    }

    function sanitizeWorkspaceAgentList(value) {
        if (!Array.isArray(value)) return [];
        const seen = new Set();
        const normalized = [];
        for (const item of value) {
            const id = typeof item?.id === 'string' ? item.id.trim() : '';
            if (!/^agt_[\w:-]+$/i.test(id) || seen.has(id)) continue;
            seen.add(id);
            const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id;
            normalized.push({
                id,
                name,
                desc: typeof item.desc === 'string' ? item.desc : '',
                source: typeof item.source === 'string' && item.source ? item.source : 'page',
                skills: sanitizeStringList(item.skills || []),
                tools: sanitizeStringList(item.tools || []),
                conversations: sanitizeConversationList(item.conversations || item.conversationIds || []),
                lastConversationId: getConversationIdFromValue(item.lastConversationId || item.conversation_id || item.conversationId),
                updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : ''
            });
        }
        return normalized.sort(sortModelEntries);
    }

    function serializeDebugArg(value) {
        if (!value || typeof value !== 'object') return value;
        try { return JSON.stringify(value); } catch { return String(value); }
    }
    function log(...args) {
        if (S.debug) console.log('%c[MI]', `color:${S.bgColor};font-weight:700`, ...args.map(serializeDebugArg));
    }
    function clamp(value, min, max) {
        if (max < min) return min;
        return Math.min(max, Math.max(min, value));
    }
    function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
    function normalizeHex(value) { return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim().toLowerCase() : null; }
    function hexToRgb(value) { const hex = normalizeHex(value); if (!hex) return '0, 122, 255'; return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`; }
    function getReadableAccentText(value) {
        const hex = normalizeHex(value) || '#007aff';
        const red = parseInt(hex.slice(1, 3), 16);
        const green = parseInt(hex.slice(3, 5), 16);
        const blue = parseInt(hex.slice(5, 7), 16);
        return ((red * 299 + green * 587 + blue * 114) / 255000) > 0.62 ? '#071019' : '#ffffff';
    }
    function truncate(value, length) { const text = String(value || ''); return text.length > length ? `${text.slice(0, Math.max(0, length - 3))}...` : text; }
    function formatTokens(value) {
        const number = Number(value) || 0;
        if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
        if (number >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return String(Math.round(number));
    }
    function fmtTok(value) { return Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(Number(value) || 0)); }
    function sortModelEntries(a, b) { return COLLATOR.compare(a?.name || a?.id || '', b?.name || b?.id || ''); }
    function getApiEntry(id) {
        if (apiEntryCacheSource !== S.api) {
            apiEntryCacheSource = S.api;
            apiEntryCache = new Map();
            for (const item of S.api) {
                if (!apiEntryCache.has(item.id)) apiEntryCache.set(item.id, item);
            }
        }
        return apiEntryCache.get(id) || null;
    }
    function isLiveCatalogModel(id) { return liveApiModelIds.has(id); }
    function isPersistentSpecialModel(id) { return SPECIAL_MODEL_IDS.has(String(id || '')); }
    function compareMenuModelItems(a, b) {
        return ((PRESET_ORDER.get(a?.id) ?? 999) - (PRESET_ORDER.get(b?.id) ?? 999)) || sortModelEntries(a, b);
    }
    function isWorkspaceAgentSelection(id) { return typeof id === 'string' && id.startsWith(WORKSPACE_AGENT_PREFIX); }
    function makeWorkspaceAgentSelection(id) { return id ? `${WORKSPACE_AGENT_PREFIX}${id}` : ''; }
    function getWorkspaceAgentId(selection = S.model) { return isWorkspaceAgentSelection(selection) ? selection.slice(WORKSPACE_AGENT_PREFIX.length) : ''; }
    function getWorkspaceAgent(id) { return S.agents.find(item => item.id === id) || null; }
    function getWorkspaceAgentForConversation(conversationId) {
        const id = getConversationIdFromValue(conversationId);
        if (!id) return null;
        return S.agents.find(agent =>
            agent?.lastConversationId === id
            || (Array.isArray(agent?.conversations) && agent.conversations.includes(id))
        ) || null;
    }
    function getWorkspaceAgentByName(name) {
        const wanted = String(name || '').trim();
        if (!wanted) return null;
        return S.agents.find(item => item.name && item.name.trim() === wanted) || null;
    }
    function getSelectedWorkspaceAgent() { return getWorkspaceAgent(getWorkspaceAgentId()); }
    function getCurrentConversationId() { return location.pathname.match(CHAT_CONVERSATION_PATH_RE)?.[1] || ''; }
    function getBackendConversationId(url) { return String(url || '').match(BACKEND_CONVERSATION_PATH_RE)?.[1] || ''; }
    function getDisplayName(id) {
        if (!id) return t('default_model');
        if (isWorkspaceAgentSelection(id)) {
            const agentId = getWorkspaceAgentId(id);
            return getWorkspaceAgent(agentId)?.name || agentId || id;
        }
        const entry = getApiEntry(id);
        const base = getBaseModelPresentation(id, entry?.name || PRESET_MAP.get(id)?.name || id, entry);
        return getMenuModelData().presentations.get(id)?.title || base.title;
    }
    function isSupportedHost() { return /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i.test(location.hostname); }
    function isThinkingModel(id, entry) {
        if (!id) return false;
        const model = entry || getApiEntry(id);
        if (model?.configurableEffort) return true;
        if (model?.reasoning && !/^(none|auto)$/i.test(model.reasoning)) return true;
        if (model?.workMode) return true;
        return Boolean(
            PRESET_MAP.get(id)?.thinking
            || /(^o[1-4])|thinking|reasoning|(?:^|-)t-mini$|(?:^|-)pro$|(?:^|-)wm$|alpha/i.test(id)
        );
    }
    function isWorkModel(id, entry) {
        const model = entry || getApiEntry(id);
        if (model?.workMode) return true;
        return /(?:^|[.-])wm$/i.test(String(id || ''));
    }
    function isWorkConversationKind(kind) {
        return /work|codex/i.test(String(kind || ''));
    }
    function getModelThinkingEfforts(id, entry) {
        const model = entry || getApiEntry(id);
        return sanitizeStringList(model?.thinkingEfforts);
    }
    function mapEffort(value, id) {
        const requested = EFFORTS.includes(value) ? value : 'standard';
        const supported = getModelThinkingEfforts(id);
        if (supported.length) {
            const wanted = EFFORT_ALIASES[requested] || [requested];
            const hit = wanted.find(item => supported.includes(item));
            if (hit) return hit;
            // A one-item catalog is usually the default advertisement, not the
            // allowed set. GPT-5.6 Pro often only lists standard; snapping
            // extended/heavy down to that made the old extended gear disappear.
        }
        return EFFORT_FALLBACKS[requested] || 'standard';
    }
    function touchRecent(id) {
        if (!id || isHiddenModelId(id)) return;
        S.recent = [id, ...S.recent.filter(item => item !== id)].slice(0, 6);
        saveJson('recent', S.recent);
    }
    function getEffectiveLimit() { return Number(isWorkspaceAgentSelection(S.model) ? 0 : getApiEntry(S.model)?.tokens) || 196000; }
    function getToneColor(pct) { return pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : S.bgColor; }
    function trimCache() {
        if (tokenCache.size <= TOKEN_CACHE_LIMIT) return;
        let removed = 0;
        for (const key of tokenCache.keys()) {
            tokenCache.delete(key);
            removed += 1;
            if (removed >= 64) break;
        }
    }
    function fingerprintText(text) {
        const value = String(text || '');
        if (value.length <= 96) return `${value.length}:${value}`;
        return `${value.length}:${value.slice(0, 40)}:${value.slice(-40)}`;
    }
    function q(id) { return refs[id] || null; }
    function cleanMessageText(text) {
        return String(text || '')
            .replace(/\r/g, '')
            .replace(/\b(Copy code|Copy|Edit|Share|Read aloud|Retry|Regenerate|Good response|Bad response)\b/gi, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    function extractMessageText(node) {
        if (!node) return '';
        const preferred = node.querySelector?.('.markdown, .prose, .whitespace-pre-wrap, [data-message-text]');
        const text = preferred?.textContent || node.textContent || preferred?.innerText || node.innerText || '';
        return cleanMessageText(text);
    }
    function collectMessages() {
        const byRole = document.querySelectorAll('[data-message-author-role]');
        if (byRole.length) {
            const messages = [];
            for (let index = 0; index < byRole.length; index += 1) {
                const node = byRole[index];
                const role = node.getAttribute('data-message-author-role') || 'user';
                const content = extractMessageText(node);
                if (content) messages.push({ role, content });
            }
            return messages;
        }

        const articles = document.querySelectorAll('main article, article[data-testid*="conversation-turn"], [data-testid^="conversation-turn-"]');
        if (articles.length) {
            const messages = [];
            for (let index = 0; index < articles.length; index += 1) {
                const node = articles[index];
                const role = index % 2 === 0 ? 'user' : 'assistant';
                const content = extractMessageText(node);
                if (content) messages.push({ role, content });
            }
            return messages;
        }

        return [];
    }
    function getTokenizerApi() {
        const tokenizer = window.GPTTokenizer_o200k_base;
        return tokenizer && typeof tokenizer === 'object' ? tokenizer : null;
    }
    function estimateTextTokens(text, options = {}) {
        if (!text) return 0;
        const cheap = Math.max(1, Math.ceil(text.length / 4));
        if (options.cheap || text.length > TOKEN_PRECISE_CHAR_LIMIT) return cheap;
        const tokenizer = getTokenizerApi();
        if (!tokenizer) return cheap;
        const key = fingerprintText(text);
        if (tokenCache.has(key)) return tokenCache.get(key);

        try {
            const tokens = tokenizer.countTokens
                ? tokenizer.countTokens(text)
                : tokenizer.encode
                ? tokenizer.encode(text).length
                : cheap;
            tokenCache.set(key, tokens);
            trimCache();
            return tokens;
        } catch {
            return cheap;
        }
    }
    function countConversationTokens(options = {}) {
        const messages = collectMessages();
        let plain = 0;
        for (const message of messages) plain += estimateTextTokens(`${message.role}\n${message.content}`, options) + 4;
        return { msgs: messages.length, plain, chat: null };
    }
    function updateContextRing(pct) {
        const ring = q('mi-ring-fg');
        if (!ring) return;
        const offset = BUTTON_RING - (pct / 100) * BUTTON_RING;
        const toneColor = getToneColor(pct);
        ring.setAttribute('stroke-dashoffset', String(offset));
        ring.style.stroke = toneColor;

        const panelRing = q('tok-path');
        if (panelRing) {
            panelRing.setAttribute('stroke-dasharray', `${pct}, 100`);
            panelRing.style.stroke = toneColor;
        }
    }
    function recalcTokens(options = {}) {
        const { msgs, plain, chat } = countConversationTokens(options);
        const used = chat ?? plain;
        const limit = getEffectiveLimit();
        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
        const remaining = Math.max(0, limit - used);

        lastStats = { msgs, plain, chat, used, limit, pct };

        const usedValue = q('val-used');
        const freeValue = q('val-free');
        const messageValue = q('val-msgs');
        const limitValue = q('val-lim');
        const percentValue = q('tok-pct');
        if (usedValue) usedValue.textContent = formatTokens(used);
        if (freeValue) freeValue.textContent = formatTokens(remaining);
        if (messageValue) messageValue.textContent = String(msgs);
        if (limitValue) limitValue.textContent = formatTokens(limit);
        if (percentValue) percentValue.textContent = `${Math.round(pct)}%`;

        updateContextRing(pct);
    }
    function cancelContextIdleJob() {
        if (!contextIdleJob) return;
        if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(contextIdleJob);
        else window.clearTimeout(contextIdleJob);
        contextIdleJob = 0;
    }
    function runScheduledTokenUpdate(options = {}) {
        contextTimer = 0;
        cancelContextIdleJob();
        const run = () => {
            contextIdleJob = 0;
            if (isPanelMotionActive()) {
                tokenRefreshDeferred = true;
                return;
            }
            if (!document.hidden) recalcTokens(options);
        };
        if (typeof window.requestIdleCallback === 'function') {
            contextIdleJob = window.requestIdleCallback(run, { timeout: options.cheap ? 1600 : 900 });
        } else {
            contextIdleJob = window.setTimeout(run, options.cheap ? 48 : 0);
        }
    }
    function scheduleTokenUpdate(immediate = false, mode = 'auto') {
        if (document.hidden) return;
        if (contextTimer) window.clearTimeout(contextTimer);
        cancelContextIdleJob();
        if (isPanelMotionActive()) {
            tokenRefreshDeferred = true;
            return;
        }
        const burst = mode === 'cheap' || Date.now() < tokenBurstUntil;
        if (mode === 'cheap') tokenBurstUntil = Date.now() + 1800;
        const cheap = mode === 'cheap' || (mode !== 'precise' && (burst || lastStats.msgs >= 18));
        const delay = immediate ? 0 : (cheap ? 1400 : 650);
        const run = () => runScheduledTokenUpdate({ cheap });
        if (immediate) run();
        else contextTimer = window.setTimeout(run, delay);
        if (preciseTokenTimer) window.clearTimeout(preciseTokenTimer);
        if (cheap && mode !== 'precise') {
            preciseTokenTimer = window.setTimeout(() => {
                preciseTokenTimer = 0;
                if (!document.hidden) runScheduledTokenUpdate({ cheap: false });
            }, 2400);
        }
    }

    function isPanelMotionActive() {
        return Boolean(q('mi-p')?.classList.contains('is-motion-active'));
    }
    function elementMatchesOrContains(node, selector) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        return Boolean(node.matches?.(selector) || node.querySelector?.(selector));
    }
    function mutationTouchesConversation(record, target) {
        if (target?.closest?.(CONVERSATION_SURFACE_SELECTOR)) return true;
        for (const node of record.addedNodes) {
            if (elementMatchesOrContains(node, CONVERSATION_SURFACE_SELECTOR)) return true;
        }
        for (const node of record.removedNodes) {
            if (elementMatchesOrContains(node, CONVERSATION_SURFACE_SELECTOR)) return true;
        }
        return false;
    }
    function mutationTouchesWorkspaceAgent(record, target) {
        if (target?.closest?.(AGENT_LINK_SELECTOR)) return true;
        for (const node of record.addedNodes || []) {
            if (elementMatchesOrContains(node, AGENT_LINK_SELECTOR)) return true;
        }
        return false;
    }
    function setupAutoTokenRefresh() {
        if (observer || !document.body) return;
        observer = new MutationObserver(records => {
            let relevant = false;
            let shouldScanAgents = false;
            for (const record of records) {
                const target = record.target && record.target.nodeType === 1 ? record.target : record.target?.parentElement;
                if (target?.closest?.('#mi')) continue;
                if (record.addedNodes?.length || record.removedNodes?.length) {
                    if (!relevant && mutationTouchesConversation(record, target)) relevant = true;
                    if (!shouldScanAgents && mutationTouchesWorkspaceAgent(record, target)) shouldScanAgents = true;
                }
                if (relevant && shouldScanAgents) break;
            }
            if (relevant) scheduleTokenUpdate(false, 'cheap');
            if (shouldScanAgents) scheduleWorkspaceAgentScan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            scheduleTokenUpdate(true, 'precise');
            scheduleWorkspaceAgentScan(250);
        }, { passive: true });
    }

    function refreshWhenTokenizerReady(attempt = 0) {
        if (getTokenizerApi()) {
            tokenCache.clear();
            scheduleTokenUpdate(true, 'precise');
            return;
        }
        if (attempt < 20) window.setTimeout(() => refreshWhenTokenizerReady(attempt + 1), 400);
    }

    let agentScanTimer = 0;
    let agentScanDeferred = false;
    let modelMenuQuery = '';
    let modelMenuAgentOnly = false;
    let modelMenuRenderFrame = 0;

    function scheduleDropdownFilterRender() {
        if (modelMenuRenderFrame) return;
        modelMenuRenderFrame = requestAnimationFrame(() => {
            modelMenuRenderFrame = 0;
            renderDropdown();
        });
    }

    function mergeSourceValue(previous, next) {
        const parts = new Set(String(previous || '').split('+').filter(Boolean));
        if (next) parts.add(next);
        return [...parts].join('+') || next || previous || 'page';
    }

    function commitWorkspaceAgentCatalog() {
        saveJson('agents', S.agents);
        saveValue('laf', S.lastAgentFetch);
        renderDropdown({ animateUpdate: true });
        scheduleDropdownWarmRender();
        renderRecent();
        updateInfo();
        updateDiagnostics();
    }

    function registerWorkspaceAgent(agent, source = 'page', options = {}) {
        const id = typeof agent?.id === 'string' ? agent.id.trim() : '';
        if (!/^agt_[\w:-]+$/i.test(id)) return false;

        const previous = getWorkspaceAgent(id);
        const next = {
            id,
            name: (agent.name || previous?.name || id).trim(),
            desc: typeof agent.desc === 'string' ? agent.desc : previous?.desc || '',
            source: mergeSourceValue(previous?.source, source || agent.source),
            skills: sanitizeStringList([...(previous?.skills || []), ...(agent.skills || [])]),
            tools: sanitizeStringList([...(previous?.tools || []), ...(agent.tools || [])]),
            conversations: sanitizeConversationList([...(agent.conversations || []), agent.conversation_id, agent.conversationId, agent.lastConversationId, ...(previous?.conversations || [])]),
            lastConversationId: getConversationIdFromValue(agent.lastConversationId || agent.conversation_id || agent.conversationId) || previous?.lastConversationId || '',
            updatedAt: new Date().toISOString()
        };

        const changed = !previous
            || previous.name !== next.name
            || previous.desc !== next.desc
            || previous.source !== next.source
            || previous.skills.join('|') !== next.skills.join('|')
            || previous.tools.join('|') !== next.tools.join('|')
            || previous.conversations?.join('|') !== next.conversations.join('|')
            || previous.lastConversationId !== next.lastConversationId;

        if (!changed) return false;
        S.agents = sanitizeWorkspaceAgentList([next, ...S.agents.filter(item => item.id !== id)]);
        S.lastAgentFetch = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!options.deferCommit) commitWorkspaceAgentCatalog();
        log('Workspace agent captured', next);
        return true;
    }

    function getTextLabel(node) {
        return String(node?.textContent || node?.innerText || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
    }

    function scanWorkspaceAgentsFromPage() {
        if (!isSupportedHost() || !document.body) return 0;
        let count = 0;
        const seen = new Set();
        document.querySelectorAll(AGENT_LINK_SELECTOR).forEach(node => {
            const href = node.getAttribute?.('href') || node.getAttribute?.('data-href') || '';
            const match = href.match(AGENT_PAGE_PATH_RE);
            if (!match || seen.has(match[1])) return;
            seen.add(match[1]);
            const label = getTextLabel(node) || getTextLabel(node.closest?.('li, [role="menuitem"], [role="treeitem"], [data-testid], div')) || match[1];
            if (registerWorkspaceAgent({ id: match[1], name: label }, 'page', { deferCommit: true })) count += 1;
        });

        const current = location.pathname.match(AGENT_PAGE_PATH_RE);
        if (current && !seen.has(current[1])) {
            const title = (document.title || '').replace(/\s*\|\s*ChatGPT.*$/i, '').trim();
            if (registerWorkspaceAgent({ id: current[1], name: title || current[1] }, 'page', { deferCommit: true })) count += 1;
        }
        if (current) {
            const conversations = [...new Set([...document.querySelectorAll('a[href*="/c/"], [href*="/c/"], [data-href*="/c/"]')]
                .map(node => getConversationIdFromValue((node.getAttribute?.('href') || node.getAttribute?.('data-href') || '').match(CHAT_CONVERSATION_PATH_RE)?.[1] || ''))
                .filter(Boolean))];
            if (conversations.length && registerWorkspaceAgent({
                id: current[1],
                name: getWorkspaceAgent(current[1])?.name || current[1],
                conversations,
                lastConversationId: conversations[0]
            }, 'page', { deferCommit: true })) count += 1;
        }

        if (count) commitWorkspaceAgentCatalog();
        return count;
    }

    function scheduleWorkspaceAgentScan(delay = 800) {
        if (document.hidden) return;
        if (agentScanTimer) window.clearTimeout(agentScanTimer);
        if (isPanelMotionActive()) {
            agentScanDeferred = true;
            return;
        }
        agentScanTimer = window.setTimeout(() => {
            agentScanTimer = 0;
            if (isPanelMotionActive()) {
                agentScanDeferred = true;
                return;
            }
            scanWorkspaceAgentsFromPage();
        }, delay);
    }

    function resumeDeferredUiWork() {
        if (tokenRefreshDeferred) {
            tokenRefreshDeferred = false;
            scheduleTokenUpdate();
        }
        if (agentScanDeferred) {
            agentScanDeferred = false;
            scheduleWorkspaceAgentScan(250);
        }
    }

    function getAgentIdFromValue(value) {
        return typeof value === 'string' && /^agt_[\w:-]+$/i.test(value.trim()) ? value.trim() : '';
    }

    function getAgentIdFromSystemHint(value) {
        const text = typeof value === 'string' ? value.trim() : '';
        const match = text.match(/(?:^|[^\w-])custom_agent:(agt_[\w:-]+)/i);
        return getAgentIdFromValue(match?.[1]);
    }

    function getAgentIdFromSystemHints(value) {
        if (typeof value === 'string') return getAgentIdFromSystemHint(value);
        if (!Array.isArray(value)) return '';
        for (const item of value) {
            const id = getAgentIdFromSystemHint(item);
            if (id) return id;
        }
        return '';
    }

    function normalizeSystemHints(value) {
        if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
        return typeof value === 'string' && value.trim() ? [value.trim()] : [];
    }

    function isConversationTurnPayload(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (typeof payload.action === 'string' && /^(next|variant|continue|retry)$/i.test(payload.action)) return true;
        return Boolean(payload.model || payload.parent_message_id || payload.parentMessageId || payload.messages || payload.message);
    }

    function upsertWorkspaceAgentHint(target, agentId) {
        if (!target || typeof target !== 'object' || !agentId) return { changed: false, previousId: '', hints: [] };
        const wanted = `custom_agent:${agentId}`;
        const existing = normalizeSystemHints(target.system_hints ?? target.systemHints);
        const next = [];
        let changed = false;
        let previousId = '';
        let hasWanted = false;

        for (const hint of existing) {
            const hintAgentId = getAgentIdFromSystemHint(hint);
            if (hintAgentId) {
                if (!previousId) previousId = hintAgentId;
                if (hintAgentId === agentId && !hasWanted) {
                    next.push(wanted);
                    hasWanted = true;
                } else {
                    changed = true;
                }
                continue;
            }
            next.push(hint);
        }

        if (!hasWanted) {
            next.push(wanted);
            changed = true;
        }

        const deduped = [...new Set(next)];
        if (deduped.length !== next.length) changed = true;
        if (!Array.isArray(target.system_hints) || changed) target.system_hints = deduped;
        if ('systemHints' in target) target.systemHints = deduped;

        return { changed, previousId, hints: deduped };
    }

    function ensureWorkspaceAgentSystemHint(payload, agentId) {
        if (!payload || typeof payload !== 'object' || !agentId) return { changed: false, previousId: '', hints: [] };
        const root = upsertWorkspaceAgentHint(payload, agentId);
        const results = [root];
        const ensureMessageHint = message => {
            if (!message || typeof message !== 'object') return;
            const role = message.author?.role || message.role || '';
            if (role && role !== 'user') return;
            if (!message.metadata || typeof message.metadata !== 'object') message.metadata = {};
            results.push(upsertWorkspaceAgentHint(message.metadata, agentId));
        };

        if (Array.isArray(payload.messages)) payload.messages.forEach(ensureMessageHint);
        ensureMessageHint(payload.message);

        return {
            changed: results.some(item => item.changed),
            previousId: results.find(item => item.previousId)?.previousId || '',
            hints: root.hints.length ? root.hints : (results.find(item => item.hints.length)?.hints || [])
        };
    }

    function collectConversationIds(value, out = new Set(), depth = 0) {
        if (!value || depth > 7) return out;
        if (typeof value === 'string') {
            const id = getConversationIdFromValue(value);
            if (id) out.add(id);
            return out;
        }
        if (typeof value !== 'object') return out;
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 120);
            for (let index = 0; index < limit; index += 1) {
                if (!(index in value)) continue;
                collectConversationIds(value[index], out, depth + 1);
            }
            return out;
        }
        for (const [key, nested] of Object.entries(value)) {
            if (CONVERSATION_ID_FIELD_RE.test(key)) {
                const id = getConversationIdFromValue(nested);
                if (id) out.add(id);
            }
            if (nested && typeof nested === 'object') collectConversationIds(nested, out, depth + 1);
        }
        return out;
    }

    function collectWorkspaceAgentRecords(value, fallbackId = '', out = [], depth = 0) {
        if (!value || typeof value !== 'object') return out;
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 80);
            for (let index = 0; index < limit; index += 1) {
                if (!(index in value)) continue;
                collectWorkspaceAgentRecords(value[index], fallbackId, out, depth + 1);
            }
            return out;
        }

        const directId = getAgentIdFromValue(value.id)
            || getAgentIdFromValue(value.agent_id)
            || getAgentIdFromValue(value.agentId);
        const id = directId || (depth <= 1 ? fallbackId : '');
        const name = value.name || value.title || value.display_name || value.displayName || value.nickname || '';
        if (id && name && (directId || depth <= 1)) {
            out.push({
                id,
                name: String(name),
                desc: String(value.description || value.short_description || value.shortDescription || value.subtitle || ''),
                skills: sanitizeStringList(value.skill_names || value.skillNames || value.skills || []),
                tools: sanitizeStringList(value.tools || value.connectors || []),
                conversations: [...collectConversationIds(value)],
                lastConversationId: getConversationIdFromValue(value.conversation_id || value.conversationId || value.lastConversationId)
            });
        }

        for (const [key, nested] of Object.entries(value)) {
            if (WORKSPACE_AGENT_RECORD_IGNORED_KEY_RE.test(key)) continue;
            if (nested && typeof nested === 'object') collectWorkspaceAgentRecords(nested, fallbackId, out, depth + 1);
        }
        return out;
    }

    function captureWorkspaceAgentPayload(payload, fallbackId = '', source = 'hermes') {
        const records = collectWorkspaceAgentRecords(payload, fallbackId);
        const conversations = [...collectConversationIds(payload)];
        if (fallbackId && conversations.length) {
            records.unshift({
                id: fallbackId,
                name: getWorkspaceAgent(fallbackId)?.name || fallbackId,
                conversations,
                lastConversationId: conversations[0]
            });
        }
        const unique = new Map();
        records.forEach(item => {
            const previous = unique.get(item.id);
            unique.set(item.id, previous ? {
                ...previous,
                ...item,
                conversations: sanitizeConversationList([...(previous.conversations || []), ...(item.conversations || [])]),
                lastConversationId: item.lastConversationId || previous.lastConversationId || ''
            } : item);
        });
        let count = 0;
        unique.forEach(agent => {
            if (registerWorkspaceAgent(agent, source, { deferCommit: true })) count += 1;
        });
        if (count) commitWorkspaceAgentCatalog();
        return count;
    }

    function findWorkspaceAgentMarker(value, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 8) return null;
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 120);
            for (let index = 0; index < limit; index += 1) {
                const marker = findWorkspaceAgentMarker(value[index], depth + 1);
                if (marker) return marker;
            }
            return null;
        }

        const sdk = value.chatgpt_sdk || value.chatgptSdk || value.metadata?.chatgpt_sdk || value.metadata?.chatgptSdk;
        const custom = sdk?.custom_agent || sdk?.customAgent || value.custom_agent || value.customAgent;
        const id = getAgentIdFromValue(custom?.agent_id || custom?.agentId || value.agent_id || value.agentId);
        if (id && (sdk?.is_custom_agent || custom || value.proactive_tool_completion)) {
            return {
                id,
                name: custom?.name || getWorkspaceAgent(id)?.name || id,
                proactive: Boolean(value.proactive_tool_completion)
            };
        }

        const hintedId = getAgentIdFromSystemHints(value.system_hints)
            || getAgentIdFromSystemHints(value.systemHints)
            || getAgentIdFromSystemHints(value.metadata?.system_hints)
            || getAgentIdFromSystemHints(value.metadata?.systemHints);
        if (hintedId) {
            return {
                id: hintedId,
                name: getWorkspaceAgent(hintedId)?.name || hintedId,
                proactive: false
            };
        }

        for (const [key, nested] of Object.entries(value)) {
            if (WORKSPACE_AGENT_MARKER_IGNORED_KEY_RE.test(key)) continue;
            if (nested && typeof nested === 'object') {
                const marker = findWorkspaceAgentMarker(nested, depth + 1);
                if (marker) return marker;
            }
        }
        return null;
    }

    function getWorkspaceAgentIdFromSerialized(value) {
        if (typeof value !== 'string') return '';
        const direct = getAgentIdFromValue(value);
        if (direct) return direct;
        try {
            return findWorkspaceAgentRuntimeMarker(JSON.parse(value))?.id || '';
        } catch {
            const match = value.match(/agt_[\w:-]+/i);
            return getAgentIdFromValue(match?.[0]);
        }
    }

    function findWorkspaceAgentRuntimeMarker(value, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 10) return null;
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 160);
            for (let index = 0; index < limit; index += 1) {
                const marker = findWorkspaceAgentRuntimeMarker(value[index], depth + 1);
                if (marker) return marker;
            }
            return null;
        }

        const sdk = value.chatgpt_sdk || value.chatgptSdk || value.metadata?.chatgpt_sdk || value.metadata?.chatgptSdk;
        const custom = sdk?.custom_agent || sdk?.customAgent || value.custom_agent || value.customAgent;
        const runtimeId = getAgentIdFromValue(custom?.agent_id || custom?.agentId || custom?.id || value.agent_id || value.agentId);
        if (runtimeId && (sdk?.is_custom_agent === true || custom?.agent_id || custom?.agentId || value.proactive_tool_completion)) {
            return {
                id: runtimeId,
                name: custom?.name || getWorkspaceAgent(runtimeId)?.name || runtimeId,
                source: 'runtime'
            };
        }

        const kind = String(value.name || value.type || value.ref_type || value.refType || value.kind || '');
        if (WORKSPACE_AGENT_CUSTOM_RUN_RE.test(kind)) {
            const id = getAgentIdFromValue(value.agent_id || value.agentId || value.agent?.id || value.custom_agent?.agent_id || value.customAgent?.agentId)
                || getWorkspaceAgentIdFromSerialized(value.text)
                || getWorkspaceAgentIdFromSerialized(value.value)
                || getWorkspaceAgentIdFromSerialized(value.content)
                || getWorkspaceAgentIdFromSerialized(value.matched_text)
                || getWorkspaceAgentIdFromSerialized(value.matchedText);
            if (id) {
                return {
                    id,
                    name: value.agent?.name || value.custom_agent?.name || value.customAgent?.name || getWorkspaceAgent(id)?.name || id,
                    source: 'custom_agent_run'
                };
            }
        }

        const widgetAgent = value.view_state?.agent || value.viewState?.agent || value.initialState?.agent || value.dil?.initialState?.agent;
        const widgetId = getAgentIdFromValue(widgetAgent?.id || widgetAgent?.agent_id || widgetAgent?.agentId);
        if (widgetId) {
            return {
                id: widgetId,
                name: widgetAgent?.name || getWorkspaceAgent(widgetId)?.name || widgetId,
                source: 'widget'
            };
        }

        for (const [key, nested] of Object.entries(value)) {
            if (WORKSPACE_AGENT_SYSTEM_HINT_KEY_RE.test(key)) continue;
            if (WORKSPACE_AGENT_CUSTOM_RUN_RE.test(key)) {
                const id = getWorkspaceAgentIdFromSerialized(nested) || getAgentIdFromValue(nested?.agent_id || nested?.agentId);
                if (id) return { id, name: getWorkspaceAgent(id)?.name || id, source: 'custom_agent_run' };
            }
            if (nested && typeof nested === 'object') {
                const marker = findWorkspaceAgentRuntimeMarker(nested, depth + 1);
                if (marker) return marker;
            }
        }
        return null;
    }

    function findWorkspaceAgentAuthorMarker(value, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 8) return null;
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 160);
            for (let index = 0; index < limit; index += 1) {
                const marker = findWorkspaceAgentAuthorMarker(value[index], depth + 1);
                if (marker) return marker;
            }
            return null;
        }

        const author = value.author && typeof value.author === 'object' ? value.author : null;
        const authorName = String(author?.name || value.author_name || value.authorName || '').trim();
        if (authorName) {
            const selected = getSelectedWorkspaceAgent();
            const named = getWorkspaceAgentByName(authorName);
            if (named || (selected?.name && selected.name === authorName)) {
                const agent = named || selected;
                return { id: agent.id, name: agent.name || authorName, source: 'author.name' };
            }
        }

        for (const [key, nested] of Object.entries(value)) {
            if (WORKSPACE_AGENT_AUTHOR_STRING_KEY_RE.test(key) && typeof nested === 'string') continue;
            if (nested && typeof nested === 'object') {
                const marker = findWorkspaceAgentAuthorMarker(nested, depth + 1);
                if (marker) return marker;
            }
        }
        return null;
    }

    function getMessageWorkspaceAgentHintMarker(message) {
        const id = getAgentIdFromSystemHints(message?.metadata?.system_hints)
            || getAgentIdFromSystemHints(message?.metadata?.systemHints)
            || getAgentIdFromSystemHints(message?.system_hints)
            || getAgentIdFromSystemHints(message?.systemHints);
        return id ? { id, name: getWorkspaceAgent(id)?.name || id, source: 'system_hints' } : null;
    }

    function getMessageResponseModel(message) {
        const metadata = message?.metadata || {};
        return metadata.resolved_model_slug || metadata.model_slug || metadata.default_model_slug || message?.model_slug || message?.model || '';
    }

    function getMappingMessage(node) {
        return node?.message || node?.data?.message || (node?.author || node?.metadata || node?.content ? node : null);
    }

    function evaluateWorkspaceAgentConversation(data) {
        const selectedId = getWorkspaceAgentId();
        const mapping = data?.mapping && typeof data.mapping === 'object' ? data.mapping : null;
        let runtimeMarker = null;
        let hintMarker = null;
        let responseModel = '';

        if (mapping) {
            const currentId = data.current_node || data.currentNode || data.current_node_id || data.currentNodeId || '';
            const seen = new Set();
            let cursor = currentId;
            let chainRuntimeMarker = null;
            let chainHintMarker = null;
            let chainResponseModel = '';
            while (cursor && mapping[cursor] && !seen.has(cursor)) {
                seen.add(cursor);
                const node = mapping[cursor];
                const message = getMappingMessage(node);
                chainRuntimeMarker = chainRuntimeMarker || findWorkspaceAgentRuntimeMarker(message);
                chainHintMarker = chainHintMarker || getMessageWorkspaceAgentHintMarker(message);
                chainResponseModel = chainResponseModel || getMessageResponseModel(message);
                cursor = node.parent || node.parent_id || node.parentId || message?.parent || message?.parent_id || '';
            }

            if (chainRuntimeMarker || chainHintMarker) {
                runtimeMarker = chainRuntimeMarker;
                hintMarker = chainHintMarker;
                responseModel = chainResponseModel;
            } else {
                Object.values(mapping).forEach(node => {
                    const message = getMappingMessage(node);
                    if (!message) return;
                    runtimeMarker = runtimeMarker || findWorkspaceAgentRuntimeMarker(message);
                    hintMarker = hintMarker || getMessageWorkspaceAgentHintMarker(message);
                    if (!responseModel && (message.author?.role === 'assistant' || message.role === 'assistant')) {
                        responseModel = getMessageResponseModel(message);
                    }
                });
            }
        } else {
            runtimeMarker = findWorkspaceAgentRuntimeMarker(data);
            hintMarker = findWorkspaceAgentMarker(data);
        }

        const marker = runtimeMarker || hintMarker;
        if (!marker) return null;
        if (runtimeMarker) return { marker: runtimeMarker, status: 'confirmed', responseModel };
        if (selectedId && hintMarker?.id === selectedId) return { marker: hintMarker, status: 'fallback', responseModel };
        return { marker: hintMarker, status: 'hinted', responseModel };
    }

    function updateWorkspaceAgentDiagnostic(marker, status = 'detected', extra = {}) {
        const selectedId = getWorkspaceAgentId();
        if (!marker?.id && !selectedId) return;
        const id = marker?.id || selectedId;
        const agent = getWorkspaceAgent(id);
        injectionDiagnostic = {
            ...injectionDiagnostic,
            ...extra,
            workspaceAgentId: id,
            workspaceAgentName: marker?.name || agent?.name || id,
            workspaceAgentStatus: status || 'detected'
        };
        updateDiagnostics();
    }

    function observeWorkspaceAgentResponse(url, response) {
        const urlText = String(url || '');
        if (!/\/backend-api\/(?:hermes\/agent|conversation\/)/.test(urlText) || !response?.ok) return;
        const hermesMatch = urlText.match(HERMES_AGENT_PATH_RE);
        response.clone().json().then(data => {
            if (hermesMatch) {
                captureWorkspaceAgentPayload(data, hermesMatch[1], 'hermes');
                updateWorkspaceAgentDiagnostic({ id: hermesMatch[1], name: getWorkspaceAgent(hermesMatch[1])?.name || hermesMatch[1] }, 'detected');
                return;
            }

            const evidence = evaluateWorkspaceAgentConversation(data);
            if (evidence?.marker) {
                const conversationId = getBackendConversationId(urlText) || [...collectConversationIds(data)][0] || getCurrentConversationId();
                registerWorkspaceAgent({
                    id: evidence.marker.id,
                    name: evidence.marker.name,
                    conversations: conversationId ? [conversationId] : [],
                    lastConversationId: conversationId
                }, 'conversation');
                updateWorkspaceAgentDiagnostic(evidence.marker, evidence.status === 'confirmed' ? 'history' : evidence.status, {
                    responseModel: evidence.responseModel || injectionDiagnostic.responseModel,
                    routeStatus: evidence.status === 'fallback' ? 'skipped' : injectionDiagnostic.routeStatus
                });
            }
        }).catch(() => {});
    }

    function recordWorkspaceAgentKeep(payload, status = 'pending') {
        const id = getWorkspaceAgentId();
        const agent = getWorkspaceAgent(id);
        const hasRequestHint = ['ready', 'forced', 'hinted'].includes(status);
        injectionDiagnostic = {
            selected: S.model,
            lastModel: hasRequestHint ? (payload?.model || '') : '',
            originalModel: payload?.model || '',
            thinkingEffort: '',
            effortRequested: S.effort,
            effortEnabled: S.effortOn,
            effortApplied: false,
            responseModel: '',
            routeStatus: hasRequestHint ? 'unknown' : 'skipped',
            workspaceAgentId: id,
            workspaceAgentName: agent?.name || id,
            workspaceAgentStatus: status,
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: '',
            skipReason: hasRequestHint ? '' : 'workspace_agent_context_not_confirmed'
        };
        updateDiagnostics();
    }

    function blockWorkspaceAgentFallback(payload, detail = '') {
        const id = getWorkspaceAgentId();
        const agent = getWorkspaceAgent(id);
        const reason = detail || 'Workspace Agent lock blocked ordinary model fallback: request has no official agent runtime marker.';
        injectionDiagnostic = {
            selected: S.model,
            lastModel: '',
            originalModel: payload?.model || '',
            thinkingEffort: '',
            effortRequested: S.effort,
            effortEnabled: S.effortOn,
            effortApplied: false,
            responseModel: '',
            routeStatus: 'skipped',
            workspaceAgentId: id,
            workspaceAgentName: agent?.name || id,
            workspaceAgentStatus: 'required',
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: reason,
            skipReason: 'workspace_agent_context_not_confirmed',
            packetRequest: injectionDiagnostic.packetRequest || null,
            packetResponse: null
        };
        updateDiagnostics();
        log('Workspace agent fallback blocked', {
            selectedAgentId: id,
            originalModel: payload?.model || null,
            conversationMode: getConversationModeKind(payload) || null,
            reason
        });
        return { blocked: true, diagnostic: { ...injectionDiagnostic } };
    }

    function getFetchUrl(input) {
        if (typeof input === 'string') return input;
        if (input instanceof URL) return input.href;
        return input?.url || '';
    }

    function getSameOriginUrl(value) {
        try {
            const parsed = new URL(String(value || ''), location.origin);
            return parsed.origin === location.origin ? parsed : null;
        } catch {
            return null;
        }
    }

    function isExactEndpointUrl(value, pathname) {
        return getSameOriginUrl(value)?.pathname === pathname;
    }

    function getSentinelRequirementsPhase(value) {
        const pathname = getSameOriginUrl(value)?.pathname || '';
        if (SENTINEL_REQUIREMENTS_PREPARE_PATH_RE.test(pathname)) return 'prepare';
        if (SENTINEL_REQUIREMENTS_FINALIZE_PATH_RE.test(pathname)) return 'finalize';
        return '';
    }

    function mergeHeaders(...sources) {
        const headers = new Headers();
        for (const source of sources.filter(Boolean)) {
            try {
                new Headers(source).forEach((value, key) => headers.set(key, value));
            } catch {}
        }
        return headers;
    }

    function getRelativeUrl(url) {
        try {
            const resolved = new URL(url, location.origin);
            if (resolved.origin !== location.origin) return '';
            return `${resolved.pathname}${resolved.search}`;
        } catch {
            return '';
        }
    }

    function pickHeaders(source, allowlist) {
        const headers = new Headers();
        try {
            new Headers(source).forEach((value, key) => {
                if (allowlist.has(key.toLowerCase())) headers.set(key, value);
            });
        } catch {}
        return headers;
    }

    function buildCategoryIndex(categories) {
        const index = new Map();
        for (const category of categories || []) {
            const slugs = new Set([...(category?.supported_models || []), category?.default_model].filter(Boolean));
            slugs.forEach(slug => {
                if (!index.has(slug)) index.set(slug, category);
            });
        }
        return index;
    }

    function buildVersionIndex(versions) {
        const index = new Map();
        for (const version of versions || []) {
            for (const slug of version?.slugs || []) {
                if (!index.has(slug)) index.set(slug, version);
            }
        }
        return index;
    }

    function extractThinkingEffortIds(value) {
        if (!Array.isArray(value)) return [];
        return value.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                return item.thinking_effort || item.effort || item.id || item.value || '';
            }
            return '';
        });
    }

    function normalizeApiModels(payload) {
        const models = Array.isArray(payload) ? payload : payload?.models;
        const categoryIndex = buildCategoryIndex(Array.isArray(payload) ? [] : payload?.categories);
        const versionIndex = buildVersionIndex(Array.isArray(payload) ? [] : payload?.versions);
        const unique = new Map();
        for (const model of models || []) {
            const slug = typeof model?.slug === 'string' ? model.slug : '';
            if (slug) unique.set(slug, model);
        }

        return [...unique.values()].map(model => {
            const category = categoryIndex.get(model.slug);
            const version = versionIndex.get(model.slug);
            return {
                id: model.slug,
                name: model.title || model.slug,
                tokens: Number(model.max_tokens) > 0 ? Number(model.max_tokens) : 0,
                desc: model.description || '',
                tools: sanitizeStringList(model.enabled_tools || []),
                reasoning: model.reasoning_type || '',
                configurableEffort: Boolean(model.configurable_thinking_effort),
                // API returns objects like { thinking_effort: "standard", ... }; keep only ids.
                thinkingEfforts: sanitizeStringList(extractThinkingEffortIds(model.thinking_efforts)),
                workMode: Boolean(model.is_work_mode_model),
                deprecated: Boolean(category?.is_soft_deprecated),
                deprecationDate: typeof category?.hard_deprecation_date === 'string' ? category.hard_deprecation_date : '',
                category: category?.category || '',
                categoryName: category?.human_category_name || '',
                categoryLabel: category?.human_category_short_name || '',
                categoryLane: category?.model_lane || '',
                version: version?.id || category?.model_version || '',
                versionLabel: version?.display_text || '',
                shortExplainer: category?.short_explainer || '',
                tagline: category?.tagline || ''
            };
        }).sort(sortModelEntries);
    }

    function ingestApiModels(payload, options = {}) {
        const normalized = sanitizeApiList(normalizeApiModels(payload));
        if (!normalized.length) return false;

        S.api = normalized;
        liveApiModelIds.clear();
        normalized.forEach(model => liveApiModelIds.add(model.id));
        S.lastFetch = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveJson('api', S.api);
        saveValue('lf', S.lastFetch);

        log(options.fromHook ? 'API models updated from hook' : 'API models loaded', S.api.length);
        renderDropdown();
        scheduleDropdownWarmRender();
        renderRecent();
        updateInfo();
        updateModelLabel();
        scheduleTokenUpdate();
        return true;
    }

    async function getRequestBodyText(input, init) {
        if (typeof init?.body === 'string') return init.body;
        if (input instanceof Request) {
            try {
                return await input.clone().text();
            } catch (error) {
                log('Failed to read request body', error);
            }
        }
        return '';
    }

    function getConversationModeKind(payload) {
        const mode = payload?.conversation_mode || payload?.conversationMode;
        return typeof mode?.kind === 'string' ? mode.kind : '';
    }

    const STRUCTURED_AGENT_IGNORED_CONTENT_KEYS = new Set(['messages', 'content', 'parts', 'text', 'prompt']);
    const STRUCTURED_AGENT_KEYS = [
        'agent_id',
        'agentId',
        'agent_mode',
        'agentMode',
        'agentModeEnabled',
        'is_agent_mode',
        'isAgentMode',
        'custom_agent',
        'customAgent',
        'workspace_agent',
        'workspaceAgent',
        'proxy_mode',
        'proxyMode',
        'proxyModeEnabled',
        'conversation_agent',
        'conversationAgent',
        'agent',
        'agents'
    ];

    function getStructuredAgentSignal(value, depth = 0) {
        if (typeof value === 'string') return getAgentIdFromSystemHint(value) ? 'system_hints.custom_agent' : '';
        if (!value || typeof value !== 'object' || depth > 3) return '';
        if (Array.isArray(value)) {
            const limit = Math.min(value.length, 20);
            for (let index = 0; index < limit; index += 1) {
                const signal = getStructuredAgentSignal(value[index], depth + 1);
                if (signal) return signal;
            }
            return '';
        }

        for (const key of STRUCTURED_AGENT_KEYS) {
            if (Object.prototype.hasOwnProperty.call(value, key)) return key;
        }

        for (const [key, nested] of Object.entries(value)) {
            if (STRUCTURED_AGENT_IGNORED_CONTENT_KEYS.has(key)) continue;
            if (WORKSPACE_AGENT_SYSTEM_HINT_KEY_RE.test(key)) {
                const id = getAgentIdFromSystemHints(nested);
                if (id) return `${key}.custom_agent`;
            }
            if (STRUCTURED_AGENT_CONTAINER_KEY_RE.test(key)) {
                const text = typeof nested === 'string' ? nested : '';
                if (/\b(agent|proxy|operator|workspace_agent)\b|代理模式/i.test(text)) return key;
                const signal = getStructuredAgentSignal(nested, depth + 1);
                if (signal) return `${key}.${signal}`;
            }
        }

        return '';
    }

    function isVisibleElement(element) {
        if (!element || !element.getBoundingClientRect) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
            && rect.height > 0
            && rect.bottom > 0
            && rect.right > 0
            && rect.top < window.innerHeight
            && rect.left < window.innerWidth
            && style.visibility !== 'hidden'
            && style.display !== 'none';
    }

    function getActiveComposerWorkspaceAgent() {
        try {
            const inputSelector = '[contenteditable="true"][role="textbox"], textarea';
            const activeElement = document.activeElement;
            let input = activeElement?.matches?.(inputSelector) && isVisibleElement(activeElement) ? activeElement : null;
            if (!input) {
                const inputs = document.querySelectorAll(inputSelector);
                for (let index = inputs.length - 1; index >= 0; index -= 1) {
                    if (isVisibleElement(inputs[index])) {
                        input = inputs[index];
                        break;
                    }
                }
            }
            if (!input) return null;

            let root = input.closest('form') || input.parentElement;
            const roots = [];
            for (let i = 0; root && i < 8; i += 1, root = root.parentElement) {
                roots.push(root);
                const anchor = [...root.querySelectorAll('a[href*="/agents/a/"]')].find(isVisibleElement);
                const match = anchor?.getAttribute('href')?.match(AGENT_PAGE_PATH_RE);
                if (match?.[1]) {
                    return {
                        id: match[1],
                        name: anchor.textContent?.trim() || getWorkspaceAgent(match[1])?.name || match[1],
                        source: 'composer'
                    };
                }
            }

            const knownAgents = [...S.agents]
                .filter(agent => agent?.id && agent?.name)
                .sort((a, b) => String(b.name).length - String(a.name).length);
            const findKnownAgentInText = text => {
                const normalized = String(text || '').replace(/\s+/g, ' ').trim();
                if (!normalized) return null;
                return knownAgents.find(agent => normalized.includes(agent.name)) || null;
            };
            for (const candidateRoot of roots) {
                const text = (candidateRoot.textContent || candidateRoot.innerText || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                const matched = findKnownAgentInText(text);
                if (matched) {
                    return {
                        id: matched.id,
                        name: matched.name,
                        source: 'composer-text'
                    };
                }
            }

            for (const candidateRoot of roots) {
                const text = (candidateRoot.textContent || candidateRoot.innerText || '').replace(/\s+/g, ' ').trim();
                const explicitAgentLabel = text.match(/([\u4e00-\u9fffA-Za-z0-9 _-]{2,80}(?:助手|Agent|agent|智能体))/);
                if (explicitAgentLabel?.[1]) {
                    return {
                        id: '',
                        name: explicitAgentLabel[1].trim(),
                        source: 'composer-agent-text'
                    };
                }
            }
        } catch (error) {
            log('Composer agent detection failed', { error: error?.message || String(error) });
        }
        return null;
    }

    function getRewriteBlockReason(payload, packetContext = null) {
        const kind = getConversationModeKind(payload);
        if (packetContext) packetContext.conversationMode = kind;
        if (kind && kind !== 'primary_assistant' && !isWorkConversationKind(kind)) {
            return `conversation_mode=${kind}`;
        }

        const structuredAgentSignal = getStructuredAgentSignal(payload);
        if (packetContext) packetContext.agentSignal = structuredAgentSignal;
        if (structuredAgentSignal) return `agent_signal=${structuredAgentSignal}`;

        if (!isWorkspaceAgentSelection(S.model)) {
            const conversationId = getConversationIdFromValue(payload?.conversation_id || payload?.conversationId) || getCurrentConversationId();
            const conversationAgent = getWorkspaceAgentForConversation(conversationId);
            if (conversationAgent) return `conversation_agent_history=${conversationAgent.id}`;
        }

        const composerAgent = getActiveComposerWorkspaceAgent();
        if (packetContext) packetContext.composerAgent = composerAgent;
        if (composerAgent) return `composer_agent=${composerAgent.id || composerAgent.name || 'visible'}`;

        if (/^\/agents(?:\/|$)/.test(location.pathname)) return 'agents_page';
        return '';
    }

    function recordRewriteSkip(payload, reason) {
        injectionDiagnostic = {
            selected: S.model,
            lastModel: '',
            originalModel: payload?.model || '',
            thinkingEffort: '',
            effortRequested: S.effort,
            effortEnabled: S.effortOn,
            effortApplied: false,
            responseModel: '',
            routeStatus: 'skipped',
            workspaceAgentId: '',
            workspaceAgentName: '',
            workspaceAgentStatus: 'unknown',
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: '',
            skipReason: reason || ''
        };
        updateDiagnostics();
    }

    function buildConversationRequestPacket(payload, stage = 'before', packetContext = null) {
        const rootHints = normalizeSystemHints(payload.system_hints ?? payload.systemHints);
        const messageHints = new Set();
        const messageMetadataKeys = new Set();
        if (Array.isArray(payload.messages)) {
            payload.messages.forEach(message => {
                for (const hint of normalizeSystemHints(message?.metadata?.system_hints ?? message?.metadata?.systemHints)) {
                    messageHints.add(hint);
                }
            });
            payload.messages.forEach(message => {
                for (const key of Object.keys(message?.metadata || {})) messageMetadataKeys.add(key);
            });
        }
        const hasComposerAgent = packetContext && Object.prototype.hasOwnProperty.call(packetContext, 'composerAgent');
        const hasConversationMode = packetContext && Object.prototype.hasOwnProperty.call(packetContext, 'conversationMode');
        const hasAgentSignal = packetContext && Object.prototype.hasOwnProperty.call(packetContext, 'agentSignal');
        const composerAgent = hasComposerAgent ? packetContext.composerAgent : getActiveComposerWorkspaceAgent();
        const runtimeMarker = findWorkspaceAgentRuntimeMarker(payload);
        const hintMarker = findWorkspaceAgentMarker(payload);
        const packet = {
            stage,
            model: payload.model || null,
            selectedModel: S.model || null,
            conversationMode: (hasConversationMode ? packetContext.conversationMode : getConversationModeKind(payload)) || null,
            rootSystemHints: rootHints,
            messageSystemHints: [...messageHints],
            rootKeys: Object.keys(payload).slice(0, 80),
            messageMetadataKeys: [...messageMetadataKeys].slice(0, 80),
            composerAgent: composerAgent ? { id: composerAgent.id, name: composerAgent.name || composerAgent.id } : null,
            runtimeAgent: runtimeMarker ? { id: runtimeMarker.id, name: runtimeMarker.name || runtimeMarker.id, source: runtimeMarker.source || '' } : null,
            hintAgent: hintMarker ? { id: hintMarker.id, name: hintMarker.name || hintMarker.id, source: hintMarker.source || '' } : null,
            forceParallelSwitch: payload.force_parallel_switch || payload.forceParallelSwitch || null,
            agentSignal: (hasAgentSignal ? packetContext.agentSignal : getStructuredAgentSignal(payload)) || null,
            action: payload.action || null,
            clientPrepareState: payload.client_prepare_state || payload.clientPrepareState || null,
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        return packet;
    }

    function sanitizeUrlForLog(url) {
        try {
            const parsed = new URL(String(url || ''), location.origin);
            return parsed.origin === location.origin ? parsed.pathname : '';
        } catch {
            return '';
        }
    }

    function sanitizeLogString(value) {
        return String(value)
            .replace(/\bagt_[a-z0-9_:-]+\b/gi, '[redacted-agent]')
            .replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, '[redacted-id]')
            .replace(/\b(custom_agent|composer_agent|conversation_agent_history)\s*[:=]\s*[^\s,;|]+/gi, '$1=[redacted]');
    }

    function sanitizeLogValue(value, depth = 0) {
        if (depth > 5) return '[truncated]';
        if (Array.isArray(value)) return value.slice(0, 40).map(item => sanitizeLogValue(item, depth + 1));
        if (typeof value === 'string') return sanitizeLogString(value);
        if (!value || typeof value !== 'object') return value;
        const safe = {};
        for (const [key, item] of Object.entries(value)) {
            if (/authorization|cookie|session|device|account.?id|conversation.?id|agent.?id|agent.?name/i.test(key)) {
                safe[key] = item ? '[redacted]' : item;
                continue;
            }
            safe[key] = sanitizeLogValue(item, depth + 1);
        }
        return safe;
    }

    function isConversationEndpointUrl(url) {
        const parsed = getSameOriginUrl(url);
        return Boolean(parsed && (parsed.pathname === '/backend-api/f/conversation' || parsed.pathname === '/backend-api/conversation'));
    }

    function appendPacketLog(kind, packet, extra = {}) {
        if (!S.debug) return;
        try {
            const entry = {
                kind,
                build: SCRIPT_BUILD,
                time: new Date().toISOString(),
                page: sanitizeUrlForLog(location.href),
                selected: S.model || '',
                enabled: Boolean(S.on),
                packet: sanitizeLogValue(packet || null),
                extra: sanitizeLogValue(extra && typeof extra === 'object' ? extra : {})
            };
            writePacketLog([...packetLog, entry]);
        } catch (error) {
            log('Packet log write failed', { error: error?.message || String(error) });
        }
    }

    function normalizePowDifficulty(value) {
        const normalized = String(value || '').trim().replace(/^0x/i, '');
        return /^[0-9a-f]+$/i.test(normalized) ? normalized : '';
    }

    function parsePowDifficultyDecimal(value) {
        const normalized = normalizePowDifficulty(value);
        if (!normalized || normalized.length > 13) return null;
        const decimal = Number.parseInt(normalized, 16);
        return Number.isSafeInteger(decimal) ? decimal : null;
    }

    function getPowDifficultyGrade(value) {
        const normalized = normalizePowDifficulty(value);
        if (!normalized) return { key: 'unknown', tone: 'muted', significantHexLength: 0 };

        const significant = normalized.replace(/^0+/, '') || '0';
        const significantHexLength = significant.length;
        if (significantHexLength >= 5) return { key: 'excellent', tone: 'success', significantHexLength };
        if (significantHexLength === 4) return { key: 'normal', tone: 'normal', significantHexLength };
        if (significantHexLength === 3) return { key: 'elevated', tone: 'warning', significantHexLength };
        return { key: 'high_risk', tone: 'danger', significantHexLength };
    }

    function extractPowRequirement(payload) {
        if (!payload || typeof payload !== 'object') return null;
        const requirement = payload.proofofwork || payload.proof_of_work || payload.proofOfWork;
        if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) return null;
        const difficulty = typeof requirement.difficulty === 'string' ? requirement.difficulty.trim().slice(0, 80) : '';
        return {
            required: typeof requirement.required === 'boolean' ? requirement.required : null,
            difficulty,
            difficultyDecimal: difficulty ? parsePowDifficultyDecimal(difficulty) : null
        };
    }

    async function captureSentinelRequirements(input, init, url, response) {
        const phase = getSentinelRequirementsPhase(url);
        if (!phase) return;
        const parsedUrl = getSameOriginUrl(url);
        const endpoint = parsedUrl?.pathname || '';
        if (phase === 'prepare') {
            let payload = null;
            try {
                payload = await response.clone().json();
            } catch (error) {
                log('Failed to parse Sentinel requirements response', error);
            }
            const requirement = extractPowRequirement(payload);
            const record = {
                endpoint,
                status: response?.status || 0,
                ok: Boolean(response?.ok),
                required: requirement?.required ?? null,
                difficulty: requirement?.difficulty || '',
                difficultyDecimal: requirement?.difficultyDecimal ?? null,
                at: Date.now()
            };
            lastPowDetection = record;
            injectionDiagnostic = { ...injectionDiagnostic, pow: record };
            appendPacketLog('sentinel-pow-difficulty', null, record);
            updateDiagnostics();
            log('Sentinel PoW difficulty captured', record);
            return;
        }

        const bodyText = await getRequestBodyText(input, init);
        const payload = parseJsonMaybe(bodyText);
        const headerValue = response?.headers?.get?.('x-oai-is-update') || '';
        lastSentinelFinalize = {
            endpoint,
            status: response?.status || 0,
            ok: Boolean(response?.ok),
            hasOaiIsUpdate: Boolean(headerValue),
            oaiIsUpdateLength: headerValue.length || 0,
            requestKeys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 40) : [],
            powRequired: lastPowDetection?.required === true,
            powDifficulty: lastPowDetection?.difficulty || '',
            at: Date.now()
        };
        appendPacketLog('sentinel-finalize', null, lastSentinelFinalize);
        updateDiagnostics();
    }
    function getSentinelFinalizeSummary() {
        if (!lastSentinelFinalize?.at) return null;
        return {
            status: lastSentinelFinalize.status || 0,
            ok: Boolean(lastSentinelFinalize.ok),
            hasOaiIsUpdate: Boolean(lastSentinelFinalize.hasOaiIsUpdate),
            powRequired: Boolean(lastSentinelFinalize.powRequired),
            powDifficulty: lastSentinelFinalize.powDifficulty || '',
            ageMs: Math.max(0, Date.now() - lastSentinelFinalize.at)
        };
    }

    function exportPacketLog() {
        if (!S.debug) return;
        try {
            const payload = {
                build: SCRIPT_BUILD,
                exportedAt: new Date().toISOString(),
                page: sanitizeUrlForLog(location.href),
                selected: S.model || '',
                enabled: Boolean(S.on),
                currentDiagnostic: sanitizeLogValue({ ...injectionDiagnostic, pow: lastPowDetection }),
                entries: readPacketLog()
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mi-packet-log-${Date.now()}.json`;
            document.documentElement.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            log('Packet log export failed', { error: error?.message || String(error) });
        }
    }

    async function captureConversationRequestPacket(input, init, url, stage = 'before') {
        if (!isConversationEndpointUrl(url)) return;
        const method = (init?.method || input?.method || 'GET').toUpperCase();
        if (method !== 'POST') return;
        const bodyText = await getRequestBodyText(input, init);
        const payload = parseJsonMaybe(bodyText);
        if (!payload || typeof payload !== 'object') return;

        const packet = buildConversationRequestPacket(payload, stage);
        injectionDiagnostic = { ...injectionDiagnostic, packetRequest: packet, packetResponse: null };
        appendPacketLog('request-capture', packet, {
            url: sanitizeUrlForLog(url),
            transport: 'fetch',
            sentinel: getSentinelFinalizeSummary()
        });
        updateDiagnostics();
        log('Conversation request packet', packet);
    }

    function rewriteConversationPayload(payload, packetContext = null) {
        if (!(S.on && S.model) || !payload || typeof payload !== 'object') return null;
        if (!isConversationTurnPayload(payload)) return null;
        const blockReason = getRewriteBlockReason(payload, packetContext);
        if (blockReason) {
            recordRewriteSkip(payload, blockReason);
            appendPacketLog('rewrite-skip', buildConversationRequestPacket(payload, 'skip-model-rewrite'), {
                reason: blockReason,
                transport: 'generic',
                selectedModel: S.model
            });
            log('Conversation request left untouched', {
                reason: blockReason,
                selectedModel: S.model,
                originalModel: payload.model || null,
                conversationMode: getConversationModeKind(payload) || null
            });
            return null;
        }
        const originalModel = payload.model;
        const rewriteInfo = {
            originalModel,
            injectedModel: S.model,
            effortEnabled: S.effortOn,
            effortRequested: S.effort,
            effortApplied: false,
            removedThinkingEffort: false
        };
        payload.model = S.model;
        if (S.effortOn && isThinkingModel(S.model)) {
            rewriteInfo.thinkingEffort = mapEffort(S.effort, S.model);
            rewriteInfo.effortApplied = true;
            rewriteInfo.workModel = isWorkModel(S.model);
            rewriteInfo.supportedEfforts = getModelThinkingEfforts(S.model);
            payload.thinking_effort = rewriteInfo.thinkingEffort;
        } else if ('thinking_effort' in payload) {
            rewriteInfo.removedThinkingEffort = true;
            delete payload.thinking_effort;
        }
        return rewriteInfo;
    }

    async function rewriteConversationRequest(input, init, url) {
        if (!(S.on && S.model && isConversationEndpointUrl(url))) return null;
        const method = (init?.method || input?.method || 'GET').toUpperCase();
        if (method !== 'POST') return null;

        const bodyText = await getRequestBodyText(input, init);
        if (!bodyText) return null;

        let payload = null;
        try {
            payload = JSON.parse(bodyText);
        } catch {
            return null;
        }

        if (isWorkspaceAgentSelection(S.model)) {
            if (!isConversationTurnPayload(payload)) return null;
            const selectedAgentId = getWorkspaceAgentId();
            const originalModel = payload.model || '';
            const runtimeMarker = findWorkspaceAgentRuntimeMarker(payload);
            const hintMarker = findWorkspaceAgentMarker(payload);
            const composerAgent = getActiveComposerWorkspaceAgent();
            if (composerAgent?.id) registerWorkspaceAgent(composerAgent, 'composer');
            const requestAgentId = runtimeMarker?.id || '';
            const hintedAgentId = hintMarker?.id || '';
            const composerAgentId = composerAgent?.id || '';
            const runtimeMatches = selectedAgentId && requestAgentId === selectedAgentId;
            const hintMatches = selectedAgentId && hintedAgentId === selectedAgentId;
            const markerConflicts = selectedAgentId && requestAgentId && requestAgentId !== selectedAgentId;
            const hintConflicts = selectedAgentId && hintedAgentId && hintedAgentId !== selectedAgentId;
            const status = runtimeMatches || hintMatches ? 'ready' : 'forced';
            recordWorkspaceAgentKeep(payload, status);
            log('Workspace agent request evaluated', {
                selectedAgentId,
                conversationId: getConversationIdFromValue(payload?.conversation_id || payload?.conversationId) || getCurrentConversationId(),
                payloadAgentId: requestAgentId || null,
                hintedAgentId: hintedAgentId || null,
                composerAgentId: composerAgentId || null,
                reason: runtimeMatches
                    ? 'payload runtime agent marker present'
                    : hintMatches
                    ? 'payload custom_agent hint present'
                    : markerConflicts
                    ? 'payload runtime agent marker conflicts with selected agent'
                    : hintConflicts
                    ? 'payload custom_agent hint conflicts with selected agent'
                    : 'injecting custom_agent hint',
                originalModel
            });
            const hintInfo = ensureWorkspaceAgentSystemHint(payload, selectedAgentId);
            const previousForceSwitch = payload.force_parallel_switch ?? payload.forceParallelSwitch;
            if (!payload.force_parallel_switch) payload.force_parallel_switch = 'auto';
            if ('forceParallelSwitch' in payload && !payload.forceParallelSwitch) payload.forceParallelSwitch = 'auto';
            const changed = hintInfo.changed || !previousForceSwitch || markerConflicts || hintConflicts;
            const rewrittenBody = JSON.stringify(payload);

            injectionDiagnostic = {
                selected: S.model,
                lastModel: payload.model || '',
                originalModel,
                thinkingEffort: '',
                effortRequested: S.effort,
                effortEnabled: S.effortOn,
                effortApplied: false,
                responseModel: '',
                routeStatus: 'unknown',
                workspaceAgentId: selectedAgentId,
                workspaceAgentName: getWorkspaceAgent(selectedAgentId)?.name || selectedAgentId,
                workspaceAgentStatus: changed ? 'forced' : 'ready',
                at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                error: '',
                skipReason: '',
                packetRequest: buildConversationRequestPacket(payload, changed ? 'after-workspace-agent-rewrite' : 'after-workspace-agent-verify'),
                packetResponse: null
            };
            appendPacketLog(changed ? 'workspace-agent-rewrite' : 'workspace-agent-verify', injectionDiagnostic.packetRequest, {
                transport: 'fetch',
                originalModel,
                selectedAgentId,
                sentinel: getSentinelFinalizeSummary()
            });
            updateDiagnostics();

            const headers = mergeHeaders(input instanceof Request ? input.headers : null, init?.headers);
            if (!headers.has('content-type')) headers.set('content-type', 'application/json');
            S.cnt += 1;
            updateBadge();
            log(changed ? 'Workspace agent request patched' : 'Workspace agent request enforced', {
                selectedAgentId,
                originalModel,
                model: payload.model || null,
                force_parallel_switch: payload.force_parallel_switch || payload.forceParallelSwitch || null,
                hints: hintInfo.hints,
                packet: injectionDiagnostic.packetRequest
            });
            const args = input instanceof Request
                ? [new Request(input, { ...init, method, headers, body: rewrittenBody })]
                : [input, { ...init, method, headers, body: rewrittenBody }];
            return { args, diagnostic: { ...injectionDiagnostic } };
        }

        const packetContext = {};
        const rewriteInfo = rewriteConversationPayload(payload, packetContext);
        if (!rewriteInfo) return null;

        const rewrittenBody = JSON.stringify(payload);
        const headers = mergeHeaders(input instanceof Request ? input.headers : null, init?.headers);
        if (!headers.has('content-type')) headers.set('content-type', 'application/json');

        S.cnt += 1;
        injectionDiagnostic = {
            selected: S.model,
            lastModel: S.model,
            originalModel: rewriteInfo.originalModel || '',
            thinkingEffort: rewriteInfo.thinkingEffort,
            effortRequested: rewriteInfo.effortRequested,
            effortEnabled: rewriteInfo.effortEnabled,
            effortApplied: rewriteInfo.effortApplied,
            responseModel: '',
            routeStatus: 'unknown',
            workspaceAgentId: '',
            workspaceAgentName: '',
            workspaceAgentStatus: 'unknown',
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: '',
            skipReason: '',
            packetRequest: buildConversationRequestPacket(payload, 'after-model-rewrite', packetContext),
            packetResponse: null
        };
        appendPacketLog('model-rewrite', injectionDiagnostic.packetRequest, {
            transport: 'fetch',
            originalModel: rewriteInfo.originalModel || '',
            injectedModel: S.model,
            thinkingEffort: rewriteInfo.thinkingEffort || '',
            sentinel: getSentinelFinalizeSummary()
        });
        updateBadge();
        updateDiagnostics();
        log('Conversation request patched', {
            originalModel: rewriteInfo.originalModel,
            injectedModel: rewriteInfo.injectedModel,
            thinking_effort: rewriteInfo.thinkingEffort || null,
            thinkingEffort: rewriteInfo.thinkingEffort || null,
            effortLabel: t(`effort_${rewriteInfo.effortRequested}`),
            effortRequested: rewriteInfo.effortRequested,
            effortEnabled: rewriteInfo.effortEnabled,
            effortApplied: rewriteInfo.effortApplied,
            removedThinkingEffort: rewriteInfo.removedThinkingEffort,
            count: S.cnt
        });

        const args = input instanceof Request
            ? [new Request(input, { ...init, method, headers, body: rewrittenBody })]
            : [input, { ...init, method, headers, body: rewrittenBody }];
        return { args, diagnostic: { ...injectionDiagnostic } };
    }

    function rewriteConversationXhrBody(body, url, method = 'POST') {
        if (!(S.on && S.model && isConversationEndpointUrl(url))) return null;
        if (String(method || 'GET').toUpperCase() !== 'POST') return null;
        if (typeof body !== 'string' || !body.trim()) return null;

        let payload = null;
        try {
            payload = JSON.parse(body);
        } catch {
            log('XHR conversation request left untouched', { reason: 'non-json-body', selectedModel: S.model });
            return null;
        }

        if (isWorkspaceAgentSelection(S.model)) {
            if (!isConversationTurnPayload(payload)) return null;
            const selectedAgentId = getWorkspaceAgentId();
            const originalModel = payload.model || '';
            const runtimeMarker = findWorkspaceAgentRuntimeMarker(payload);
            const hintMarker = findWorkspaceAgentMarker(payload);
            const composerAgent = getActiveComposerWorkspaceAgent();
            if (composerAgent?.id) registerWorkspaceAgent(composerAgent, 'composer');
            const requestAgentId = runtimeMarker?.id || '';
            const hintedAgentId = hintMarker?.id || '';
            const markerConflicts = selectedAgentId && requestAgentId && requestAgentId !== selectedAgentId;
            const hintConflicts = selectedAgentId && hintedAgentId && hintedAgentId !== selectedAgentId;
            const hintInfo = ensureWorkspaceAgentSystemHint(payload, selectedAgentId);
            const previousForceSwitch = payload.force_parallel_switch ?? payload.forceParallelSwitch;
            if (!payload.force_parallel_switch) payload.force_parallel_switch = 'auto';
            if ('forceParallelSwitch' in payload && !payload.forceParallelSwitch) payload.forceParallelSwitch = 'auto';
            const changed = hintInfo.changed || !previousForceSwitch || markerConflicts || hintConflicts;

            injectionDiagnostic = {
                selected: S.model,
                lastModel: payload.model || '',
                originalModel,
                thinkingEffort: '',
                effortRequested: S.effort,
                effortEnabled: S.effortOn,
                effortApplied: false,
                responseModel: '',
                routeStatus: 'unknown',
                workspaceAgentId: selectedAgentId,
                workspaceAgentName: getWorkspaceAgent(selectedAgentId)?.name || selectedAgentId,
                workspaceAgentStatus: changed ? 'forced' : 'ready',
                at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                error: '',
                skipReason: '',
                packetRequest: buildConversationRequestPacket(payload, changed ? 'xhr-after-workspace-agent-rewrite' : 'xhr-after-workspace-agent-verify'),
                packetResponse: null
            };
            appendPacketLog(changed ? 'workspace-agent-rewrite' : 'workspace-agent-verify', injectionDiagnostic.packetRequest, {
                transport: 'xhr',
                originalModel,
                selectedAgentId,
                sentinel: getSentinelFinalizeSummary()
            });
            updateDiagnostics();

            S.cnt += 1;
            updateBadge();
            log(changed ? 'Workspace agent XHR request patched' : 'Workspace agent XHR request enforced', {
                selectedAgentId,
                originalModel,
                model: payload.model || null,
                force_parallel_switch: payload.force_parallel_switch || payload.forceParallelSwitch || null,
                hints: hintInfo.hints,
                packet: injectionDiagnostic.packetRequest
            });
            return { body: JSON.stringify(payload), diagnostic: { ...injectionDiagnostic } };
        }

        const packetContext = {};
        const rewriteInfo = rewriteConversationPayload(payload, packetContext);
        if (!rewriteInfo) return null;

        S.cnt += 1;
        injectionDiagnostic = {
            selected: S.model,
            lastModel: S.model,
            originalModel: rewriteInfo.originalModel || '',
            thinkingEffort: rewriteInfo.thinkingEffort,
            effortRequested: rewriteInfo.effortRequested,
            effortEnabled: rewriteInfo.effortEnabled,
            effortApplied: rewriteInfo.effortApplied,
            responseModel: '',
            routeStatus: 'unknown',
            workspaceAgentId: '',
            workspaceAgentName: '',
            workspaceAgentStatus: 'unknown',
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: '',
            skipReason: '',
            packetRequest: buildConversationRequestPacket(payload, 'xhr-after-model-rewrite', packetContext),
            packetResponse: null
        };
        appendPacketLog('model-rewrite', injectionDiagnostic.packetRequest, {
            transport: 'xhr',
            originalModel: rewriteInfo.originalModel || '',
            injectedModel: S.model,
            thinkingEffort: rewriteInfo.thinkingEffort || '',
            sentinel: getSentinelFinalizeSummary()
        });
        updateBadge();
        updateDiagnostics();
        log('Conversation XHR request patched', {
            from: rewriteInfo.originalModel || '(empty)',
            to: S.model,
            effort: rewriteInfo.thinkingEffort || '(none)',
            packet: injectionDiagnostic.packetRequest
        });
        return { body: JSON.stringify(payload), diagnostic: { ...injectionDiagnostic } };
    }

    function sanitizeErrorText(value, limit = 360) {
        return String(value ?? '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, limit);
    }

    function parseJsonMaybe(text) {
        try { return JSON.parse(text); } catch { return null; }
    }

    const ERROR_DETAIL_KEYS = ['error', 'message', 'detail', 'details', 'reason', 'title', 'description', 'code'];

    function extractErrorFromObject(value) {
        if (!value || typeof value !== 'object') return '';
        if (Array.isArray(value)) {
            return sanitizeErrorText(value.map(item => extractErrorFromObject(item) || item).filter(Boolean).join('; '));
        }
        for (const key of ERROR_DETAIL_KEYS) {
            if (!(key in value)) continue;
            const nested = value[key];
            if (typeof nested === 'string' || typeof nested === 'number') return sanitizeErrorText(nested);
            const nestedError = extractErrorFromObject(nested);
            if (nestedError) return nestedError;
        }
        if (Array.isArray(value.errors) && value.errors.length) {
            return sanitizeErrorText(value.errors.map(item => extractErrorFromObject(item) || item).filter(Boolean).join('; '));
        }
        return '';
    }

    function extractResponseError(sample, strict = false) {
        const text = String(sample || '').trim();
        if (!text) return '';

        const parsed = parseJsonMaybe(text);
        const parsedError = extractErrorFromObject(parsed);
        if (parsedError) return parsedError;

        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (/^event:\s*error\b/i.test(line)) {
                const dataLine = lines.slice(i + 1).find(next => /^data:/i.test(next.trim()));
                const data = dataLine ? dataLine.trim().replace(/^data:\s*/i, '') : '';
                const dataError = extractErrorFromObject(parseJsonMaybe(data)) || sanitizeErrorText(data);
                return dataError || 'Stream error event';
            }
            if (/^data:/i.test(line)) {
                const data = line.replace(/^data:\s*/i, '').trim();
                if (!data || data === '[DONE]') continue;
                const dataError = extractErrorFromObject(parseJsonMaybe(data));
                if (dataError) return dataError;
                if (!strict && /\b(error|failed|failure|invalid|denied|forbidden)\b/i.test(data)) return sanitizeErrorText(data);
            }
        }

        if (!strict && /\b(error|failed|failure|invalid|denied|forbidden)\b/i.test(text)) return sanitizeErrorText(text);
        return '';
    }

    const RESPONSE_MODEL_FIELD_KEYS = new Set([
        'model',
        'model_id',
        'modelId',
        'model_slug',
        'modelSlug',
        'model_name',
        'modelName',
        'default_model_slug',
        'requested_model_id',
        'resolved_model_id',
        'resolved_model',
        'resolvedModel',
        'actual_model_id',
        'actual_model',
        'actualModel',
        'backend_model_id',
        'backend_model',
        'backendModel'
    ]);

    function collectModelFields(value, out = new Set()) {
        if (!value || typeof value !== 'object') return out;
        if (Array.isArray(value)) {
            value.forEach(item => collectModelFields(item, out));
            return out;
        }

        for (const [key, nested] of Object.entries(value)) {
            if (RESPONSE_MODEL_FIELD_KEYS.has(key) && typeof nested === 'string' && /^[a-z0-9][\w.-]{1,120}$/i.test(nested)) {
                out.add(nested);
            }
            if (nested && typeof nested === 'object') collectModelFields(nested, out);
        }
        return out;
    }

    function analyzeResponseModelSample(sample, requestedModel = '', includePacketFields = false) {
        const text = String(sample || '').trim();
        if (!text) return { model: '', fields: [] };

        const responseCandidates = collectModelFields(parseJsonMaybe(text));
        const packetCandidates = includePacketFields ? new Set(responseCandidates) : null;
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (/^data:/i.test(trimmed)) {
                const data = trimmed.replace(/^data:\s*/i, '').trim();
                if (!data || data === '[DONE]') continue;
                const frameCandidates = collectModelFields(parseJsonMaybe(data));
                frameCandidates.forEach(value => {
                    responseCandidates.add(value);
                    packetCandidates?.add(value);
                });
            } else if (packetCandidates && /^[{[]/.test(trimmed)) {
                collectModelFields(parseJsonMaybe(trimmed), packetCandidates);
            }
        }

        const values = [...responseCandidates].filter(Boolean);
        return {
            model: values.find(value => requestedModel && value !== requestedModel) || values[0] || '',
            fields: packetCandidates ? [...packetCandidates].slice(0, 32) : []
        };
    }

    function extractResponseModel(sample, requestedModel = '') {
        return analyzeResponseModelSample(sample, requestedModel).model;
    }

    function collectResponseJsonFrames(sample) {
        const text = String(sample || '').trim();
        if (!text) return [];

        const frames = [];
        const seen = new Set();
        const push = raw => {
            const chunk = String(raw || '').trim();
            if (!chunk || chunk === '[DONE]' || seen.has(chunk)) return;
            seen.add(chunk);
            const parsed = parseJsonMaybe(chunk);
            if (parsed) frames.push(parsed);
        };

        push(text);
        text.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/^data:/i.test(trimmed)) push(trimmed.replace(/^data:\s*/i, ''));
            else if (/^[{\[]/.test(trimmed)) push(trimmed);
        });
        return frames;
    }

    function extractWorkspaceAgentFromResponseSample(sample) {
        const frames = collectResponseJsonFrames(sample);
        let hintMarker = null;
        for (const frame of frames) {
            const runtimeMarker = findWorkspaceAgentRuntimeMarker(frame);
            if (runtimeMarker) return { marker: runtimeMarker, status: 'confirmed' };

            const authorMarker = findWorkspaceAgentAuthorMarker(frame);
            if (authorMarker) return { marker: authorMarker, status: 'confirmed' };

            hintMarker = hintMarker || findWorkspaceAgentMarker(frame);
        }

        if (hintMarker) return { marker: hintMarker, status: 'hinted' };
        return null;
    }

    function observeWorkspaceAgentStreamSample(sample, diagnostic = {}) {
        const evidence = extractWorkspaceAgentFromResponseSample(sample);
        if (!evidence?.marker) return;
        const conversationId = getCurrentConversationId();
        registerWorkspaceAgent({
            id: evidence.marker.id,
            name: evidence.marker.name,
            conversations: conversationId ? [conversationId] : [],
            lastConversationId: conversationId
        }, evidence.marker.source || 'stream');
        injectionDiagnostic = {
            ...injectionDiagnostic,
            packetResponse: {
                ...(injectionDiagnostic.packetResponse || {}),
                kind: 'agent',
                agentId: evidence.marker.id,
                agentName: evidence.marker.name,
                status: evidence.status,
                source: evidence.marker.source || 'stream',
                responseModel: diagnostic.responseModel || injectionDiagnostic.responseModel || '',
                at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
        };
        appendPacketLog('workspace-agent-response', injectionDiagnostic.packetRequest || null, {
            response: injectionDiagnostic.packetResponse
        });
        updateWorkspaceAgentDiagnostic(evidence.marker, evidence.status, {
            routeStatus: evidence.status === 'confirmed' ? 'same' : (diagnostic.routeStatus || injectionDiagnostic.routeStatus),
            responseModel: diagnostic.responseModel || injectionDiagnostic.responseModel
        });
        log('Workspace agent stream observed', {
            id: evidence.marker.id,
            name: evidence.marker.name,
            status: evidence.status,
            source: evidence.marker.source || 'stream'
        });
    }

    async function bodyToText(body) {
        if (body == null) return '';
        if (typeof body === 'string') return body;
        if (body instanceof URLSearchParams) return body.toString();
        if (body instanceof Blob) return await body.text();
        if (body instanceof FormData) return new URLSearchParams(body).toString();
        if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
        if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body);
        try { return JSON.stringify(body); } catch { return String(body); }
    }

    function collectCesStats(value, out = []) {
        if (!value || typeof value !== 'object') return out;
        if (Array.isArray(value)) {
            value.forEach(item => collectCesStats(item, out));
            return out;
        }

        const props = value.properties && typeof value.properties === 'object' ? value.properties : value;
        if (props.model_id || props.model || props.model_slug || props.callsite_id || props.prepare_state) {
            out.push({
                modelId: props.model_id || props.model || props.model_slug || '',
                callsiteId: props.callsite_id || '',
                prepareState: props.prepare_state || '',
                hasConduitToken: props.has_conduit_token || '',
                missingConduitTokenState: props.missing_conduit_token_state || '',
                preparedStateReuseState: props.prepared_state_reuse_state || '',
                postCompletionPrepareOpportunity: props.post_completion_prepare_opportunity || ''
            });
        }

        Object.values(value).forEach(nested => {
            if (nested && typeof nested === 'object' && nested !== value.properties) collectCesStats(nested, out);
        });
        return out;
    }

    function applyCesStatsPayload(rawText, source = 'fetch') {
        const text = String(rawText || '').trim();
        if (!text) return;
        const parsed = parseJsonMaybe(text);
        if (!parsed) return;

        const stats = collectCesStats(parsed)
            .filter(item => item.modelId || item.callsiteId || item.prepareState);
        if (!stats.length) return;

        const preferred = stats.find(item => item.modelId && /request_completion|completion/i.test(item.callsiteId || ''))
            || stats.find(item => item.modelId)
            || stats[0];
        if (preferred?.modelId) updateRewriteRoute({ ...injectionDiagnostic }, preferred.modelId);
        log('CES stats captured', {
            source,
            model_id: preferred?.modelId || null,
            callsite_id: preferred?.callsiteId || null,
            prepare_state: preferred?.prepareState || null,
            has_conduit_token: preferred?.hasConduitToken || null,
            missing_conduit_token_state: preferred?.missingConduitTokenState || null,
            prepared_state_reuse_state: preferred?.preparedStateReuseState || null,
            post_completion_prepare_opportunity: preferred?.postCompletionPrepareOpportunity || null
        });
    }

    async function captureCesStatsRequest(input, init, url, source = 'fetch') {
        if (!isExactEndpointUrl(url, CES_STATS_ENDPOINT)) return;
        let bodyText = await bodyToText(init?.body);
        if (!bodyText && input instanceof Request) {
            try { bodyText = await input.clone().text(); } catch (error) { log('Failed to read CES request body', error); }
        }
        applyCesStatsPayload(bodyText, source);
    }

    async function readResponseSample(response, limit = 2400) {
        const clone = response.clone();
        if (!clone.body?.getReader) return (await clone.text()).slice(0, limit);

        const reader = clone.body.getReader();
        const decoder = new TextDecoder();
        let sample = '';
        try {
            while (sample.length < limit) {
                const { value, done } = await reader.read();
                if (done) break;
                sample += decoder.decode(value, { stream: true });
                if (sample.length >= limit) {
                    try { await reader.cancel(); } catch {}
                    break;
                }
            }
            sample += decoder.decode();
        } finally {
            try { reader.releaseLock(); } catch {}
        }
        return sample.slice(0, limit);
    }

    function normalizeComparableModel(value) {
        return String(value || '').trim().toLowerCase();
    }

    function hasModelMismatch() {
        if (!injectionDiagnostic.at || isWorkspaceAgentSelection(injectionDiagnostic.selected || S.model)) return false;
        const requested = normalizeComparableModel(injectionDiagnostic.lastModel || injectionDiagnostic.selected || S.model);
        const response = normalizeComparableModel(injectionDiagnostic.responseModel);
        return Boolean(requested && response && requested !== response);
    }

    function updateResponsePacket(diagnostic, responseModel, source, sample = '', status = 0, modelFields = null) {
        if (diagnostic?.at && injectionDiagnostic.at && diagnostic.at !== injectionDiagnostic.at) return;
        const requestedModel = diagnostic?.lastModel || injectionDiagnostic.lastModel || S.model || '';
        const response = responseModel || '';
        const mismatch = Boolean(requestedModel && response && normalizeComparableModel(requestedModel) !== normalizeComparableModel(response));
        injectionDiagnostic = {
            ...injectionDiagnostic,
            ...(diagnostic || {}),
            packetResponse: {
                ...(injectionDiagnostic.packetResponse || {}),
                kind: 'model',
                requestedModel,
                responseModel: response,
                modelFields: modelFields || analyzeResponseModelSample(sample, '', true).fields,
                source: source || 'response',
                status: Number(status || 0),
                mismatch,
                at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
        };
        updateDiagnostics();
    }

    function updateRewriteFailure(diagnostic, errorText) {
        if (diagnostic?.at && injectionDiagnostic.at && diagnostic.at !== injectionDiagnostic.at) return;
        injectionDiagnostic = {
            ...injectionDiagnostic,
            ...(diagnostic || {}),
            responseModel: injectionDiagnostic.responseModel || diagnostic?.responseModel || '',
            routeStatus: injectionDiagnostic.routeStatus || diagnostic?.routeStatus || 'unknown',
            packetResponse: injectionDiagnostic.packetResponse || diagnostic?.packetResponse || null,
            pow: lastPowDetection || diagnostic?.pow || null,
            error: errorText || ''
        };
        updateDiagnostics();
    }

    function updateRewriteRoute(diagnostic, responseModel) {
        if (diagnostic?.at && injectionDiagnostic.at && diagnostic.at !== injectionDiagnostic.at) return;
        const requested = diagnostic?.lastModel || injectionDiagnostic.lastModel || S.model || '';
        const exposed = responseModel || '';
        injectionDiagnostic = {
            ...injectionDiagnostic,
            ...(diagnostic || {}),
            responseModel: exposed,
            routeStatus: exposed ? (requested && normalizeComparableModel(exposed) !== normalizeComparableModel(requested) ? 'routed' : 'same') : 'hidden',
            packetResponse: injectionDiagnostic.packetResponse || diagnostic?.packetResponse || null,
            pow: lastPowDetection || diagnostic?.pow || null,
            error: injectionDiagnostic.error || ''
        };
        updateDiagnostics();
        updateBadge();
        log('Rewrite route observed', {
            requestedModel: requested || null,
            responseModel: exposed || null,
            routeStatus: injectionDiagnostic.routeStatus,
            mismatch: hasModelMismatch()
        });
    }

    function formatHttpFailure(response, sample) {
        const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
        const reason = extractResponseError(sample, false);
        return reason ? `${status}: ${reason}` : status;
    }

    async function observeRewriteResponse(response, diagnostic) {
        if (!response) return;
        const contentType = response.headers?.get?.('content-type') || '';
        if (!response.ok) {
            let sample = '';
            try {
                sample = await readResponseSample(response, 2400);
            } catch (error) {
                log('Failed to read failed rewrite response', error);
            }
            const responseAnalysis = analyzeResponseModelSample(sample, diagnostic?.lastModel || '', true);
            const responseModel = responseAnalysis.model;
            updateResponsePacket(diagnostic, responseModel, 'fetch-error', sample, response.status, responseAnalysis.fields);
            updateRewriteRoute(diagnostic, responseModel);
            const failure = formatHttpFailure(response, sample);
            updateRewriteFailure(diagnostic, failure);
            log('Rewrite response failed', { status: response.status, statusText: response.statusText, failure });
            return;
        }

        updateRewriteFailure(diagnostic, '');
        if (STREAM_CONTENT_TYPE_RE.test(contentType)) {
            readResponseSample(response, 12000).then(sample => {
                const responseAnalysis = analyzeResponseModelSample(sample, diagnostic?.lastModel || '', true);
                const responseModel = responseAnalysis.model;
                updateResponsePacket(diagnostic, responseModel, 'fetch-stream', sample, response.status, responseAnalysis.fields);
                updateRewriteRoute(diagnostic, responseModel);
                observeWorkspaceAgentStreamSample(sample, { ...diagnostic, responseModel });
                const streamFailure = extractResponseError(sample, true);
                if (streamFailure) updateRewriteFailure(diagnostic, streamFailure);
            }).catch(error => log('Stream response observer failed', error));
        } else if (/json/i.test(contentType)) {
            readResponseSample(response, 4000).then(sample => {
                const responseAnalysis = analyzeResponseModelSample(sample, diagnostic?.lastModel || '', true);
                const responseModel = responseAnalysis.model;
                updateResponsePacket(diagnostic, responseModel, 'fetch-json', sample, response.status, responseAnalysis.fields);
                updateRewriteRoute(diagnostic, responseModel);
                observeWorkspaceAgentStreamSample(sample, { ...diagnostic, responseModel });
            }).catch(error => log('JSON response observer failed', error));
        } else {
            updateResponsePacket(diagnostic, '', 'fetch-opaque', '', response.status);
            updateRewriteRoute(diagnostic, '');
        }
    }

    function observeConversationStreamResponse(url, response) {
        if (!isConversationEndpointUrl(url) || !response?.ok) return;
        const contentType = response.headers?.get?.('content-type') || '';
        if (!RESPONSE_CAPTURE_CONTENT_TYPE_RE.test(contentType)) return;
        readResponseSample(response, 12000).then(sample => {
            observeWorkspaceAgentStreamSample(sample, { responseModel: extractResponseModel(sample, injectionDiagnostic.lastModel || S.model || '') });
        }).catch(error => log('Conversation stream observer failed', error));
    }

    function captureModelsRequest(input, init, url) {
        const parsedUrl = getSameOriginUrl(url);
        if (parsedUrl?.pathname !== MODELS_ENDPOINT) return;
        const method = (init?.method || input?.method || 'GET').toUpperCase();
        if (method !== 'GET') return;

        const headers = pickHeaders(
            mergeHeaders(input instanceof Request ? input.headers : null, init?.headers),
            MODELS_REQUEST_HEADER_ALLOWLIST
        );

        if (!headers.has('accept')) headers.set('accept', 'application/json');
        if (!headers.has('x-openai-target-path')) headers.set('x-openai-target-path', MODELS_ENDPOINT);
        if (!headers.has('x-openai-target-route')) headers.set('x-openai-target-route', MODELS_ENDPOINT);
        if (!headers.has('oai-language')) headers.set('oai-language', S.lang || document.documentElement.lang || navigator.language || 'en-US');

        const requestUrl = new URL(MODELS_ENDPOINT, location.origin);
        for (const key of ['iim', 'is_gizmo']) {
            if (parsedUrl.searchParams.has(key)) requestUrl.searchParams.set(key, parsedUrl.searchParams.get(key));
        }
        modelsRequestSnapshot = {
            url: getRelativeUrl(requestUrl.href),
            headers: [...headers.entries()]
        };
    }

    function buildModelsRequestConfig() {
        const isGizmo = /^\/g\//.test(location.pathname);
        const baseUrl = modelsRequestSnapshot?.url || `${MODELS_ENDPOINT}?iim=false&is_gizmo=${isGizmo}`;
        const requestUrl = new URL(baseUrl, location.origin);
        if (!requestUrl.searchParams.has('iim')) requestUrl.searchParams.set('iim', 'false');
        if (!requestUrl.searchParams.has('is_gizmo')) requestUrl.searchParams.set('is_gizmo', String(isGizmo));

        const headers = new Headers();
        if (modelsRequestSnapshot?.headers) {
            new Headers(modelsRequestSnapshot.headers).forEach((value, key) => headers.set(key, value));
        }
        if (!headers.has('accept')) headers.set('accept', 'application/json');
        if (!headers.has('x-openai-target-path')) headers.set('x-openai-target-path', MODELS_ENDPOINT);
        if (!headers.has('x-openai-target-route')) headers.set('x-openai-target-route', MODELS_ENDPOINT);
        if (!headers.has('oai-language')) headers.set('oai-language', S.lang || document.documentElement.lang || navigator.language || 'en-US');

        return { url: getRelativeUrl(requestUrl.href), headers };
    }

    async function fetchModels() {
        const button = q('mi-ref-btn');
        if (!nativeFetch || !button || !isSupportedHost()) return;

        scanWorkspaceAgentsFromPage();
        setModelSyncStatus('syncing');
        try {
            const request = buildModelsRequestConfig();
            const response = await nativeFetch(request.url, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: request.headers
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (ingestApiModels(data)) {
                scanWorkspaceAgentsFromPage();
                setModelSyncStatus('updated');
                window.setTimeout(() => setModelSyncStatus('idle'), 1400);
            } else {
                setModelSyncStatus('failed', 'No model payload');
                window.setTimeout(() => setModelSyncStatus('idle'), 1800);
            }
        } catch (error) {
            setModelSyncStatus('failed', error?.message || String(error));
            window.setTimeout(() => setModelSyncStatus('idle'), 2200);
            log('Model sync failed', error);
        }
    }

    function installFetchHook() {
        if (hookInstalled || !nativeFetch) return;
        hookInstalled = true;

        wrappedFetch = async function (input, init) {
            let url = '';
            let rewritten = null;
            let requestArgs = [input, init];
            let isModelsRequest = false;
            let isSentinelRequest = false;

            try {
                url = getFetchUrl(input);
                captureCesStatsRequest(input, init, url, 'fetch').catch(error => log('CES fetch capture failed', error));
                captureConversationRequestPacket(input, init, url, 'before-rewrite').catch(error => log('Conversation request capture failed', error));

                isModelsRequest = isExactEndpointUrl(url, MODELS_ENDPOINT);
                isSentinelRequest = Boolean(getSentinelRequirementsPhase(url));
                if (isModelsRequest) {
                    captureModelsRequest(input, init, url);
                } else if (!isSentinelRequest) {
                    rewritten = await rewriteConversationRequest(input, init, url);
                    if (rewritten && !rewritten.blocked) requestArgs = rewritten.args;
                }
            } catch (error) {
                injectionDiagnostic.error = error?.message || String(error);
                updateDiagnostics();
                log('Fetch preprocessing failed; request left untouched', error);
                rewritten = null;
                requestArgs = [input, init];
            }

            let response;
            try {
                response = await nativeFetch(...requestArgs);
            } catch (error) {
                const isAbortError = error?.name === 'AbortError' || /abort/i.test(String(error?.message || ''));
                if (!isAbortError) {
                    injectionDiagnostic.error = error?.message || String(error);
                    updateDiagnostics();
                }
                log('Fetch request failed', error);
                throw error;
            }

            try {
                if (isModelsRequest) {
                    if (response.status === 401 || response.status === 403) modelsRequestSnapshot = null;
                    response.clone().json().then(data => ingestApiModels(data, { fromHook: true })).catch(() => {});
                }
                if (isSentinelRequest) {
                    captureSentinelRequirements(input, init, url, response).catch(error => log('Sentinel requirements capture failed', error));
                }
                observeWorkspaceAgentResponse(url, response);
                if (rewritten && !rewritten.blocked) {
                    observeRewriteResponse(response, rewritten.diagnostic).catch(error => {
                        const isAbortError = error?.name === 'AbortError' || /abort/i.test(String(error?.message || ''));
                        if (!isAbortError) updateRewriteFailure(rewritten.diagnostic, error?.message || String(error));
                        log('Rewrite response observer failed', error);
                    });
                } else {
                    observeConversationStreamResponse(url, response);
                }
            } catch (error) {
                log('Fetch response observer failed', error);
            }
            return response;
        };
        window.fetch = wrappedFetch;

        if (nativeSendBeacon) {
            wrappedSendBeacon = function (url, data) {
                captureCesStatsRequest(null, { body: data }, url, 'sendBeacon').catch(error => log('CES beacon capture failed', error));
                return nativeSendBeacon(url, data);
            };
            navigator.sendBeacon = wrappedSendBeacon;
        }

        if (nativeXHROpen && nativeXHRSend && window.XMLHttpRequest?.prototype) {
            wrappedXHROpen = function (method, url) {
                this.__miRequestMethod = method;
                this.__miRequestUrl = url;
                return nativeXHROpen.apply(this, arguments);
            };
            wrappedXHRSend = function (body) {
                let sendBody = body;
                let rewritten = null;
                const isSentinelRequest = Boolean(getSentinelRequirementsPhase(this.__miRequestUrl));
                if (isSentinelRequest) {
                    this.addEventListener('loadend', () => {
                        try {
                            const status = Number(this.status || 0);
                            const responseText = typeof this.responseText === 'string' ? this.responseText : '';
                            const responseHeaders = new Headers();
                            const contentType = this.getResponseHeader?.('content-type');
                            if (contentType) responseHeaders.set('content-type', contentType);
                            const responseStatus = status >= 200 && status <= 599 ? status : 200;
                            const syntheticResponse = new Response(responseText, {
                                status: responseStatus,
                                headers: responseHeaders
                            });
                            captureSentinelRequirements(null, { body: sendBody }, this.__miRequestUrl, syntheticResponse).catch(error => log('Sentinel XHR capture failed', error));
                        } catch (error) {
                            log('Sentinel XHR response observer failed', error);
                        }
                    }, { once: true });
                }
                try {
                    rewritten = rewriteConversationXhrBody(body, this.__miRequestUrl, this.__miRequestMethod);
                    if (rewritten?.body) sendBody = rewritten.body;
                } catch (error) {
                    injectionDiagnostic.error = error?.message || String(error);
                    updateDiagnostics();
                    log('XHR rewrite failed', error);
                }
                captureCesStatsRequest(null, { body: sendBody }, this.__miRequestUrl, 'xhr').catch(error => log('CES XHR capture failed', error));
                if (rewritten?.diagnostic) {
                    this.addEventListener('loadend', () => {
                        try {
                            const status = Number(this.status || 0);
                            const statusText = this.statusText || '';
                            const sample = typeof this.responseText === 'string' ? this.responseText.slice(0, 5000) : '';
                            if (status && (status < 200 || status >= 300)) {
                                updateRewriteFailure(rewritten.diagnostic, extractResponseError(sample) || `HTTP ${status} ${statusText}`.trim());
                            } else {
                                updateRewriteFailure(rewritten.diagnostic, '');
                            }
                            const responseAnalysis = analyzeResponseModelSample(sample, rewritten.diagnostic?.lastModel || '', true);
                            const responseModel = responseAnalysis.model;
                            updateResponsePacket(rewritten.diagnostic, responseModel, 'xhr', sample, status, responseAnalysis.fields);
                            updateRewriteRoute(rewritten.diagnostic, responseModel);
                            observeWorkspaceAgentStreamSample(sample, { ...rewritten.diagnostic, responseModel });
                            appendPacketLog('xhr-response', rewritten.diagnostic.packetRequest || null, {
                                status,
                                statusText,
                                responseModel: responseModel || '',
                                hasAgentEvidence: Boolean(injectionDiagnostic.packetResponse)
                            });
                        } catch (error) {
                            log('XHR response observer failed', error);
                        }
                    }, { once: true });
                }
                return nativeXHRSend.call(this, sendBody);
            };
            XMLHttpRequest.prototype.open = wrappedXHROpen;
            XMLHttpRequest.prototype.send = wrappedXHRSend;
        }

        if (fetchHookKeepalive) window.clearInterval(fetchHookKeepalive);
        fetchHookKeepalive = window.setInterval(() => {
            if (document.hidden) return;
            try {
                if (wrappedFetch && window.fetch !== wrappedFetch) {
                    window.fetch = wrappedFetch;
                    log('Fetch hook reinstalled');
                }
                if (wrappedSendBeacon && navigator.sendBeacon !== wrappedSendBeacon) {
                    navigator.sendBeacon = wrappedSendBeacon;
                    log('Beacon hook reinstalled');
                }
                if (wrappedXHROpen && window.XMLHttpRequest?.prototype?.open !== wrappedXHROpen) {
                    window.XMLHttpRequest.prototype.open = wrappedXHROpen;
                    log('XHR open hook reinstalled');
                }
                if (wrappedXHRSend && window.XMLHttpRequest?.prototype?.send !== wrappedXHRSend) {
                    window.XMLHttpRequest.prototype.send = wrappedXHRSend;
                    log('XHR send hook reinstalled');
                }
            } catch (error) {
                log('Fetch hook keepalive failed', error);
            }
        }, 3000);
    }

    function applyTheme() {
        if (!host) return;
        host.style.setProperty('--mi-bg', S.bgColor);
        host.style.setProperty('--mi-bg-rgb', hexToRgb(S.bgColor));
        host.style.setProperty('--mi-on-accent', getReadableAccentText(S.bgColor));
    }

    function updateBackdrop() {
        const panel = q('mi-p');
        const open = Boolean(panel?.classList.contains('show') && !panel.classList.contains('is-closing'));
        const backdrop = q('mi-backdrop');
        if (!backdrop) return;
        backdrop.classList.toggle('show', Boolean(open));
    }

    function getElasticMotionProgress(value) {
        const t = clamp(Number(value) || 0, 0, 1);
        const damping = 8.2;
        const frequency = 11.4;
        const response = x => 1 - Math.exp(-damping * x) * (Math.cos(frequency * x) + (damping / frequency) * Math.sin(frequency * x));
        const end = response(1) || 1;
        return response(t) / end;
    }

    function buildDropdownClothFrames(opening, placement) {
        const frames = [];
        const count = DROPDOWN_MOTION_SAMPLE_COUNT;
        const direction = placement === 'above' ? 1 : -1;
        for (let index = 0; index < count; index += 1) {
            const offset = index / (count - 1);
            const motionOffset = offset;
            const easeOut = 1 - Math.pow(1 - motionOffset, 3);
            const progress = easeOut + (Math.sin(Math.PI * motionOffset) * 0.032);
            const reveal = clamp(progress, 0, 1);
            const overshoot = Math.max(0, progress - 1);
            const translateY = direction * (1 - reveal) * 7;
            const scaleY = 0.92 + (reveal * 0.08) + (overshoot * 0.12);
            const scaleX = 0.985 + (reveal * 0.015) - (overshoot * 0.022);
            frames.push({
                offset,
                opacity: String(clamp(reveal * 1.35, 0, 1)),
                transform: `translate3d(0, ${translateY.toFixed(3)}px, 0) scaleX(${scaleX.toFixed(5)}) scaleY(${scaleY.toFixed(5)})`
            });
        }
        if (opening) return frames;
        return frames.slice().reverse().map((frame, index) => ({ ...frame, offset: index / (count - 1) }));
    }

    function finishDropdownMotion(opening, generation) {
        if (generation !== dropdownMotionGeneration) return;
        const drop = q('mi-drop');
        dropdownMotionAnimation = null;
        dropdownMotionOpening = null;
        if (!drop) return;
        drop.classList.remove('is-cloth-motion');
        if (opening) {
            drop.classList.add('show');
            drop.classList.remove('is-closing');
        } else {
            drop.classList.remove('show', 'is-closing');
            drop.setAttribute('aria-hidden', 'true');
            if (modelMenuOfflineExpanded) {
                modelMenuOfflineExpanded = false;
                dropdownRenderSignature = '';
                requestAnimationFrame(() => renderDropdown({ force: true }));
            }
        }
        drop.getAnimations?.().forEach(animation => animation.cancel());
    }

    function playDropdownMotion(opening) {
        const drop = q('mi-drop');
        if (!drop) return;
        if (dropdownMotionAnimation && dropdownMotionOpening === opening) return;
        const generation = ++dropdownMotionGeneration;
        if (prefersReducedMotion() || typeof drop.animate !== 'function') {
            finishDropdownMotion(opening, generation);
            return;
        }
        drop.classList.add('is-cloth-motion');

        if (dropdownMotionAnimation && dropdownMotionOpening !== opening) {
            dropdownMotionOpening = opening;
            drop.classList.toggle('is-closing', !opening);
            dropdownMotionAnimation.reverse();
            dropdownMotionAnimation.onfinish = () => finishDropdownMotion(opening, generation);
            return;
        }
        const placement = drop.dataset.placement || 'below';
        drop.classList.toggle('is-closing', !opening);
        dropdownMotionOpening = opening;
        dropdownMotionAnimation = drop.animate(buildDropdownClothFrames(opening, placement), {
            duration: opening ? DROPDOWN_MOTION_DURATION : Math.round(DROPDOWN_MOTION_DURATION * 0.8),
            easing: 'linear',
            fill: 'both'
        });
        dropdownMotionAnimation.onfinish = () => finishDropdownMotion(opening, generation);
    }

    function scheduleDropdownWarmRender() {
        if (dropdownWarmJob || !host) return;
        const run = () => {
            dropdownWarmJob = 0;
            const drop = q('mi-drop');
            if (drop && !drop.classList.contains('show')) renderDropdown({ force: true });
        };
        if (typeof window.requestIdleCallback === 'function') {
            dropdownWarmJob = window.requestIdleCallback(run, { timeout: 360 });
        } else {
            dropdownWarmJob = window.setTimeout(run, 80);
        }
    }

    function closeDropdown(animate = true) {
        const wrap = q('mi-sel-wrap');
        const drop = q('mi-drop');
        q('mi-sel-btn')?.setAttribute('aria-expanded', 'false');
        if (dropdownOpenFrame) {
            cancelAnimationFrame(dropdownOpenFrame);
            dropdownOpenFrame = 0;
        }
        if (!wrap || !drop || !drop.classList.contains('show')) return;
        wrap.classList.remove('open');
        drop.setAttribute('aria-hidden', 'true');
        if (!animate || prefersReducedMotion()) {
            dropdownMotionGeneration += 1;
            dropdownMotionAnimation?.cancel();
            dropdownMotionAnimation = null;
            dropdownMotionOpening = null;
            drop.classList.remove('show', 'is-closing', 'is-cloth-motion');
            drop.getAnimations?.().forEach(animation => animation.cancel());
            if (modelMenuOfflineExpanded) {
                modelMenuOfflineExpanded = false;
                dropdownRenderSignature = '';
                requestAnimationFrame(() => renderDropdown({ force: true }));
            }
            return;
        }
        playDropdownMotion(false);
    }

    function focusMenuSearch() {
        const search = host?.querySelector('#mi-menu-search');
        if (!search) return;
        search.focus();
        const pos = search.value.length;
        search.setSelectionRange(pos, pos);
    }

    function positionDropdown() {
        const panel = q('mi-p');
        const button = q('mi-sel-btn');
        const drop = q('mi-drop');
        if (!panel || !button || !drop) return;
        const panelRect = panel.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const gap = 8;
        const edge = 10;
        const desiredHeight = Math.min(520, Math.floor(window.innerHeight * 0.58));
        const spaceBelow = Math.max(0, panelRect.bottom - buttonRect.bottom - gap - edge);
        const spaceAbove = Math.max(0, buttonRect.top - panelRect.top - gap - edge);
        const overlay = Math.max(spaceAbove, spaceBelow) < 96;
        if (overlay) {
            const overlayHeight = Math.max(0, panelRect.height - (edge * 2));
            drop.style.left = `${edge}px`;
            drop.style.width = `${Math.max(0, Math.round(panelRect.width - (edge * 2)))}px`;
            drop.style.right = 'auto';
            drop.style.top = `${edge}px`;
            drop.style.bottom = 'auto';
            drop.style.maxHeight = `${Math.round(overlayHeight)}px`;
            drop.dataset.compact = 'true';
            drop.dataset.placement = 'overlay';
            drop.style.transformOrigin = 'center center';
            return;
        }
        const placeAbove = spaceAbove > spaceBelow;
        const maxHeight = Math.min(desiredHeight, Math.max(96, placeAbove ? spaceAbove : spaceBelow));
        drop.style.left = `${Math.round(buttonRect.left - panelRect.left)}px`;
        drop.style.width = `${Math.round(buttonRect.width)}px`;
        drop.style.right = 'auto';
        drop.style.maxHeight = `${Math.round(maxHeight)}px`;
        drop.dataset.compact = maxHeight < 190 ? 'true' : 'false';
        drop.dataset.placement = placeAbove ? 'above' : 'below';
        drop.style.transformOrigin = placeAbove ? 'bottom center' : 'top center';
        if (placeAbove) {
            drop.style.top = 'auto';
            drop.style.bottom = `${Math.round(panelRect.bottom - buttonRect.top + gap)}px`;
        } else {
            drop.style.top = `${Math.round(buttonRect.bottom - panelRect.top + gap)}px`;
            drop.style.bottom = 'auto';
        }
    }

    function openDropdown(focusSearch = false) {
        renderDropdown({ force: true });
        const wrap = q('mi-sel-wrap');
        const drop = q('mi-drop');
        if (!wrap || !drop) return;
        wrap.classList.add('open');
        positionDropdown();
        drop.classList.add('show');
        drop.classList.remove('is-closing');
        drop.setAttribute('aria-hidden', 'false');
        q('mi-sel-btn')?.setAttribute('aria-expanded', 'true');
        playDropdownMotion(true);
        if (focusSearch) {
            if (dropdownOpenFrame) cancelAnimationFrame(dropdownOpenFrame);
            dropdownOpenFrame = requestAnimationFrame(() => {
                dropdownOpenFrame = 0;
                focusMenuSearch();
            });
        }
        scheduleWorkspaceAgentScan(DROPDOWN_MOTION_DURATION + 120);
        if (isSupportedHost() && S.api.length && !liveApiModelIds.size && !liveCatalogSyncAttempted) {
            liveCatalogSyncAttempted = true;
            fetchModels();
        }
    }

    function positionLanguageMenu() {
        const panel = q('mi-p');
        const trigger = q('mi-lang-trigger');
        const menu = q('mi-lang-menu');
        if (!panel || !trigger || !menu) return;

        const panelRect = panel.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        const gap = 8;
        const edge = 10;
        const naturalHeight = Math.max(112, menu.scrollHeight || 0);
        const availablePanelHeight = Math.max(0, panelRect.height - (edge * 2));
        const availablePanelWidth = Math.max(0, panelRect.width - (edge * 2));
        const menuWidth = Math.min(availablePanelWidth, Math.max(148, Math.round(triggerRect.width)));
        const left = clamp(
            triggerRect.left - panelRect.left,
            edge,
            Math.max(edge, panelRect.width - menuWidth - edge),
        );
        const spaceBelow = Math.max(0, panelRect.bottom - triggerRect.bottom - gap - edge);
        const spaceAbove = Math.max(0, triggerRect.top - panelRect.top - gap - edge);
        const overlay = Math.max(spaceAbove, spaceBelow) < Math.min(naturalHeight, 112);

        menu.style.left = `${Math.round(left)}px`;
        menu.style.right = 'auto';
        menu.style.width = `${Math.round(menuWidth)}px`;
        if (overlay) {
            menu.style.top = `${edge}px`;
            menu.style.bottom = 'auto';
            menu.style.maxHeight = `${Math.round(availablePanelHeight)}px`;
            menu.dataset.compact = 'true';
            menu.dataset.placement = 'overlay';
            menu.style.transformOrigin = 'center center';
            return;
        }

        const placeAbove = spaceAbove >= naturalHeight
            || (spaceBelow < naturalHeight && spaceAbove > spaceBelow);
        const maxHeight = Math.min(naturalHeight, placeAbove ? spaceAbove : spaceBelow);
        menu.style.maxHeight = `${Math.round(maxHeight)}px`;
        menu.dataset.compact = maxHeight < naturalHeight ? 'true' : 'false';
        menu.dataset.placement = placeAbove ? 'above' : 'below';
        menu.style.transformOrigin = placeAbove ? 'bottom right' : 'top right';
        if (placeAbove) {
            menu.style.top = 'auto';
            menu.style.bottom = `${Math.round(panelRect.bottom - triggerRect.top + gap)}px`;
        } else {
            menu.style.top = `${Math.round(triggerRect.bottom - panelRect.top + gap)}px`;
            menu.style.bottom = 'auto';
        }
    }

    function openWorkspaceAgentQuickMenu() {
        modelMenuQuery = '/';
        modelMenuAgentOnly = true;
        openDropdown(true);
    }

    function setHostPosition(x, y, persist = true) {
        if (!host) return;
        const maxX = window.innerWidth - BUTTON_SIZE - VIEW_MARGIN;
        const maxY = window.innerHeight - BUTTON_SIZE - VIEW_MARGIN;
        const nextX = clamp(Math.round(x), VIEW_MARGIN, maxX);
        const nextY = clamp(Math.round(y), VIEW_MARGIN, maxY);

        host.style.left = `${nextX}px`;
        host.style.top = `${nextY}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';

        if (persist) {
            S.pos = { x: nextX, y: nextY };
            save('pos', S.pos);
        }
    }

    function ensureHostPosition(persist = false) {
        if (!host) return;
        const x = parseInt(host.style.left || '', 10);
        const y = parseInt(host.style.top || '', 10);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            const maxX = window.innerWidth - BUTTON_SIZE - VIEW_MARGIN;
            const maxY = window.innerHeight - BUTTON_SIZE - VIEW_MARGIN;
            const nextX = clamp(Math.round(x), VIEW_MARGIN, maxX);
            const nextY = clamp(Math.round(y), VIEW_MARGIN, maxY);
            if (persist || nextX !== x || nextY !== y) setHostPosition(nextX, nextY, persist);
            return;
        }

        const rect = host.getBoundingClientRect();
        const fallbackX = Number.isFinite(rect.left) && rect.width ? rect.left : window.innerWidth - BUTTON_SIZE - 24;
        const fallbackY = Number.isFinite(rect.top) && rect.height ? rect.top : window.innerHeight - BUTTON_SIZE - 24;
        setHostPosition(fallbackX, fallbackY, persist);
    }

    function positionFloatingPanel(panel) {
        if (!panel || !host) return;
        ensureHostPosition(false);

        const button = q('mi-b');
        const hostRect = host.getBoundingClientRect();
        const anchorRect = button?.getBoundingClientRect() || hostRect;
        const gap = 16;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelWidth = Math.max(0, Math.min(368, viewportWidth - (VIEW_MARGIN * 2)));
        const desiredHeight = panel.dataset.view === 'settings' ? PANEL_SETTINGS_HEIGHT : PANEL_MAIN_HEIGHT;
        const spaceAbove = Math.max(0, anchorRect.top - VIEW_MARGIN - gap);
        const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - VIEW_MARGIN - gap);
        const detached = Math.max(spaceAbove, spaceBelow) < PANEL_MIN_SIDE_HEIGHT;
        const placeAbove = !detached && (
            spaceAbove >= desiredHeight
            || (spaceBelow < desiredHeight && spaceAbove >= spaceBelow)
        );
        const availableHeight = detached
            ? Math.min(desiredHeight, Math.max(0, viewportHeight - (VIEW_MARGIN * 2)))
            : Math.min(desiredHeight, placeAbove ? spaceAbove : spaceBelow);
        panel.style.setProperty('--mi-panel-available-height', `${Math.round(availableHeight)}px`);
        const panelHeight = availableHeight;

        const targetLeft = clamp(anchorRect.right - panelWidth, VIEW_MARGIN, viewportWidth - panelWidth - VIEW_MARGIN);
        const targetTop = detached
            ? VIEW_MARGIN
            : placeAbove
            ? anchorRect.top - panelHeight - gap
            : anchorRect.bottom + gap;
        const anchorCenterX = anchorRect.left + (anchorRect.width / 2);
        const anchorCenterY = anchorRect.top + (anchorRect.height / 2);
        const edgeInsetX = Math.min(28, panelWidth / 2);
        const edgeInsetY = Math.min(28, panelHeight / 2);
        const originX = clamp(
            anchorCenterX - targetLeft,
            edgeInsetX,
            Math.max(edgeInsetX, panelWidth - edgeInsetX)
        );
        const originY = clamp(
            anchorCenterY - targetTop,
            edgeInsetY,
            Math.max(edgeInsetY, panelHeight - edgeInsetY)
        );
        const shiftX = clamp(anchorCenterX - (targetLeft + originX), -56, 56);
        const shiftY = clamp(anchorCenterY - (targetTop + originY), -72, 72);

        panel.style.left = `${Math.round(targetLeft - hostRect.left)}px`;
        panel.style.right = 'auto';
        panel.style.transformOrigin = `${Math.round(originX)}px ${Math.round(originY)}px`;
        panel.style.setProperty('--mi-panel-anchor-x', `${Math.round(originX)}px`);
        panel.style.setProperty('--mi-panel-anchor-y', `${Math.round(originY)}px`);
        panel.style.setProperty('--mi-panel-content-shift-y', detached
            ? (shiftY < 0 ? '-8px' : '8px')
            : placeAbove ? '8px' : '-8px');
        panel.dataset.placement = detached ? 'detached' : placeAbove ? 'above' : 'below';
        if (detached) {
            panel.style.top = `${Math.round(VIEW_MARGIN - hostRect.top)}px`;
            panel.style.bottom = 'auto';
        } else if (placeAbove) {
            const targetBottom = targetTop + panelHeight;
            panel.style.top = 'auto';
            panel.style.bottom = `${Math.round(hostRect.bottom - targetBottom)}px`;
        } else {
            panel.style.top = `${Math.round(targetTop - hostRect.top)}px`;
            panel.style.bottom = 'auto';
        }
        return { originX, originY, shiftX, shiftY, width: panelWidth, height: panelHeight };
    }

    function buildPanelViewFrames(entering, direction) {
        const frames = [];
        const count = 19;
        for (let index = 0; index < count; index += 1) {
            const offset = index / (count - 1);
            if (entering) {
                const progress = getElasticMotionProgress(clamp((offset - 0.14) / 0.86, 0, 1));
                const reveal = clamp(progress, 0, 1);
                const overshoot = Math.max(0, progress - 1);
                const sideInset = (1 - reveal) * 18;
                const clipPath = direction > 0
                    ? `inset(0% 0% 0% ${sideInset}% round 20px)`
                    : `inset(0% ${sideInset}% 0% 0% round 20px)`;
                frames.push({
                    offset,
                    opacity: String(clamp((reveal - 0.025) * 1.18, 0, 1)),
                    transform: `translate3d(${(direction * ((1 - reveal) * 34 - overshoot * 3.5)).toFixed(3)}px, 0, 0) scaleX(${(0.955 + reveal * 0.045 + overshoot * 0.045).toFixed(5)}) scaleY(${(0.985 + reveal * 0.015).toFixed(5)})`,
                    clipPath
                });
            } else {
                const progress = offset * offset * (3 - (2 * offset));
                const opacityProgress = clamp(progress * 2.2, 0, 1);
                const sideInset = progress * 14;
                const clipPath = direction > 0
                    ? `inset(0% ${sideInset}% 0% 0% round 20px)`
                    : `inset(0% 0% 0% ${sideInset}% round 20px)`;
                frames.push({
                    offset,
                    opacity: String(1 - opacityProgress),
                    transform: `translate3d(${(-direction * progress * 24).toFixed(3)}px, 0, 0) scaleX(${(1 - progress * 0.022).toFixed(5)}) scaleY(${(1 - progress * 0.008).toFixed(5)})`,
                    clipPath
                });
            }
        }
        return frames;
    }

    function playPanelViewTransition(fromView, nextView, focusTarget, fromHeight, targetHeight) {
        const panel = q('mi-p');
        const fromElement = fromView === 'settings' ? q('mi-set') : q('mi-main-view');
        const nextElement = nextView === 'settings' ? q('mi-set') : q('mi-main-view');
        const stack = panel?.querySelector('.mi-view-stack');
        const surface = panel?.querySelector('.mi-panel-surface');
        if (!panel || !fromElement || !nextElement || fromElement === nextElement) {
            if (focusTarget) schedulePanelFocus(focusTarget);
            return;
        }

        panelViewMotionGeneration += 1;
        const generation = panelViewMotionGeneration;
        panelViewMotionAnimations.forEach(animation => animation.cancel());
        panelViewMotionAnimations = [];
        fromElement.classList.add('mi-view-transitioning');
        nextElement.classList.add('mi-view-transitioning');

        if (prefersReducedMotion() || typeof nextElement.animate !== 'function') {
            fromElement.classList.remove('mi-view-transitioning');
            nextElement.classList.remove('mi-view-transitioning');
            if (focusTarget) schedulePanelFocus(focusTarget);
            return;
        }

        const direction = nextView === 'settings' ? 1 : -1;
        const outgoing = fromElement.animate(buildPanelViewFrames(false, direction), {
            duration: Math.round(PANEL_VIEW_MOTION_DURATION * 0.5),
            easing: 'linear',
            fill: 'both'
        });
        const incoming = nextElement.animate(buildPanelViewFrames(true, direction), {
            duration: PANEL_VIEW_MOTION_DURATION,
            easing: 'linear',
            fill: 'both'
        });
        const normalizedFromHeight = Math.max(0, Number(fromHeight) || 0);
        const normalizedTargetHeight = Math.max(0, Number(targetHeight) || 0);
        const heightAnimation = stack && Math.abs(normalizedTargetHeight - normalizedFromHeight) > 1
            ? stack.animate([
                {
                    height: `${Math.round(normalizedFromHeight)}px`,
                    maxHeight: `${Math.round(normalizedFromHeight)}px`
                },
                {
                    height: `${Math.round(normalizedTargetHeight)}px`,
                    maxHeight: `${Math.round(normalizedTargetHeight)}px`
                }
            ], {
                duration: PANEL_VIEW_MOTION_DURATION,
                easing: 'cubic-bezier(0.2, 0.78, 0.2, 1)',
                fill: 'both'
            })
            : null;
        const anchorOffsetY = panel.dataset.placement === 'above' && normalizedTargetHeight < normalizedFromHeight
            ? normalizedTargetHeight - normalizedFromHeight
            : 0;
        const surfaceAnimation = surface && Math.abs(anchorOffsetY) > 1
            ? surface.animate([
                { transform: `translate3d(0, ${Math.round(anchorOffsetY)}px, 0)` },
                { transform: 'translate3d(0, 0, 0)' }
            ], {
                duration: PANEL_VIEW_MOTION_DURATION,
                easing: 'cubic-bezier(0.2, 0.78, 0.2, 1)',
                fill: 'both'
            })
            : null;
        panelViewMotionAnimations = [outgoing, incoming, heightAnimation, surfaceAnimation].filter(Boolean);
        incoming.onfinish = () => {
            if (generation !== panelViewMotionGeneration) return;
            panelViewMotionAnimations.forEach(animation => animation.cancel());
            panelViewMotionAnimations = [];
            fromElement.classList.remove('mi-view-transitioning');
            nextElement.classList.remove('mi-view-transitioning');
            if (focusTarget) schedulePanelFocus(focusTarget);
        };
    }

    function setPanelView(view = 'main', focus = true) {
        const panel = q('mi-p');
        if (!panel) return;
        if (typeof privacySelectState !== 'undefined') {
            setPrivacySelectOpen?.('tz', false);
            setPrivacySelectOpen?.('lang', false);
        }
        const nextView = view === 'settings' ? 'settings' : 'main';
        const previousView = panel.dataset.view === 'settings' ? 'settings' : 'main';
        const mainView = q('mi-main-view');
        const settingsView = q('mi-set');
        const viewStack = panel.querySelector('.mi-view-stack');
        const fromHeight = viewStack?.getBoundingClientRect().height || (previousView === 'settings' ? PANEL_SETTINGS_HEIGHT : PANEL_MAIN_HEIGHT);
        const focusTarget = nextView === 'settings' ? q('mi-set-close') : q('mi-sel-btn');
        if (previousView === nextView) {
            if (focus && panel.classList.contains('show')) schedulePanelFocus(focusTarget);
            return;
        }
        panel.dataset.view = nextView;
        panel.setAttribute('aria-labelledby', nextView === 'settings' ? 'mi-settings-title' : 'mi-panel-title');
        mainView?.setAttribute('aria-hidden', nextView === 'main' ? 'false' : 'true');
        settingsView?.setAttribute('aria-hidden', nextView === 'settings' ? 'false' : 'true');
        mainView?.toggleAttribute('inert', nextView !== 'main');
        settingsView?.toggleAttribute('inert', nextView !== 'settings');
        const shouldPrepareLayout = panel.classList.contains('show') && !panel.classList.contains('is-motion-active');
        let targetHeight = nextView === 'settings' ? PANEL_SETTINGS_HEIGHT : PANEL_MAIN_HEIGHT;
        if (shouldPrepareLayout) {
            invalidatePanelMotionLayout(panel);
            const geometry = preparePanelMotionLayout(panel);
            if (Number.isFinite(geometry?.height)) targetHeight = geometry.height;
            preparePanelMotionAnimation(panel, geometry, PANEL_MOTION_DURATION);
        }
        const shouldAnimate = panel.classList.contains('show') && !panel.classList.contains('is-motion-active') && !panel.classList.contains('is-closing');
        if (shouldAnimate) playPanelViewTransition(previousView, nextView, focus ? focusTarget : null, fromHeight, targetHeight);
        else if (focus && panel.classList.contains('show')) schedulePanelFocus(focusTarget);
    }

    function schedulePanelFocus(target) {
        if (panelFocusFrame) cancelAnimationFrame(panelFocusFrame);
        panelFocusFrame = requestAnimationFrame(() => {
            panelFocusFrame = 0;
            if (target?.isConnected) target.focus({ preventScroll: true });
        });
    }

    function prefersReducedMotion() {
        if (!reducedMotionQuery && typeof window.matchMedia === 'function') {
            reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        }
        return Boolean(reducedMotionQuery?.matches);
    }

    function getPanelMotionLayoutKey(panel = q('mi-p')) {
        if (!panel || !host) return '';
        return [
            window.innerWidth,
            window.innerHeight,
            host.style.left,
            host.style.top,
            panel.dataset.view || 'main'
        ].join(':');
    }

    function releasePanelMotionPrime(panel = q('mi-p')) {
        if (panelMotionPrimeTimer) {
            window.clearTimeout(panelMotionPrimeTimer);
            panelMotionPrimeTimer = 0;
        }
        panel?.classList.remove('is-motion-primed');
        q('mi-backdrop')?.classList.remove('is-motion-primed');
    }

    function cancelPanelFirstPaintIdleJob() {
        if (!panelFirstPaintIdleJob) return;
        if (!panelFirstPaintIdleUsesTimeout && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(panelFirstPaintIdleJob);
        } else {
            window.clearTimeout(panelFirstPaintIdleJob);
        }
        panelFirstPaintIdleJob = 0;
        panelFirstPaintIdleUsesTimeout = false;
    }

    function cancelPanelFirstPaintFrame() {
        if (!panelFirstPaintFrame) return;
        cancelAnimationFrame(panelFirstPaintFrame);
        panelFirstPaintFrame = 0;
    }

    function queuePanelFirstPaintFrames(callback) {
        cancelPanelFirstPaintFrame();
        panelFirstPaintFrame = requestAnimationFrame(() => {
            panelFirstPaintFrame = requestAnimationFrame(() => {
                panelFirstPaintFrame = 0;
                callback();
            });
        });
    }

    function resetPanelFirstPaintPreparation(panel = q('mi-p')) {
        if (panelFirstPaintState === 'consumed') return;
        panelFirstPaintGeneration += 1;
        cancelPanelFirstPaintIdleJob();
        cancelPanelFirstPaintFrame();
        panel?.classList.remove('is-first-paint-warmup', 'is-first-paint-ready');
        q('mi-backdrop')?.classList.remove('is-first-paint-warmup', 'is-first-paint-ready');
        if (!panel?.classList.contains('is-motion-active')) panel?.classList.remove('is-motion-primed');
        panelFirstPaintState = 'cold';
    }

    function beginPanelFirstPaintPreparation(panel = q('mi-p')) {
        if (
            !panel
            || panelFirstPaintState !== 'cold'
            || panel.classList.contains('show')
            || document.hidden
            || prefersReducedMotion()
        ) return;

        const geometry = preparePanelMotionLayout(panel);
        const animation = preparePanelMotionAnimation(panel, geometry, PANEL_MOTION_DURATION);
        if (!animation) {
            panelFirstPaintState = 'consumed';
            return;
        }

        const generation = ++panelFirstPaintGeneration;
        const backdrop = q('mi-backdrop');
        panelFirstPaintState = 'warming';
        setPanelMotionCurrentTime(PANEL_MOTION_DURATION);
        panel.classList.remove('is-first-paint-ready');
        panel.classList.add('is-first-paint-warmup');
        backdrop?.classList.remove('is-first-paint-ready');
        backdrop?.classList.add('is-first-paint-warmup');
        panel.getBoundingClientRect();

        queuePanelFirstPaintFrames(() => {
            if (generation !== panelFirstPaintGeneration || panelFirstPaintState !== 'warming') return;
            panel.classList.add('is-motion-primed');
            queuePanelFirstPaintFrames(() => {
                if (generation !== panelFirstPaintGeneration || panelFirstPaintState !== 'warming') return;
                setPanelMotionCurrentTime(0);
                panel.classList.remove('is-first-paint-warmup');
                panel.classList.add('is-first-paint-ready');
                backdrop?.classList.remove('is-first-paint-warmup');
                backdrop?.classList.add('is-first-paint-ready');
                panelFirstPaintState = 'ready';
            });
        });
    }

    function schedulePanelFirstPaintPreparation(panel = q('mi-p')) {
        if (
            !panel
            || panelFirstPaintState !== 'cold'
            || panel.classList.contains('show')
            || document.hidden
            || prefersReducedMotion()
        ) return;
        cancelPanelFirstPaintIdleJob();
        const run = () => {
            panelFirstPaintIdleJob = 0;
            panelFirstPaintIdleUsesTimeout = false;
            beginPanelFirstPaintPreparation(panel);
        };
        if (typeof window.requestIdleCallback === 'function') {
            panelFirstPaintIdleUsesTimeout = false;
            panelFirstPaintIdleJob = window.requestIdleCallback(run, { timeout: PANEL_FIRST_PAINT_IDLE_TIMEOUT });
        } else {
            panelFirstPaintIdleUsesTimeout = true;
            panelFirstPaintIdleJob = window.setTimeout(run, 180);
        }
    }

    function armPanelFirstPaintForInteraction(panel = q('mi-p')) {
        if (!panel || panelFirstPaintState === 'consumed') return false;
        cancelPanelFirstPaintIdleJob();
        cancelPanelFirstPaintFrame();
        panelFirstPaintGeneration += 1;
        const hadPreparedLayer = panelFirstPaintState === 'ready' || panelFirstPaintState === 'warming';
        if (panelFirstPaintState === 'warming') {
            setPanelMotionCurrentTime(0);
            panel.classList.remove('is-first-paint-warmup');
            panel.classList.add('is-first-paint-ready', 'is-motion-primed');
            q('mi-backdrop')?.classList.remove('is-first-paint-warmup');
            q('mi-backdrop')?.classList.add('is-first-paint-ready', 'is-motion-primed');
        }
        if (hadPreparedLayer) panelFirstPaintState = 'ready';
        return hadPreparedLayer;
    }

    function consumePanelFirstPaintPreparation(panel = q('mi-p')) {
        if (!panel || panelFirstPaintState === 'consumed') return;
        panelFirstPaintGeneration += 1;
        cancelPanelFirstPaintIdleJob();
        cancelPanelFirstPaintFrame();
        panel.classList.remove('is-first-paint-warmup', 'is-first-paint-ready');
        q('mi-backdrop')?.classList.remove('is-first-paint-warmup', 'is-first-paint-ready');
        panelFirstPaintState = 'consumed';
    }

    function invalidatePanelMotionLayout(panel = q('mi-p')) {
        resetPanelFirstPaintPreparation(panel);
        panelMotionLayoutKey = '';
        if (panelMotionPrimeFrame) {
            cancelAnimationFrame(panelMotionPrimeFrame);
            panelMotionPrimeFrame = 0;
        }
        releasePanelMotionPrime(panel);
    }

    function preparePanelMotionLayout(panel = q('mi-p')) {
        if (!panel || !host) return panelMotionGeometry;
        const currentKey = getPanelMotionLayoutKey(panel);
        if (currentKey && currentKey === panelMotionLayoutKey) return panelMotionGeometry;
        const geometry = positionFloatingPanel(panel);
        if (geometry) panelMotionGeometry = geometry;
        panelMotionLayoutKey = getPanelMotionLayoutKey(panel);
        return panelMotionGeometry;
    }

    function primePanelMotion(panel = q('mi-p')) {
        const geometry = preparePanelMotionLayout(panel);
        preparePanelMotionAnimation(panel, geometry, panel?.classList.contains('show') ? PANEL_MOTION_DURATION : 0);
        if (!prefersReducedMotion()) {
            panel?.classList.add('is-motion-primed');
            q('mi-backdrop')?.classList.add('is-motion-primed');
            if (panelMotionPrimeTimer) window.clearTimeout(panelMotionPrimeTimer);
            panelMotionPrimeTimer = window.setTimeout(() => {
                panelMotionPrimeTimer = 0;
                if (!panel?.classList.contains('show') && !panel?.classList.contains('is-motion-active')) {
                    panel?.classList.remove('is-motion-primed');
                    q('mi-backdrop')?.classList.remove('is-motion-primed');
                }
            }, PANEL_MOTION_PRIME_LEASE);
        }
        return geometry;
    }

    function schedulePanelMotionPreparation(panel = q('mi-p')) {
        if (!panel || panel.classList.contains('show') || panelMotionPrimeFrame) return;
        panelMotionPrimeFrame = requestAnimationFrame(() => {
            panelMotionPrimeFrame = 0;
            if (!panel.classList.contains('show')) {
                const geometry = preparePanelMotionLayout(panel);
                preparePanelMotionAnimation(panel, geometry, 0);
            }
        });
    }

    function getPanelMotionSpringResponse(time) {
        const t = clamp(Number(time) || 0, 0, 1);
        if (t >= 1) return 1;
        // A critically-near, lightly bouncy response: quick out of the launcher,
        // one restrained material overshoot, then a true zero-velocity settle.
        const damping = 0.82;
        const frequency = 10;
        const dampedFrequency = frequency * Math.sqrt(1 - (damping * damping));
        const envelope = Math.exp(-damping * frequency * t);
        return 1 - envelope * (
            Math.cos(dampedFrequency * t)
            + ((damping * frequency) / dampedFrequency) * Math.sin(dampedFrequency * t)
        );
    }

    function getPanelMotionProgress(time) {
        return clamp(getPanelMotionSpringResponse(time), 0, 1);
    }

    function getPanelMotionElastic(time) {
        const t = clamp(Number(time) || 0, 0, 1);
        const overshoot = clamp((getPanelMotionSpringResponse(t) - 1) / 0.011, 0, 1);
        const settleT = clamp((t - 0.92) / 0.08, 0, 1);
        const settle = settleT * settleT * (3 - (2 * settleT));
        return overshoot * (1 - settle);
    }

    function getPanelMotionMaterialPhases(time) {
        const t = clamp(Number(time) || 0, 0, 1);
        const smoothStep = value => {
            const progress = clamp(Number(value) || 0, 0, 1);
            return progress * progress * (3 - (2 * progress));
        };
        // Material time is intentionally slower than the position spring. The launcher
        // snaps into place quickly, while the glass neck and shell finish unfolding later.
        const neck = smoothStep(t / 0.22);
        const body = smoothStep((t - 0.20) / 0.72);
        const reveal = clamp((0.08 * neck) + (0.92 * body), 0, 1);
        const content = smoothStep((t - 0.28) / 0.72);
        return { neck, body, reveal, content };
    }

    function registerPanelMotionProperties() {
        if (!window.CSS || typeof window.CSS.registerProperty !== 'function') return;
        const properties = [
            ['--mi-motion-bridge-opacity', '<number>', '0'],
            ['--mi-motion-bridge-y', '<number>', '8'],
            ['--mi-motion-bridge-scale', '<number>', '0.36'],
            ['--mi-panel-bridge-opacity', '<number>', '0'],
            ['--mi-panel-bridge-scale', '<number>', '0.68'],
            ['--mi-panel-rim-opacity', '<number>', '0'],
            ['--mi-panel-rim-scale', '<number>', '0.72']
        ];
        for (const [name, syntax, initialValue] of properties) {
            try {
                window.CSS.registerProperty({ name, syntax, inherits: true, initialValue });
            } catch (_) {
                // Registration is global and may already exist after a hot reload.
            }
        }
    }

    function getPanelMotionBridgeKeyframes(geometry = panelMotionGeometry) {
        const panel = q('mi-p');
        const placement = panel?.dataset.placement || 'above';
        const shiftY = Number(geometry?.shiftY) || 0;
        const revealFromTop = placement === 'below' || (placement === 'detached' && shiftY < 0);
        const startY = revealFromTop ? -8 : 8;
        const sampleCount = PANEL_MOTION_SAMPLE_COUNT;
        const smoothStep = value => {
            const t = clamp(Number(value) || 0, 0, 1);
            return t * t * (3 - (2 * t));
        };
        const clean = value => Math.abs(value) < 0.0005 ? 0 : Number(value.toFixed(4));
        const host = [];
        const panelBridge = [];
        for (let index = 0; index < sampleCount; index += 1) {
            const offset = index / (sampleCount - 1);
            const phases = getPanelMotionMaterialPhases(offset);
            const rise = phases.neck;
            const fade = 1 - smoothStep((offset - 0.32) / 0.46);
            const bridgeOpacity = 0.30 * rise * fade;
            const panelOpacity = 0.24 * rise * (1 - smoothStep((offset - 0.38) / 0.44));
            host.push({
                offset,
                '--mi-motion-bridge-opacity': clean(bridgeOpacity),
                '--mi-motion-bridge-y': clean(startY * (1 - rise)),
                '--mi-motion-bridge-scale': clean(0.22 + (0.78 * rise))
            });
            panelBridge.push({
                offset,
                '--mi-panel-bridge-opacity': clean(panelOpacity),
                '--mi-panel-bridge-scale': clean(0.54 + (0.46 * phases.neck))
            });
        }
        return { host, panel: panelBridge };
    }

    function getPanelMotionKeyframes(geometry = panelMotionGeometry) {
        const cleanPx = value => Math.abs(value) < 0.04 ? 0 : Number(value.toFixed(2));
        const clean = value => Math.abs(value) < 0.0005 ? 0 : Number(value.toFixed(3));
        const transform = (x, y, scaleX = 1, scaleY = 1) => [
            'translate3d(', cleanPx(x), 'px, ', cleanPx(y), 'px, 0) scale3d(',
            clean(scaleX), ', ', clean(scaleY), ', 1)'
        ].join('');
        const panel = q('mi-p');
        const shiftX = Number(geometry?.shiftX) || 0;
        const shiftY = Number(geometry?.shiftY) || 0;
        const width = Math.max(1, Number(geometry?.width) || panel?.getBoundingClientRect().width || 368);
        const height = Math.max(1, Number(geometry?.height) || panel?.getBoundingClientRect().height || 680);
        const placement = panel?.dataset.placement || 'above';
        const originX = clamp(Number(geometry?.originX) || (width - 28), 0, width);
        const originY = clamp(Number(geometry?.originY) || (placement === 'below' ? 28 : height - 28), 0, height);
        const detached = placement === 'detached';
        const revealFromTop = placement === 'below' || (detached && shiftY < 0);
        const neckHalfWidth = clamp(width * 0.05, 15, 20);
        const anchorLeftInset = Math.max(0, originX - neckHalfWidth);
        const anchorRightInset = Math.max(0, width - originX - neckHalfWidth);
        const neckHeight = clamp(height * 0.06, 36, 48);
        const smoothStep = value => {
            const t = clamp(Number(value) || 0, 0, 1);
            return t * t * (3 - (2 * t));
        };
        const clip = (visibleHeight, pinch = 0, radius = 22) => {
            const safeVisibleHeight = clamp(visibleHeight, 0, height);
            const revealProgress = safeVisibleHeight / height;
            const hiddenY = Math.max(0, height - safeVisibleHeight);
            const top = detached ? originY * (1 - revealProgress) : revealFromTop ? 0 : hiddenY;
            const bottom = detached ? (height - originY) * (1 - revealProgress) : revealFromTop ? hiddenY : 0;
            return [
                'inset(', cleanPx(top), 'px ', cleanPx(anchorRightInset * pinch), 'px ',
                cleanPx(bottom), 'px ', cleanPx(anchorLeftInset * pinch), 'px round ', cleanPx(radius), 'px)'
            ].join('');
        };
        const overshootX = shiftX === 0 ? 0 : -Math.sign(shiftX) * 0.95;
        const overshootY = shiftY === 0 ? (revealFromTop ? 1.2 : -1.2) : -Math.sign(shiftY) * 1.8;
        const sampleCount = PANEL_MOTION_SAMPLE_COUNT;
        return Array.from({ length: sampleCount }, (_, index) => {
            const offset = index / (sampleCount - 1);
            const progress = getPanelMotionProgress(offset);
            const phases = getPanelMotionMaterialPhases(offset);
            const inverse = 1 - progress;
            const elastic = getPanelMotionElastic(offset);
            const shellReveal = phases.reveal;
            const visibleProgress = clamp(Math.pow(shellReveal, 1.18) + (0.018 * elastic), 0, 1);
            const visibleHeight = neckHeight + ((height - neckHeight) * visibleProgress);
            const pinch = clamp(0.94 * Math.pow(1 - shellReveal, 1.12) * (1 - (0.20 * elastic)), 0, 1);
            const radius = 24 + (22 * Math.pow(1 - shellReveal, 0.58));
            const opacity = clamp(0.004 + (0.996 * ((0.26 * phases.neck) + (0.74 * shellReveal))), 0, 1);
            const rimFade = 1 - smoothStep((shellReveal - 0.18) / 0.62);
            const rimOpacity = clamp((0.22 * phases.neck * rimFade) + (0.045 * elastic), 0, 1);
            const rimScale = 0.72 + (0.28 * shellReveal) + (0.06 * elastic);
            return {
                offset,
                opacity: Number(opacity.toFixed(4)),
                '--mi-panel-rim-opacity': clean(rimOpacity),
                '--mi-panel-rim-scale': clean(rimScale),
                transform: transform(
                    (shiftX * inverse) + (overshootX * elastic),
                    (shiftY * inverse) + (overshootY * elastic),
                    0.92 + (0.08 * shellReveal) + (0.012 * elastic),
                    0.90 + (0.10 * shellReveal) + (0.016 * elastic)
                ),
                clipPath: clip(visibleHeight, pinch, radius)
            };
        });
    }

    function getPanelMotionAnimationKey(geometry = panelMotionGeometry) {
        return [
            panelMotionLayoutKey,
            Number(geometry?.originX || 0).toFixed(2),
            Number(geometry?.originY || 0).toFixed(2),
            Number(geometry?.width || 0).toFixed(2),
            Number(geometry?.height || 0).toFixed(2),
            Number(geometry?.shiftX || 0).toFixed(2),
            Number(geometry?.shiftY || 0).toFixed(2)
        ].join('|');
    }

    function getPanelContentMotionKeyframes(geometry = panelMotionGeometry) {
        const clean = value => Math.abs(value) < 0.001 ? 0 : Number(value.toFixed(3));
        const cleanPx = value => Math.abs(value) < 0.04 ? 0 : Number(value.toFixed(2));
        const shiftX = Number(geometry?.shiftX) || 0;
        const shiftY = Number(geometry?.shiftY) || 0;
        const width = Math.max(1, Number(geometry?.width) || 368);
        const height = Math.max(1, Number(geometry?.height) || 680);
        const panel = q('mi-p');
        const placement = panel?.dataset.placement || 'above';
        const detached = placement === 'detached';
        const revealFromTop = placement === 'below' || (detached && shiftY < 0);
        const originX = clamp(Number(geometry?.originX) || (width - 28), 0, width);
        const originY = clamp(Number(geometry?.originY) || (placement === 'below' ? 28 : height - 28), 0, height);
        const neckHalfWidth = clamp(width * 0.05, 15, 20);
        const anchorLeftInset = Math.max(0, originX - neckHalfWidth);
        const anchorRightInset = Math.max(0, width - originX - neckHalfWidth);
        const clip = (visibleHeight, pinch = 0, radius = 20) => {
            const safeVisibleHeight = clamp(visibleHeight, 0, height);
            const revealProgress = safeVisibleHeight / height;
            const hiddenY = Math.max(0, height - safeVisibleHeight);
            const top = detached ? originY * (1 - revealProgress) : revealFromTop ? 0 : hiddenY;
            const bottom = detached ? (height - originY) * (1 - revealProgress) : revealFromTop ? hiddenY : 0;
            return [
                'inset(', cleanPx(top), 'px ', cleanPx(anchorRightInset * pinch), 'px ',
                cleanPx(bottom), 'px ', cleanPx(anchorLeftInset * pinch), 'px round ', cleanPx(radius), 'px)'
            ].join('');
        };
        const transform = (x, y, scaleX, scaleY) => [
            'translate3d(', clean(x), 'px, ', clean(y), 'px, 0) scale3d(',
            clean(scaleX), ', ', clean(scaleY), ', 1)'
        ].join('');
        const sampleCount = PANEL_MOTION_SAMPLE_COUNT;
        const delay = PANEL_MOTION_CONTENT_DELAY;
        return Array.from({ length: sampleCount }, (_, index) => {
            const offset = index / (sampleCount - 1);
            const contentTime = clamp((offset - delay) / (1 - delay), 0, 1);
            const progress = getPanelMotionProgress(contentTime);
            const phases = getPanelMotionMaterialPhases(contentTime);
            const opacity = contentTime <= 0
                ? 0
                : 1 - Math.pow(1 - phases.content, 1.18);
            const contentReveal = phases.content;
            const visibleHeight = 18 + ((height - 18) * Math.pow(contentReveal, 0.92));
            const pinch = 0.18 * Math.pow(1 - contentReveal, 1.08);
            const radius = 20 + (7 * Math.pow(1 - contentReveal, 0.68));
            return {
                offset,
                opacity: Number(opacity.toFixed(4)),
                transform: transform(
                    shiftX * 0.045 * (1 - progress),
                    shiftY * 0.06 * (1 - progress),
                    0.982 + (0.018 * phases.content),
                    0.978 + (0.022 * phases.content)
                ),
                clipPath: clip(visibleHeight, pinch, radius)
            };
        });
    }

    function setPanelMotionCurrentTime(currentTime) {
        for (const animation of [panelMotionAnimation, panelContentMotionAnimation, panelBridgeMotionAnimation, hostBridgeMotionAnimation]) {
            if (!animation) continue;
            animation.pause();
            animation.currentTime = currentTime;
        }
    }

    function preparePanelMotionAnimation(panel, geometry = panelMotionGeometry, initialTime = null) {
        if (!panel || prefersReducedMotion() || typeof panel.animate !== 'function') return null;
        const nextKey = getPanelMotionAnimationKey(geometry);
        if (panelMotionAnimation && panelContentMotionAnimation && panelBridgeMotionAnimation && hostBridgeMotionAnimation && panelMotionAnimationKey === nextKey) {
            return panelMotionAnimation;
        }

        if (panelMotionAnimation) {
            panelMotionAnimation.onfinish = null;
            panelMotionAnimation.oncancel = null;
            panelMotionAnimation.cancel();
        }
        panelContentMotionAnimation?.cancel();
        panelBridgeMotionAnimation?.cancel();
        hostBridgeMotionAnimation?.cancel();

        const animation = panel.animate(getPanelMotionKeyframes(geometry), {
            duration: PANEL_MOTION_DURATION,
            easing: 'linear',
            fill: 'both'
        });
        const content = panel.querySelector('.mi-view-stack');
        const contentAnimation = content?.animate(getPanelContentMotionKeyframes(geometry), {
            duration: PANEL_MOTION_DURATION,
            easing: 'linear',
            fill: 'both'
        }) || null;
        const bridgeKeyframes = getPanelMotionBridgeKeyframes(geometry);
        const panelBridgeAnimation = panel.animate(bridgeKeyframes.panel, {
            duration: PANEL_MOTION_DURATION,
            easing: 'linear',
            fill: 'both'
        });
        const hostBridgeAnimation = host?.animate(bridgeKeyframes.host, {
            duration: PANEL_MOTION_DURATION,
            easing: 'linear',
            fill: 'both'
        }) || null;
        panelMotionAnimation = animation;
        panelContentMotionAnimation = contentAnimation;
        panelBridgeMotionAnimation = panelBridgeAnimation;
        hostBridgeMotionAnimation = hostBridgeAnimation;
        const resolvedTime = Number.isFinite(initialTime)
            ? initialTime
            : panel.classList.contains('show') ? PANEL_MOTION_DURATION : 0;
        setPanelMotionCurrentTime(resolvedTime);
        panelMotionAnimationKey = nextKey;
        panelMotionOpening = null;
        return animation;
    }

    function clearPanelMotionAnimation(panel = q('mi-p'), finalOpen = false) {
        panelMotionGeneration += 1;
        const animation = panelMotionAnimation;
        const contentAnimation = panelContentMotionAnimation;
        const panelBridgeAnimation = panelBridgeMotionAnimation;
        const hostBridgeAnimation = hostBridgeMotionAnimation;
        panelMotionAnimation = null;
        panelContentMotionAnimation = null;
        panelBridgeMotionAnimation = null;
        hostBridgeMotionAnimation = null;
        panelMotionAnimationKey = '';
        panelMotionOpening = null;
        if (animation) {
            animation.onfinish = null;
            animation.oncancel = null;
        }
        releasePanelMotionPrime(panel);
        panel?.classList.remove('is-opening', 'is-closing', 'is-motion-active');
        q('mi-backdrop')?.classList.remove('is-motion-active');
        if (finalOpen) panel?.classList.add('show');
        else panel?.classList.remove('show');
        animation?.cancel();
        contentAnimation?.cancel();
        panelBridgeAnimation?.cancel();
        hostBridgeAnimation?.cancel();
        resumeDeferredUiWork();
    }

    function completePanelMotion(panel, opening, generation) {
        if (generation !== panelMotionGeneration || !panel) return;
        const animation = panelMotionAnimation;
        const contentAnimation = panelContentMotionAnimation;
        const panelBridgeAnimation = panelBridgeMotionAnimation;
        const hostBridgeAnimation = hostBridgeMotionAnimation;
        panelMotionOpening = null;
        if (animation) animation.onfinish = null;
        releasePanelMotionPrime(panel);
        panel.classList.remove('is-opening', 'is-closing', 'is-motion-active');
        q('mi-backdrop')?.classList.remove('is-motion-active');
        if (opening) {
            panel.classList.add('show');
        } else {
            panelMotionAnimation = null;
            panelContentMotionAnimation = null;
            panelBridgeMotionAnimation = null;
            hostBridgeMotionAnimation = null;
            panelMotionAnimationKey = '';
            panel.classList.remove('show');
            setPanelView('main', false);
            invalidatePanelMotionLayout(panel);
            schedulePanelMotionPreparation(panel);
            animation?.cancel();
            contentAnimation?.cancel();
            panelBridgeAnimation?.cancel();
            hostBridgeAnimation?.cancel();
        }
        resumeDeferredUiWork();
    }

    function startPanelMotion(panel, opening, geometry = panelMotionGeometry) {
        if (!panel) return false;
        if (prefersReducedMotion() || typeof panel.animate !== 'function') {
            clearPanelMotionAnimation(panel, opening);
            return false;
        }

        if (panelMotionAnimation && panelMotionOpening === opening) return true;
        const generation = ++panelMotionGeneration;
        const expectedKey = getPanelMotionAnimationKey(geometry);
        let animation = panelMotionAnimation;
        const carriedTime = Number(panelMotionAnimation?.currentTime);
        const initialTime = Number.isFinite(carriedTime)
            ? clamp(carriedTime, 0, PANEL_MOTION_DURATION)
            : opening ? 0 : PANEL_MOTION_DURATION;
        if (!animation || !panelContentMotionAnimation || !panelBridgeMotionAnimation || !hostBridgeMotionAnimation || panelMotionAnimationKey !== expectedKey) {
            // Preserve the exact interrupted frame when a geometry refresh requires
            // rebuilding the WAAPI effects. This keeps reversal visually continuous.
            animation = preparePanelMotionAnimation(panel, geometry, initialTime);
        }
        if (!animation) return false;

        panelMotionOpening = opening;
        panel.classList.toggle('is-opening', opening);
        panel.classList.toggle('is-closing', !opening);
        panel.classList.add('is-motion-active');
        releasePanelMotionPrime(panel);
        q('mi-backdrop')?.classList.add('is-motion-active');
        animation.onfinish = () => completePanelMotion(panel, opening, generation);
        const playbackRate = opening ? 1 : -PANEL_MOTION_CLOSE_RATE;
        for (const motionAnimation of [animation, panelContentMotionAnimation, panelBridgeMotionAnimation, hostBridgeMotionAnimation]) {
            if (!motionAnimation) continue;
            if (typeof motionAnimation.updatePlaybackRate === 'function') {
                motionAnimation.updatePlaybackRate(playbackRate);
            } else {
                motionAnimation.playbackRate = playbackRate;
            }
            motionAnimation.play();
        }
        return true;
    }

    function clearButtonMotion(button = q('mi-b'), preservePress = false) {
        if (buttonPressTimer) {
            window.clearTimeout(buttonPressTimer);
            buttonPressTimer = 0;
        }
        if (buttonMotionTimer) {
            window.clearTimeout(buttonMotionTimer);
            buttonMotionTimer = 0;
        }
        if (panelFocusTimer) {
            window.clearTimeout(panelFocusTimer);
            panelFocusTimer = 0;
        }
        button?.classList.remove('is-closing', 'is-motion-active');
        if (!preservePress) button?.classList.remove('panel-primed');
    }

    function setIconMotionTargets(button, cycle = iconMotionCycle) {
        if (!button) return;
        const safeCycle = Number.isFinite(cycle) ? Math.max(0, cycle) : 0;
        button.style.setProperty('--mi-orbit-open-angle', `${(safeCycle * 360) + 224}deg`);
        button.style.setProperty('--mi-core-open-angle', `${(-safeCycle * 360) - 202}deg`);
        button.style.setProperty('--mi-orbit-close-angle', `${(safeCycle + 1) * 360}deg`);
        button.style.setProperty('--mi-core-close-angle', `${-(safeCycle + 1) * 360}deg`);
    }

    function finishButtonMotion(button, generation, opening) {
        if (generation !== panelToggleGeneration) return;
        if (buttonPressTimer) {
            window.clearTimeout(buttonPressTimer);
            buttonPressTimer = 0;
        }
        if (buttonMotionTimer) {
            window.clearTimeout(buttonMotionTimer);
            buttonMotionTimer = 0;
        }
        button?.classList.remove('panel-primed', 'is-closing', 'is-motion-active');
        if (!opening) {
            iconMotionCycle = 0;
            setIconMotionTargets(button, 0);
        }
    }

    function beginButtonMotion(button, opening) {
        const preservePress = Boolean(opening && button?.classList.contains('panel-primed'));
        clearButtonMotion(button, preservePress);
        const generation = ++panelToggleGeneration;
        const reducedMotion = prefersReducedMotion();
        if (opening) {
            setIconMotionTargets(button, iconMotionCycle);
        } else {
            iconMotionCycle += 1;
            setIconMotionTargets(button, iconMotionCycle - 1);
        }

        if (reducedMotion) {
            button?.classList.remove('panel-primed', 'is-closing', 'is-motion-active');
            if (!opening) {
                iconMotionCycle = 0;
                setIconMotionTargets(button, 0);
            }
            return { generation, reducedMotion };
        }

        button?.classList.add('is-motion-active');
        if (opening) {
            if (preservePress) {
                buttonPressTimer = window.setTimeout(() => {
                    if (generation !== panelToggleGeneration) return;
                    buttonPressTimer = 0;
                    button?.classList.remove('panel-primed');
                }, 22);
            }
        } else {
            button?.classList.remove('panel-primed');
            button?.classList.add('is-closing');
        }

        buttonMotionTimer = window.setTimeout(
            () => finishButtonMotion(button, generation, opening),
            opening ? 620 : 380
        );
        return { generation, reducedMotion };
    }

    function schedulePanelOpenFocus(target, generation, reducedMotion) {
        if (panelFocusTimer) window.clearTimeout(panelFocusTimer);
        panelFocusTimer = window.setTimeout(() => {
            panelFocusTimer = 0;
            if (generation !== panelToggleGeneration || !q('mi-p')?.classList.contains('show')) return;
            schedulePanelFocus(target);
        }, reducedMotion ? 32 : 54);
    }

    function getPanelFocusables() {
        const panel = q('mi-p');
        if (!panel) return [];
        const view = panel.dataset.view === 'settings' ? q('mi-set') : q('mi-main-view');
        if (!view) return [];
        const roots = [view];
        if (q('mi-drop')?.classList.contains('show')) roots.push(q('mi-drop'));
        if (q('mi-lang-menu')?.classList.contains('show')) roots.push(q('mi-lang-menu'));
        for (const kind of ['tz', 'lang']) {
            if (privacySelectState?.[kind]?.open && q(`mi-privacy-${kind}-menu`)) {
                roots.push(q(`mi-privacy-${kind}-menu`));
            }
        }
        return roots.flatMap(root => [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')])
            .filter(element => {
                if (element.closest('[inert], [aria-hidden=true]')) return false;
                const style = getComputedStyle(element);
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && element.getClientRects().length > 0;
            });
    }

    function trapPanelFocus(event) {
        const panel = q('mi-p');
        if (
            event.key !== 'Tab'
            || !panel?.classList.contains('show')
            || panel.classList.contains('is-closing')
            || panel.getAttribute('aria-hidden') === 'true'
        ) return;
        const focusables = getPanelFocusables();
        if (!focusables.length) {
            event.preventDefault();
            q('mi-p')?.focus({ preventScroll: true });
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!q('mi-p')?.contains(document.activeElement)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function showPanel(panel = q('mi-p')) {
        if (!panel) return;
        const reversingClose = panel.classList.contains('is-closing');
        if (panel.classList.contains('show') && !reversingClose) return;
        armPanelFirstPaintForInteraction(panel);
        if (!reversingClose) {
            lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : q('mi-b');
        }
        panel.toggleAttribute('inert', false);
        if (!reversingClose) setPanelView('main', false);
        const geometry = panelMotionAnimation ? panelMotionGeometry : preparePanelMotionLayout(panel);
        const button = q('mi-b');
        const motion = beginButtonMotion(button, true);
        panel.classList.add('show');
        panel.setAttribute('aria-hidden', 'false');
        button?.classList.add('panel-open');
        button?.setAttribute('aria-expanded', 'true');
        startPanelMotion(panel, true, geometry);
        updateBackdrop();
        consumePanelFirstPaintPreparation(panel);
        schedulePanelOpenFocus(q('mi-sel-btn'), motion.generation, motion.reducedMotion);
    }

    function hidePanel(panel = q('mi-p'), options = {}) {
        if (!panel || !panel.classList.contains('show')) return;
        const immediate = Boolean(options?.immediate);
        if (panel.classList.contains('is-closing') && !immediate) return;
        panelViewMotionGeneration += 1;
        panelViewMotionAnimations.forEach(animation => animation.cancel());
        panelViewMotionAnimations = [];
        q('mi-main-view')?.classList.remove('mi-view-transitioning');
        q('mi-set')?.classList.remove('mi-view-transitioning');
        closeDropdown(false);
        q('mi-lang-picker')?.classList.remove('open');
        q('mi-lang-menu')?.classList.remove('show');
        q('mi-lang-trigger')?.setAttribute('aria-expanded', 'false');
        q('mi-lang-menu')?.setAttribute('aria-hidden', 'true');
        q('mi-lang-menu')?.toggleAttribute('inert', true);
        const button = q('mi-b');
        const focusTarget = lastFocusedElement?.isConnected && !panel.contains(lastFocusedElement)
            ? lastFocusedElement
            : button;
        focusTarget?.focus({ preventScroll: true });
        if (panel.contains(document.activeElement)) button?.focus({ preventScroll: true });
        panel.toggleAttribute('inert', true);
        if (immediate) {
            clearButtonMotion(button);
            iconMotionCycle = 0;
            setIconMotionTargets(button, 0);
        } else {
            beginButtonMotion(button, false);
        }
        panel.setAttribute('aria-hidden', 'true');
        button?.classList.remove('panel-open');
        button?.setAttribute('aria-expanded', 'false');
        let animated = false;
        if (immediate) clearPanelMotionAnimation(panel, false);
        else animated = startPanelMotion(panel, false, panelMotionGeometry);
        if (!animated) {
            setPanelView('main', false);
            invalidatePanelMotionLayout(panel);
            if (!immediate) schedulePanelMotionPreparation(panel);
        }
        updateBackdrop();
    }

    function togglePanel(panel = q('mi-p')) {
        if (!panel) return;
        if (panel.classList.contains('is-closing')) showPanel(panel);
        else if (panel.classList.contains('show')) hidePanel(panel);
        else showPanel(panel);
    }

    function renderColors() {
        const container = q('mi-clrs');
        if (!container) return;
        const focusIndex = Math.max(0, COLORS.indexOf(S.bgColor));
        container.setAttribute('role', 'radiogroup');
        container.setAttribute('aria-label', t('theme_color'));
        container.innerHTML = COLORS.map((color, index) => `<button type="button" role="radio" aria-checked="${color === S.bgColor}" tabindex="${index === focusIndex ? 0 : -1}" class="mi-clr ${color === S.bgColor ? 'active' : ''}" data-color="${color}" style="background:${color}" aria-label="${color}"></button>`).join('');
    }

    function renderSponsorModule() {
        const slot = q('mi-sponsor-slot');
        if (!slot) return;

        const repositoryLabel = t('view_repository');
        const repositoryMarkup = `
            <a class="mi-repo-link" href="${escapeHtml(PROJECT_REPOSITORY_URL)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(repositoryLabel)}" aria-label="${escapeHtml(repositoryLabel)}">
                <svg class="mi-repo-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path d="M5.25 3.5h6.5l3 3v10h-9.5z"></path>
                    <path d="M11.75 3.5v3h3M7.5 10h5M7.5 13h5"></path>
                </svg>
                <span class="mi-repo-text">${escapeHtml(repositoryLabel)}</span>
            </a>
        `;
        const sponsor = window.MI_CONFIG?.sponsor;
        let safeHref = "";
        try {
            const parsed = new URL(String(sponsor?.href || ""));
            if (parsed.protocol === 'https:') safeHref = parsed.href;
        } catch {}
        let sponsorMarkup = "";
        if (sponsor?.enabled && safeHref) {
            const target = sponsor.newTab === false ? '_self' : '_blank';
            const rel = target === '_blank' ? 'noopener noreferrer' : '';
            const label = sponsor.useI18nLabel === false ? (sponsor.label || t('support_dev')) : t('support_dev');
            const title = sponsor.useI18nLabel === false ? (sponsor.title || label) : t('support_dev');
            sponsorMarkup = `
                <a class="mi-sponsor" href="${escapeHtml(safeHref)}" target="${target}" rel="${rel}" title="${escapeHtml(title)}">
                    <span class="mi-sponsor-icon">+</span>
                    <span class="mi-sponsor-text">${escapeHtml(label)}</span>
                </a>
            `;
        }
        slot.innerHTML = `${repositoryMarkup}${sponsorMarkup}`;
    }
    function renderLanguageOptions() {
        const current = q('mi-lang-current');
        const menu = q('mi-lang-menu');
        if (!current || !menu) return;

        const currentLabel = LANGUAGE_OPTIONS.find(([value]) => value === S.lang)?.[1] || LANGUAGE_OPTIONS[0][1];
        current.textContent = currentLabel;
        q('mi-lang-trigger')?.setAttribute('aria-label', `${t('language')}: ${currentLabel}`);
        menu.setAttribute('aria-label', t('language'));
        menu.innerHTML = LANGUAGE_OPTIONS.map(([value, label]) => `
            <button type="button" class="mi-lang-option ${value === S.lang ? 'active' : ''}" data-lang="${value}" role="option" aria-selected="${value === S.lang}" tabindex="-1">
                <span>${label}</span>
            </button>
        `).join('');
    }

    function getSyncLabel(status = modelSyncStatus) {
        return t(`sync_${status}`) || t('sync_idle');
    }

    function setModelSyncStatus(status, error = '') {
        modelSyncStatus = status || 'idle';
        const button = q('mi-ref-btn');
        if (button) {
            button.classList.remove('loading', 'ok', 'fail', 'cached');
            if (modelSyncStatus === 'syncing') button.classList.add('loading');
            if (modelSyncStatus === 'updated') button.classList.add('ok');
            if (modelSyncStatus === 'failed') button.classList.add('fail');
            if (modelSyncStatus === 'cached') button.classList.add('cached');
            button.title = error ? `${t('refresh_list')} | ${error}` : `${t('refresh_list')} | ${getSyncLabel()}`;
        }
        const liveNote = q('mi-drop')?.querySelector('.mi-menu-live-note');
        if (liveNote) liveNote.textContent = getSyncLabel();
        updateInfo();
    }

    function getDiagnosticEffortText() {
        const hasRewrite = Boolean(injectionDiagnostic.at);
        const enabled = hasRewrite ? injectionDiagnostic.effortEnabled : S.effortOn;
        const requested = (hasRewrite ? injectionDiagnostic.effortRequested : S.effort) || 'standard';
        const label = t(`effort_${requested}`);
        if (!enabled) return t('effort_disabled');
        if (!injectionDiagnostic.effortApplied) return `${t('effort_not_applied')} / ${label}`;
        return `${injectionDiagnostic.thinkingEffort || mapEffort(requested, S.model)} / ${label}`;
    }

    function getDiagnosticRouteText() {
        if (!injectionDiagnostic.at) return t('route_unknown');
        if (injectionDiagnostic.routeStatus === 'skipped') return t('route_skipped');
        if (!injectionDiagnostic.responseModel) return t(injectionDiagnostic.routeStatus === 'hidden' ? 'route_hidden' : 'route_unknown');
        return `${injectionDiagnostic.responseModel} / ${t(injectionDiagnostic.routeStatus === 'routed' ? 'route_routed' : 'route_same')}`;
    }

    function getDiagnosticSummaryText(route = getDiagnosticRouteText()) {
        const model = truncate(getDisplayName(S.model), 22);
        const status = injectionDiagnostic.error ? t('diagnostic_status_error') : t('diagnostic_status_ok');
        return `${model} · ${route} · ${status}`;
    }

    function getPacketUiText(key) {
        const dict = {
            'zh-CN': {
                request: '\u8bf7\u6c42\u5305',
                response: '\u54cd\u5e94\u6d41',
                none: '\u672a\u6355\u83b7',
                noHint: '\u65e0 hint',
                agentConfirmed: 'Agent \u5df2\u786e\u8ba4',
                hintOnly: '\u4ec5 hint',
                modelMismatch: '\u6a21\u578b\u4e0d\u4e00\u81f4',
                modelSame: '\u6a21\u578b\u4e00\u81f4',
                noModel: '\u672a\u53d1\u73b0\u6a21\u578b\u5b57\u6bb5'
            },
            en: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only',
                modelMismatch: 'Model mismatch',
                modelSame: 'Model matched',
                noModel: 'No model field'
            },
            ja: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only',
                modelMismatch: 'Model mismatch',
                modelSame: 'Model matched',
                noModel: 'No model field'
            },
            ru: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only',
                modelMismatch: 'Model mismatch',
                modelSame: 'Model matched',
                noModel: 'No model field'
            }
        };
        return dict[S.lang]?.[key] || dict.en[key] || key;
    }

    function getDiagnosticPowText() {
        const record = lastPowDetection;
        if (!record) return t('pow_not_seen');
        if (record.required === false && !record.difficulty) return t('pow_not_required');
        if (!record.difficulty) return t('pow_absent');
        const decimal = Number.isSafeInteger(record.difficultyDecimal) ? ` (${record.difficultyDecimal})` : '';
        const grade = getPowDifficultyGrade(record.difficulty);
        return `${record.difficulty}${decimal} · ${t(`pow_grade_${grade.key}`)}`;
    }

    function summarizePacketRequest() {
        const packet = injectionDiagnostic.packetRequest;
        if (!packet) return getPacketUiText('none');
        const hints = new Set(packet.rootSystemHints || []);
        for (const hint of packet.messageSystemHints || []) hints.add(hint);
        const hintText = hints.size ? [...hints].join(', ') : getPacketUiText('noHint');
        const agentText = packet.runtimeAgent?.id
            ? `runtime=${packet.runtimeAgent.id}`
            : packet.composerAgent?.id
            ? `composer=${packet.composerAgent.id}`
            : packet.hintAgent?.id
            ? `hint=${packet.hintAgent.id}`
            : 'agent=-';
        const signalText = packet.agentSignal || '-';
        return `${packet.model || '-'} | ${packet.conversationMode || '-'} | ${agentText} | signal=${signalText} | ${hintText}`;
    }

    function summarizePacketResponse() {
        const packet = injectionDiagnostic.packetResponse;
        if (!packet) return getPacketUiText('none');
        const model = packet.responseModel || '';
        const modelStatus = packet.mismatch
            ? getPacketUiText('modelMismatch')
            : model
            ? getPacketUiText('modelSame')
            : getPacketUiText('noModel');
        const agent = packet.agentName || packet.agentId || '';
        const agentStatus = packet.status === 'confirmed'
            ? getPacketUiText('agentConfirmed')
            : packet.status === 'hinted'
            ? getPacketUiText('hintOnly')
            : '';
        const subject = agent ? `${agent}${model ? ` / ${model}` : ''}` : (model || '-');
        return `${subject} | ${modelStatus}${agentStatus ? ` / ${agentStatus}` : ''} | ${packet.source || '-'}`;
    }

    function getDiagnosticWorkspaceAgentText(selectedId = getWorkspaceAgentId()) {
        const id = injectionDiagnostic.workspaceAgentId || selectedId;
        if (!id) return t('workspace_agent_none');
        const name = injectionDiagnostic.workspaceAgentName || getWorkspaceAgent(id)?.name || id;
        const safeStatusKey = injectionDiagnostic.workspaceAgentStatus || 'detected';
        const safeLabels = {
            'zh-CN': {
                hinted: '\u4ec5\u8bf7\u6c42 hint',
                forced: 'Agent hint \u5df2\u6ce8\u5165',
                ready: '\u8bf7\u6c42\u5df2\u5e26 hint',
                confirmed: 'Agent \u5df2\u786e\u8ba4',
                history: '\u5386\u53f2\u4f1a\u8bdd\u8bc6\u522b',
                fallback: '\u666e\u901a\u6a21\u578b\u56de\u9000',
                detected: '\u5df2\u53d1\u73b0'
            },
            en: {
                hinted: 'Hint only',
                forced: 'Agent hint injected',
                ready: 'Hint present',
                confirmed: 'Agent confirmed',
                history: 'History only',
                fallback: 'Model fallback',
                detected: 'Detected'
            },
            ja: {
                hinted: 'Hint only',
                forced: 'Agent hint injected',
                ready: 'Hint present',
                confirmed: 'Agent confirmed',
                history: 'History only',
                fallback: 'Model fallback',
                detected: 'Detected'
            },
            ru: {
                hinted: 'Hint only',
                forced: 'Agent hint injected',
                ready: 'Hint present',
                confirmed: 'Agent confirmed',
                history: 'History only',
                fallback: 'Model fallback',
                detected: 'Detected'
            }
        };
        const safeStatus = safeLabels[S.lang]?.[safeStatusKey]
            || safeLabels.en[safeStatusKey]
            || (safeStatusKey === 'required'
                ? t('workspace_agent_required')
                : safeStatusKey === 'pending'
                ? t('workspace_agent_pending')
                : t('workspace_agent_detected'));
        return `${name} / ${safeStatus}`;
    }

    function publishDiagnosticSnapshot() {
        document.documentElement.removeAttribute('data-mi-diagnostic');
        document.documentElement.removeAttribute('data-mi-packet-log-size');
    }

    function updateDiagnostics() {
        injectionDiagnostic.selected = S.model || '';
        publishDiagnosticSnapshot();

        const diag = q('mi-diag');
        const toggle = q('mi-diag-toggle');
        const panel = q('mi-diag-panel');
        const summary = q('mi-diag-summary');
        const title = q('mi-diag-title');
        const selectedKey = q('mi-diag-selected-k');
        const lastKey = q('mi-diag-last-k');
        const effortKey = q('mi-diag-effort-k');
        const routeKey = q('mi-diag-route-k');
        const agentKey = q('mi-diag-agent-k');
        const packetReqKey = q('mi-diag-packet-req-k');
        const packetResKey = q('mi-diag-packet-res-k');
        const powKey = q('mi-diag-pow-k');
        const errorKey = q('mi-diag-error-k');
        const selected = q('mi-diag-selected');
        const last = q('mi-diag-last');
        const effort = q('mi-diag-effort');
        const route = q('mi-diag-route');
        const agent = q('mi-diag-agent');
        const packetReq = q('mi-diag-packet-req');
        const packetRes = q('mi-diag-packet-res');
        const pow = q('mi-diag-pow');
        const error = q('mi-diag-error');
        if (!selected || !last || !error) return;
        const defaultModelLabel = S.model ? '' : t('default_model');
        const selectedModelText = S.model || defaultModelLabel;
        let routeText = null;

        if (diag) {
            diag.classList.toggle('open', S.diagOpen);
            diag.classList.toggle('has-error', Boolean(injectionDiagnostic.error));
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', S.diagOpen ? 'true' : 'false');
            toggle.setAttribute('title', S.diagOpen ? t('diagnostic_collapse') : t('diagnostic_expand'));
        }
        if (panel) {
            panel.setAttribute('aria-hidden', S.diagOpen ? 'false' : 'true');
            panel.toggleAttribute('inert', !S.diagOpen);
        }
        if (summary) {
            routeText = getDiagnosticRouteText();
            summary.textContent = getDiagnosticSummaryText(routeText);
            summary.title = `${t('diagnostic_selected')}: ${selectedModelText} | ${t('diagnostic_response_model')}: ${routeText} | ${t('diagnostic_error')}: ${injectionDiagnostic.error || t('diagnostic_none')}`;
        }
        if (title) title.textContent = t('diagnostic_title');
        if (selectedKey) selectedKey.textContent = t('diagnostic_selected');
        if (lastKey) lastKey.textContent = t('diagnostic_last');
        if (effortKey) effortKey.textContent = t('diagnostic_effort');
        if (routeKey) routeKey.textContent = t('diagnostic_response_model');
        if (agentKey) agentKey.textContent = t('diagnostic_workspace_agent');
        if (packetReqKey) packetReqKey.textContent = getPacketUiText('request');
        if (packetResKey) packetResKey.textContent = getPacketUiText('response');
        if (powKey) powKey.textContent = t('diagnostic_pow');
        if (errorKey) errorKey.textContent = t('diagnostic_error');
        selected.textContent = selectedModelText;
        selected.title = selectedModelText;
        last.textContent = injectionDiagnostic.skipReason
            ? `${t('diagnostic_skipped_agent')} @ ${injectionDiagnostic.at}`
            : injectionDiagnostic.at
            ? `${injectionDiagnostic.lastModel || defaultModelLabel || t('default_model')} @ ${injectionDiagnostic.at}`
            : t('diagnostic_not_yet');
        last.title = injectionDiagnostic.skipReason
            ? injectionDiagnostic.skipReason
            : injectionDiagnostic.originalModel
            ? `${injectionDiagnostic.originalModel} -> ${injectionDiagnostic.lastModel}`
            : '';
        if (effort) {
            effort.textContent = getDiagnosticEffortText();
            effort.title = injectionDiagnostic.effortApplied
                ? `thinking_effort=${injectionDiagnostic.thinkingEffort}`
                : '';
            effort.classList.toggle('is-muted', !injectionDiagnostic.effortApplied);
        }
        if (route) {
            if (routeText == null) routeText = getDiagnosticRouteText();
            route.textContent = routeText;
            route.title = injectionDiagnostic.responseModel
                ? `requested=${injectionDiagnostic.lastModel || S.model || ''}; response=${injectionDiagnostic.responseModel}`
                : t('route_hidden');
            route.classList.toggle('is-muted', !injectionDiagnostic.responseModel);
        }
        if (agent) {
            const selectedAgentId = getWorkspaceAgentId();
            const agentId = injectionDiagnostic.workspaceAgentId || selectedAgentId;
            agent.textContent = getDiagnosticWorkspaceAgentText(selectedAgentId);
            agent.title = agentId || '';
            agent.classList.toggle('is-muted', !agentId);
        }
        if (packetReq) {
            packetReq.textContent = summarizePacketRequest();
            packetReq.title = injectionDiagnostic.packetRequest ? JSON.stringify(injectionDiagnostic.packetRequest, null, 2) : '';
            packetReq.classList.toggle('is-muted', !injectionDiagnostic.packetRequest);
        }
        if (packetRes) {
            packetRes.textContent = summarizePacketResponse();
            packetRes.title = injectionDiagnostic.packetResponse ? JSON.stringify(injectionDiagnostic.packetResponse, null, 2) : '';
            packetRes.classList.toggle('is-muted', !injectionDiagnostic.packetResponse);
        }
        if (pow) {
            const grade = getPowDifficultyGrade(lastPowDetection?.difficulty);
            const gradeText = t(`pow_grade_${grade.key}`);
            pow.textContent = getDiagnosticPowText();
            pow.title = lastPowDetection
                ? `${t('pow_grade_disclaimer')}\n\n${JSON.stringify({ ...lastPowDetection, grade: gradeText, significantHexLength: grade.significantHexLength }, null, 2)}`
                : '';
            pow.classList.toggle('is-muted', !lastPowDetection || grade.tone === 'muted');
            pow.classList.toggle('is-success', grade.tone === 'success');
            pow.classList.toggle('is-normal', grade.tone === 'normal');
            pow.classList.toggle('is-warning', grade.tone === 'warning');
            pow.classList.toggle('has-error', grade.tone === 'danger');
        }
        error.textContent = injectionDiagnostic.error || t('diagnostic_none');
        error.title = injectionDiagnostic.error || '';
        error.classList.toggle('has-error', Boolean(injectionDiagnostic.error));
        updateBadge();
    }

    function applyUiText() {
        if (q('mi-b')) {
            q('mi-b').setAttribute('title', 'Open Model Injector · Drag to move · Right click to pause');
            q('mi-b').setAttribute('aria-label', 'Open Model Injector');
        }
        host?.setAttribute('lang', S.lang);
        if (q('mi-model-label')) q('mi-model-label').textContent = t('default_model');
        if (q('mi-sel-btn')) q('mi-sel-btn').setAttribute('title', t('choose_model'));
        if (q('mi-sel-txt')) q('mi-sel-txt').textContent = `${t('choose_model')}...`;
        if (q('mi-ref-btn')) {
            q('mi-ref-btn').setAttribute('title', t('refresh_list'));
            const refLabel = q('mi-ref-label');
            if (refLabel) refLabel.textContent = t('refresh_list');
        }
        if (q('mi-cu')) q('mi-cu').placeholder = t('add_model');
        if (q('mi-add')) q('mi-add').setAttribute('title', t('add_model'));

        if (q('mi-enable-title')) q('mi-enable-title').textContent = t('title_enable');
        if (q('mi-enable-subtitle')) q('mi-enable-subtitle').textContent = t('subtitle_enable');
        if (q('mi-effort-title')) q('mi-effort-title').textContent = t('title_effort');
        if (q('mi-effort-subtitle')) q('mi-effort-subtitle').textContent = t('subtitle_effort');

        const boxTitle = host.querySelector('.mi-box-head h4');
        if (boxTitle) boxTitle.innerHTML = `${t('title_context')} <span class="mi-badge">${t('auto_label')}</span>`;
        if (q('mi-calc')) {
            q('mi-calc').setAttribute('title', t('refresh_context'));
            q('mi-calc').setAttribute('aria-label', t('refresh_context'));
        }
        if (q('val-used')?.nextElementSibling) q('val-used').nextElementSibling.textContent = t('used');
        if (q('val-free')?.nextElementSibling) q('val-free').nextElementSibling.textContent = t('free');
        if (q('val-msgs')?.nextElementSibling) q('val-msgs').nextElementSibling.textContent = t('messages');
        if (q('val-lim')?.nextElementSibling) q('val-lim').nextElementSibling.textContent = t('limit');

        if (q('mi-btn-set')) q('mi-btn-set').textContent = t('settings');
        const setHead = host.querySelector('#mi-set .mi-set-head h4');
        if (setHead) setHead.textContent = t('settings');
        if (q('mi-set-close')) q('mi-set-close').textContent = '\u2190';
        if (q('mi-theme-label')) q('mi-theme-label').textContent = t('theme_color');
        renderColors();
        const colorLabel = host.querySelector('#mi-set .mi-color-row label');
        if (colorLabel) colorLabel.textContent = t('custom_color');
        if (q('mi-lang-label')) q('mi-lang-label').textContent = t('language');
        const debugLabel = q('mi-debug-label');
        if (debugLabel) debugLabel.textContent = t('debug_mode');
        if (q('mi-privacy-spoof')) q('mi-privacy-spoof').textContent = t('privacy_spoof');
        if (q('mi-privacy-subtitle')) q('mi-privacy-subtitle').textContent = t('privacy_subtitle');
        if (q('mi-privacy-tz-label')) q('mi-privacy-tz-label').textContent = t('privacy_timezone');
        if (q('mi-privacy-lang-label')) q('mi-privacy-lang-label').textContent = t('privacy_language');
        if (q('mi-privacy-title')) q('mi-privacy-title').textContent = t('privacy_title');
        if (q('mi-privacy-body')) q('mi-privacy-body').textContent = t('privacy_body');
        renderPrivacySettings();
        if (q('mi-clear-diagnostics')) q('mi-clear-diagnostics').textContent = t('diagnostic_clear');
        if (q('mi-export-packets')) q('mi-export-packets').textContent = t('diagnostic_export');
        renderLanguageOptions();
        renderSponsorModule();
        updateDiagnostics();
        setModelSyncStatus(modelSyncStatus);
    }

    function renderEffortGrid() {
        const container = q('mi-grid-eff');
        if (!container) return;
        const selectedIndex = Math.max(0, EFFORTS.indexOf(S.effort));
        container.setAttribute('role', 'radiogroup');
        container.setAttribute('aria-label', t('title_effort'));
        container.setAttribute('aria-disabled', S.effortOn ? 'false' : 'true');
        if (!container.querySelector('.mi-effort-track')) {
            container.innerHTML = `
                <div class="mi-effort-track">
                    <span class="mi-effort-lens" aria-hidden="true"><span class="mi-effort-lens-material"></span></span>
                    ${EFFORTS.map(effort => `
                        <button type="button" class="mi-g-item" role="radio" data-e="${effort}">
                            <span class="mi-g-main"></span>
                        </button>
                    `).join('')}
                </div>
                <p class="mi-effort-detail" id="mi-effort-detail"></p>`;
        }

        const track = container.querySelector('.mi-effort-track');
        track?.style.setProperty('--mi-effort-index', String(selectedIndex));
        track?.style.setProperty('--mi-effort-glass-x', `${(selectedIndex + 0.5) * 25}%`);
        track?.classList.toggle('is-disabled', !S.effortOn);
        container.querySelectorAll('.mi-g-item').forEach(option => {
            const effort = option.dataset.e;
            const selected = effort === S.effort;
            option.classList.toggle('active', selected);
            option.setAttribute('aria-checked', selected ? 'true' : 'false');
            option.setAttribute('aria-describedby', 'mi-effort-detail');
            option.tabIndex = selected && S.effortOn ? 0 : -1;
            option.disabled = !S.effortOn;
            const label = option.querySelector('.mi-g-main');
            if (label) label.textContent = t(`effort_${effort}`);
        });
        const detail = container.querySelector('.mi-effort-detail');
        if (detail) {
            const parts = [t(`effort_${S.effort}_sub`)];
            if (S.debug) {
                const wire = mapEffort(S.effort, S.model);
                if (wire) parts.push(wire);
            }
            detail.textContent = parts.join(' · ');
        }
    }

    function renderRecent() {
        const container = q('mi-chips');
        if (!container) return;
        container.innerHTML = S.recent.map(id => `<button type="button" class="mi-chip ${S.model === id ? 'active' : ''}" data-id="${escapeHtml(id)}" title="${escapeHtml(id)}" aria-pressed="${S.model === id}">${escapeHtml(truncate(getDisplayName(id), 18))}</button>`).join('');
    }

    function normalizeModelPresentationKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\u2010-\u2015\u2212_./:]+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
            .replace(/\s+/g, ' ');
    }

    function collectMenuModelItems() {
        const merged = new Map();
        PRESETS.forEach(([id, displayName]) => {
            if (id === 'auto' || isHiddenModelId(id)) return;
            merged.set(id, { id, name: displayName, entry: getApiEntry(id) });
        });
        S.api.forEach(item => {
            if (item?.id && item.id !== 'auto' && !isHiddenModelId(item.id)) {
                merged.set(item.id, { id: item.id, name: item.name || item.id, entry: item });
            }
        });
        return [...merged.values()];
    }

    function getBaseModelPresentation(id, name, entry) {
        const mappedVariant = String(MENU_LABELS[id] || '').trim();
        const catalogVariant = String(entry?.categoryLabel || '').trim();
        const variant = mappedVariant || catalogVariant;
        const fullName = String(name || id).trim();
        const suffixMatches = Boolean(variant)
            && fullName.toLowerCase().endsWith(` ${variant.toLowerCase()}`);
        const promoteVariant = Boolean(variant)
            && variant.toLowerCase() !== fullName.toLowerCase()
            && (Boolean(mappedVariant) || suffixMatches);
        const title = promoteVariant ? variant : fullName;
        const modelContext = promoteVariant
            ? (suffixMatches ? fullName.slice(0, -variant.length).trim() : fullName)
            : '';
        return { title, modelContext, baseKey: normalizeModelPresentationKey(title) };
    }

    function shortModelId(id) {
        const value = String(id || '').trim();
        if (value.length <= 34) return value;
        return `${value.slice(0, 30)}...`;
    }

    function getModelDisambiguator(id, entry, base) {
        const value = String(id || '').trim();
        const versionMatch = value.match(/^gpt[-.]?(\d+)(?:[-.](\d+))?/i);
        const major = versionMatch?.[1] || '';
        const minor = versionMatch?.[2] || '';
        const versionLabel = major && minor ? `${major}.${minor}` : major;
        const suffix = versionMatch
            ? value.slice(versionMatch[0].length).replace(/^[-_.]+/, '')
            : value;
        const tokenMap = {
            cca: 'CCA',
            fast: 'Fast',
            instant: 'Instant',
            luna: 'Luna',
            mini: 'Mini',
            pro: 'Pro',
            reasoning: 'Reasoning',
            sol: 'Sol',
            standard: 'Standard',
            terra: 'Terra',
            thinking: 'Thinking',
            t: 'Thinking',
            work: 'Work',
            wm: 'Work'
        };
        const baseWords = new Set(normalizeModelPresentationKey(base?.title).split(/[^a-z0-9]+/i).filter(Boolean));
        const labels = [];
        const addLabel = label => {
            const normalized = normalizeModelPresentationKey(label);
            if (!label || !normalized || baseWords.has(normalized) || labels.includes(label)) return;
            labels.push(label);
        };
        suffix.split(/[-_.]+/).filter(Boolean).forEach(token => {
            const lower = token.toLowerCase();
            if (/^\d+$/.test(lower) || baseWords.has(lower)) return;
            addLabel(tokenMap[lower] || (lower.length > 1 ? `${lower[0].toUpperCase()}${lower.slice(1)}` : lower.toUpperCase()));
        });
        if (entry?.workMode) addLabel('Work');
        const versionIsAlreadyVisible = major && minor && baseWords.has(major) && baseWords.has(minor);
        if (versionLabel && !versionIsAlreadyVisible) addLabel(versionLabel);
        if (labels.length) return labels.slice(0, 3).join(' / ');
        return versionLabel ? 'Standard' : shortModelId(value);
    }

    function buildModelPresentations(items) {
        const bases = new Map();
        const counts = new Map();
        for (const item of items) {
            const base = getBaseModelPresentation(item.id, item.name, item.entry);
            bases.set(item.id, base);
            counts.set(base.baseKey, (counts.get(base.baseKey) || 0) + 1);
        }
        const usedTitles = new Set();
        const presentations = new Map();
        for (const item of items) {
            const base = bases.get(item.id);
            const duplicateBase = (counts.get(base.baseKey) || 0) > 1;
            const disambiguator = duplicateBase ? getModelDisambiguator(item.id, item.entry, base) : '';
            let title = duplicateBase ? `${base.title} / ${disambiguator}` : base.title;
            let attempt = 0;
            while (usedTitles.has(normalizeModelPresentationKey(title))) {
                attempt += 1;
                const suffix = attempt === 1
                    ? (disambiguator || shortModelId(item.id))
                    : `${disambiguator || 'model'} / ${shortModelId(item.id)}${attempt > 2 ? ` / ${attempt}` : ''}`;
                title = `${base.title} / ${suffix}`;
            }
            usedTitles.add(normalizeModelPresentationKey(title));
            presentations.set(item.id, { ...base, title });
        }
        return presentations;
    }

    function getMenuModelData() {
        if (menuModelCache.source !== S.api) {
            const items = collectMenuModelItems();
            menuModelCache.items = items;
            menuModelCache.presentations = buildModelPresentations(items);
            menuModelCache.source = S.api;
        }
        return menuModelCache;
    }

    function renderModelOption(id, name, entry, presentation = null) {
        const badges = [];
        if (entry?.tokens) badges.push(fmtTok(entry.tokens));
        if (entry?.workMode) badges.push('WM');
        if (entry?.deprecated) badges.push('↓');
        const meta = badges.join(' · ');
        const isOnlineCatalog = isLiveCatalogModel(id);
        const onlineState = isOnlineCatalog
            ? `<span class="mi-source-state" aria-label="${escapeHtml(t('online'))}"><span class="mi-source-dot" aria-hidden="true"></span><span>${escapeHtml(t('online'))}</span></span>`
            : '';
        const modelPresentation = presentation || getBaseModelPresentation(id, name, entry);
        const title = modelPresentation.title;
        const modelContext = modelPresentation.modelContext;
        const subParts = [modelContext];
        if (entry?.tagline) subParts.push(entry.tagline);
        else if (entry?.shortExplainer) subParts.push(entry.shortExplainer);
        if (!subParts.some(Boolean) && id && id !== title) subParts.push(id);
        const sub = subParts.filter(Boolean).join(' · ');
        const details = escapeHtml(JSON.stringify({
            id,
            name,
            tokens: entry?.tokens || null,
            desc: entry?.desc || '',
            tools: entry?.tools || [],
            reasoning: entry?.reasoning || '',
            versionLabel: entry?.versionLabel || '',
            workMode: Boolean(entry?.workMode),
            deprecated: Boolean(entry?.deprecated),
            deprecationDate: entry?.deprecationDate || '',
            official: Boolean(entry),
            online: isOnlineCatalog
        }));
        return `<button type="button" role="option" tabindex="-1" aria-selected="${S.model === id}" class="mi-opt ${S.model === id ? 'active' : ''} ${entry ? 'official' : ''} ${isOnlineCatalog ? 'is-online' : ''} ${entry?.deprecated ? 'deprecated' : ''} ${entry?.workMode ? 'work-mode' : ''}" data-id="${escapeHtml(id)}" data-details="${details}">
            <div class="mi-opt-body">
                <span class="mi-opt-title-row"><span class="txt">${escapeHtml(title)}</span>${onlineState}</span>
                <span class="sub">${escapeHtml(sub)}</span>
            </div>
            <span class="meta">${escapeHtml(meta)}</span>
            <span class="mi-check" aria-hidden="true">&#10003;</span>
        </button>`;
    }

    function renderWorkspaceAgentOption(agent) {
        const id = makeWorkspaceAgentSelection(agent.id);
        const details = escapeHtml(JSON.stringify({
            id: agent.id,
            name: agent.name,
            desc: agent.desc || '',
            tools: agent.skills?.length ? agent.skills : agent.tools || [],
            reasoning: t('workspace_agent'),
            versionLabel: agent.source || '',
            official: true,
            agent: true
        }));
        return `<button type="button" role="option" tabindex="-1" aria-selected="${S.model === id}" class="mi-opt mi-agent-opt ${S.model === id ? 'active' : ''} official" data-id="${escapeHtml(id)}" data-details="${details}">
            <div class="mi-opt-body">
                <span class="txt">${escapeHtml(agent.name || agent.id)}</span>
                <span class="sub">${escapeHtml(agent.id)}</span>
            </div>
            <span class="meta">${escapeHtml(t('workspace_agent'))}</span>
            <span class="mi-check" aria-hidden="true">&#10003;</span>
        </button>`;
    }

    function getModelFamilyLabel(id) {
        for (const section of MODEL_MENU_SECTIONS) {
            for (const [familyName, matcher] of section.families) {
                if (matcher.test(id)) return familyName;
            }
        }
        return t('group_api');
    }

    function renderModelFamilies(items, modelPresentations = null) {
        const families = new Map();
        items.forEach(item => {
            const family = getModelFamilyLabel(item.id);
            if (!families.has(family)) families.set(family, []);
            families.get(family).push(item);
        });
        let html = '';
        for (const [family, familyItems] of families) {
            html += `<div class=mi-family><div class=mi-family-head>${escapeHtml(family)}</div>`;
            const presentations = modelPresentations || buildModelPresentations(familyItems);
            familyItems.sort(compareMenuModelItems).forEach(item => {
                html += renderModelOption(item.id, item.name, item.entry, presentations.get(item.id));
            });
            html += `</div>`;
        }
        return html;
    }

    function renderModelMenuSection(title, items, className = '', modelPresentations = null) {
        if (!items.length) return '';
        return `<div class='mi-menu-section ${className}'>
            <div class='mi-opt-grp'><span>${escapeHtml(title)}</span><span class='mi-group-count'>${items.length}</span></div>
            ${renderModelFamilies(items, modelPresentations)}
        </div>`;
    }

    function renderOfflineModelSection(items, expanded, modelPresentations = null) {
        if (!items.length) return '';
        const label = t(expanded ? 'hide_offline_models' : 'show_offline_models');
        return `<div class='mi-menu-section mi-offline-section ${expanded ? 'is-expanded' : ''}'>
            <button type='button' class='mi-offline-toggle' data-action='toggle-offline' aria-expanded='${expanded ? 'true' : 'false'}' title='${escapeHtml(label)}'>
                <span class='mi-offline-toggle-label'><span class='mi-offline-dot' aria-hidden='true'></span>${escapeHtml(t('offline_models'))}</span>
                <span class='mi-offline-toggle-meta'><span class='mi-group-count'>${items.length}</span><span class='mi-offline-chevron' aria-hidden='true'></span></span>
            </button>
            ${expanded ? `<div class='mi-offline-body'>${renderModelFamilies(items, modelPresentations)}</div>` : ''}
        </div>`;
    }

    function getMenuFilter() {
        const raw = String(modelMenuQuery || '').trim();
        const slash = raw.startsWith('/');
        const query = slash ? raw.slice(1).trim() : raw;
        return {
            raw,
            query,
            terms: query.toLowerCase().split(/\s+/).filter(Boolean),
            agentOnly: modelMenuAgentOnly || slash
        };
    }

    function getDropdownRenderSignature(filter) {
        const apiKey = S.api.map(item => [item.id, item.name, item.tokens, item.categoryLabel, item.deprecated ? 1 : 0].join(':')).join('|');
        const agentKey = S.agents.map(item => [item.id, item.name, item.updatedAt].join(':')).join('|');
        return [
            S.lang,
            S.model,
            filter.raw,
            filter.agentOnly ? 1 : 0,
            modelMenuOfflineExpanded ? 1 : 0,
            modelSyncStatus,
            [...liveApiModelIds].join('|'),
            apiKey,
            S.custom.join('|'),
            agentKey
        ].join('§');
    }

    function menuMatches(values, terms) {
        const needles = Array.isArray(terms)
            ? terms
            : String(terms || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!needles.length) return true;
        const haystack = values.filter(Boolean).join(' ').toLowerCase();
        return needles.every(part => haystack.includes(part));
    }

    function renderMenuSearch(filter = getMenuFilter()) {
        const hasValue = Boolean(filter.raw);
        return `<div class="mi-menu-search ${filter.agentOnly ? 'agent-mode' : ''} ${hasValue ? 'has-value' : ''}">
            <div class="mi-menu-search-head">
                <span class="mi-menu-search-title">${escapeHtml(t('search_quick_title'))}</span>
                <span class="mi-menu-search-mode">${escapeHtml(filter.agentOnly ? t('search_agent_mode') : t('search_models'))}</span>
            </div>
            <div class="mi-menu-search-box">
                <span class="mi-menu-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.6" cy="10.6" r="5.7"></circle><path d="m15.1 15.1 4.2 4.2"></path></svg></span>
                <input id="mi-menu-search" type="text" value="${escapeHtml(modelMenuQuery)}" placeholder="${escapeHtml(t('search_placeholder'))}" autocomplete="off" spellcheck="false">
                <button class="mi-menu-search-clear" type="button" data-action="clear-search" title="${escapeHtml(t('search_clear'))}" aria-label="${escapeHtml(t('search_clear'))}">×</button>
            </div>
            <div class="mi-menu-search-hint"><span class="mi-menu-key">/</span>${escapeHtml(filter.agentOnly ? t('section_workspace_agents') : t('search_models_hint'))}</div>
        </div>`;
    }

    function syncMenuSearchUi(dropdown, filter) {
        const searchWrap = dropdown.querySelector('.mi-menu-search');
        const search = dropdown.querySelector('#mi-menu-search');
        if (!searchWrap || !search) return false;

        searchWrap.classList.toggle('agent-mode', filter.agentOnly);
        searchWrap.classList.toggle('has-value', Boolean(filter.raw));
        const title = searchWrap.querySelector('.mi-menu-search-title');
        const mode = searchWrap.querySelector('.mi-menu-search-mode');
        const clear = searchWrap.querySelector('[data-action=clear-search]');
        const hint = searchWrap.querySelector('.mi-menu-search-hint');
        if (title) title.textContent = t('search_quick_title');
        if (mode) mode.textContent = t(filter.agentOnly ? 'search_agent_mode' : 'search_models');
        if (search.value !== modelMenuQuery) search.value = modelMenuQuery;
        search.placeholder = t('search_placeholder');
        if (clear) {
            clear.title = t('search_clear');
            clear.setAttribute('aria-label', t('search_clear'));
        }
        if (hint) {
            const label = t(filter.agentOnly ? 'section_workspace_agents' : 'search_models_hint');
            const key = hint.querySelector('.mi-menu-key');
            const textNode = key?.nextSibling;
            if (textNode?.nodeType === Node.TEXT_NODE) textNode.nodeValue = label;
            else hint.append(label);
        }
        return true;
    }

    function renderEmptyMenuNotice() {
        return `<div class="mi-menu-empty">${escapeHtml(t('no_menu_results'))}</div>`;
    }

    function renderDropdown(options = {}) {
        hideTooltip();
        const dropdown = q('mi-drop');
        const label = q('mi-sel-txt');
        if (!dropdown) return;
        const keepSearchFocus = document.activeElement?.id === 'mi-menu-search';
        const filter = getMenuFilter();

        if (label) {
            const displayName = getDisplayName(S.model);
            label.textContent = displayName;
            label.title = S.model || t('default_model');
            q('mi-sel-btn')?.setAttribute('aria-label', `${t('choose_model')}: ${displayName}`);
        }
        if (!options.force && !dropdown.classList.contains('show')) return;

        const signature = getDropdownRenderSignature(filter);
        const currentOptions = dropdown.querySelector('#mi-menu-options');
        if (currentOptions && dropdownRenderSignature === signature && !options.animateUpdate) {
            syncMenuSearchUi(dropdown, filter);
            return;
        }

        let visibleGroups = 0;
        let html = '';
        let offlineItems = [];
        let offlineExpanded = false;

        const { items: mergedItems, presentations: modelPresentations } = getMenuModelData();

        const agentItems = [...S.agents];
        const selectedAgentId = getWorkspaceAgentId();
        if (selectedAgentId && !agentItems.some(agent => agent.id === selectedAgentId)) {
            agentItems.unshift({ id: selectedAgentId, name: selectedAgentId, source: 'selected', skills: [], tools: [] });
        }
        const visibleAgents = agentItems.filter(agent => menuMatches([agent.id, agent.name, agent.desc, agent.source, ...(agent.skills || []), ...(agent.tools || [])], filter.terms));
        if (visibleAgents.length && filter.agentOnly) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section mi-agent-section"><div class="mi-opt-grp">${escapeHtml(t('section_workspace_agents'))}</div><div class="mi-family">`;
            visibleAgents.forEach(agent => { html += renderWorkspaceAgentOption(agent); });
            html += `</div></div>`;
        }

        if (!filter.agentOnly) {
            const matchingItems = mergedItems
                .filter(item => menuMatches([item.id, item.name, MENU_LABELS[item.id], item.entry?.categoryLabel, item.entry?.desc, item.entry?.reasoning, item.entry?.versionLabel], filter.terms))
                .sort(compareMenuModelItems);
            const onlineItems = matchingItems.filter(item => isLiveCatalogModel(item.id) && !isPersistentSpecialModel(item.id));
            const specialItems = matchingItems.filter(item => isPersistentSpecialModel(item.id));
            offlineItems = matchingItems.filter(item => !isLiveCatalogModel(item.id) && !isPersistentSpecialModel(item.id));
            offlineExpanded = modelMenuOfflineExpanded || Boolean(filter.terms.length) || offlineItems.some(item => item.id === S.model);

            if (onlineItems.length) {
                visibleGroups += 1;
                html += renderModelMenuSection(t('online_models'), onlineItems, 'mi-live-section', modelPresentations);
            } else if (!filter.terms.length) {
                visibleGroups += 1;
                html += `<div class="mi-menu-section mi-live-section mi-live-empty"><div class="mi-opt-grp"><span>${escapeHtml(t('online_models'))}</span><span class="mi-live-pulse" aria-hidden="true"></span></div><div class="mi-menu-live-note">${escapeHtml(t(modelSyncStatus === 'syncing' ? 'sync_syncing' : 'sync_idle'))}</div></div>`;
            }

            if (menuMatches([t('default_model'), t('auto_label'), 'auto default'], filter.terms)) {
                visibleGroups += 1;
                html += `<div class="mi-menu-section mi-default-section"><div class="mi-opt-grp"><span>${escapeHtml(t('group_default'))}</span></div><div class="mi-family">
                    <button type="button" role="option" tabindex="-1" aria-selected="${!S.model || S.model === 'auto'}" class="mi-opt ${(!S.model || S.model === 'auto') ? 'active' : ''}" data-id="" title="${escapeHtml(t('default_model'))}">
                        <div class="mi-opt-body"><span class="txt">${escapeHtml(t('default_model'))}</span><span class="sub">${escapeHtml(t('auto_label'))}</span></div>
                        <span class="meta"></span><span class="mi-check" aria-hidden="true">&#10003;</span>
                    </button>
                </div></div>`;
            }

            if (specialItems.length) {
                visibleGroups += 1;
                html += renderModelMenuSection(t('section_special'), specialItems, 'mi-special-section', modelPresentations);
            }
        }

        const customItems = S.custom
            .filter(id => !isHiddenModelId(id))
            .filter(id => !filter.agentOnly && menuMatches([id, t('custom_subtitle')], filter.terms));
        if (customItems.length) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section"><div class="mi-opt-grp">${escapeHtml(t('custom_group'))}</div><div class="mi-family">`;
            customItems.forEach(id => {
                const deleteLabel = `${t('delete_custom_model')}: ${id}`;
                html += `<div class="mi-custom-row" role="presentation">
                    <button type="button" role="option" tabindex="-1" aria-selected="${S.model === id}" class="mi-opt mi-custom-opt ${S.model === id ? 'active' : ''}" data-id="${escapeHtml(id)}" data-custom="true" data-details="{}">
                        <div class="mi-opt-body">
                            <span class="txt">${escapeHtml(id)}</span>
                            <span class="sub">${escapeHtml(t('custom_subtitle'))}</span>
                        </div>
                        <span class="meta"></span>
                        <span class="mi-check" aria-hidden="true">&#10003;</span>
                    </button>
                    <button type="button" class="mi-custom-remove" data-action="remove-custom" data-id="${escapeHtml(id)}" title="${escapeHtml(deleteLabel)}" aria-label="${escapeHtml(deleteLabel)}">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 8.5v9m7-9v9M5.5 6h13M9 6l.8-2h4.4l.8 2m1.7 0-.7 14H8L7.3 6"></path></svg>
                    </button>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (!filter.agentOnly && offlineItems.length) {
            visibleGroups += 1;
            html += renderOfflineModelSection(offlineItems, offlineExpanded, modelPresentations);
        }

        if (visibleAgents.length && !filter.agentOnly) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section mi-agent-section mi-agent-section-bottom"><div class="mi-opt-grp">${escapeHtml(t('section_workspace_agents'))}</div><div class="mi-family">`;
            visibleAgents.forEach(agent => { html += renderWorkspaceAgentOption(agent); });
            html += `</div></div>`;
        }

        if (!visibleGroups) html += renderEmptyMenuNotice();
        let optionsContainer = dropdown.querySelector('#mi-menu-options');
        let rebuiltSearch = false;
        if (!optionsContainer || !syncMenuSearchUi(dropdown, filter)) {
            dropdown.innerHTML = `${renderMenuSearch(filter)}<div id="mi-menu-options" class="mi-menu-options" role="listbox" aria-label="${escapeHtml(t('choose_model'))}">${html}</div>`;
            optionsContainer = dropdown.querySelector('#mi-menu-options');
            rebuiltSearch = true;
        } else {
            optionsContainer.setAttribute('aria-label', t('choose_model'));
            optionsContainer.innerHTML = html;
        }
        dropdownRenderSignature = signature;
        bindTooltipEvents(dropdown);
        if (options.animateUpdate && dropdown.classList.contains('show') && !prefersReducedMotion()) {
            optionsContainer.animate([
                { opacity: 0.48, transform: 'translate3d(0, 7px, 0) scaleY(0.985)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0) scaleY(1)' }
            ], { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
        }
        const search = dropdown.querySelector('#mi-menu-search');
        if (search && keepSearchFocus && rebuiltSearch) {
            requestAnimationFrame(() => {
                search.focus();
                const pos = search.value.length;
                search.setSelectionRange(pos, pos);
            });
        }
    }

    let tooltipEl = null;
    let tooltipShowTimer = 0;
    let tooltipHideTimer = 0;
    const tooltipBoundContainers = new WeakSet();

    function showTooltip(target, details) {
        if (tooltipShowTimer) {
            window.clearTimeout(tooltipShowTimer);
            tooltipShowTimer = 0;
        }
        if (tooltipHideTimer) {
            window.clearTimeout(tooltipHideTimer);
            tooltipHideTimer = 0;
        }
        tooltipEl = getTooltipElement();
        tooltipEl.classList.remove('show', 'hiding');

        const d = typeof details === 'string' ? JSON.parse(details) : details;
        if (!d?.id) return;

        const statusLabel = d.agent ? t('workspace_agent_detected') : d.online ? t('online') : '';
        let html = `<div class="mi-tooltip-title">${escapeHtml(d.name || d.id)}${statusLabel ? `<span class="mi-online-badge">${escapeHtml(statusLabel)}</span>` : ''}</div>`;
        html += `<div class="mi-tooltip-id">${escapeHtml(d.id)}</div>`;
        if (d.tokens) html += `<div class="mi-tooltip-row"><span class="k">${escapeHtml(t('tooltip_context'))}</span><span class="v">${fmtTok(d.tokens)} tokens</span></div>`;
        if (d.reasoning) html += `<div class="mi-tooltip-row"><span class="k">${escapeHtml(t('tooltip_reasoning'))}</span><span class="v">${escapeHtml(d.reasoning)}</span></div>`;
        if (d.versionLabel) html += `<div class="mi-tooltip-row"><span class="k">${escapeHtml(t('tooltip_version'))}</span><span class="v">${escapeHtml(d.versionLabel)}</span></div>`;
        if (d.desc) html += `<div class="mi-tooltip-desc">${escapeHtml(d.desc).slice(0, 150)}${d.desc.length > 150 ? '...' : ''}</div>`;
        if (d.tools?.length) html += `<div class="mi-tooltip-tools">${d.tools.map(tool => `<span class="tool">${escapeHtml(tool)}</span>`).join('')}</div>`;
        tooltipEl.innerHTML = html;
        tooltipEl.classList.remove('hiding');

        requestAnimationFrame(() => {
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const gap = 26;
            let side = 'left';
            let left = rect.left - tooltipRect.width - gap;
            let top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            if (left < 12) {
                left = rect.right + gap;
                side = 'right';
            }
            if (left + tooltipRect.width > window.innerWidth - 12) {
                left = rect.left;
                top = rect.bottom + 8;
                side = 'bottom';
                if (top + tooltipRect.height > window.innerHeight - 12) {
                    top = rect.top - tooltipRect.height - 8;
                    side = 'top';
                }
            }
            if (top < 12) top = 12;
            if (top + tooltipRect.height > window.innerHeight - 12) top = window.innerHeight - tooltipRect.height - 12;
            tooltipEl.dataset.side = side;
            tooltipEl.style.transformOrigin =
                side === 'left' ? '100% 50%' :
                side === 'right' ? '0% 50%' :
                side === 'top' ? '50% 100%' :
                '50% 0%';
            tooltipEl.style.left = `${left}px`;
            tooltipEl.style.top = `${top}px`;
            requestAnimationFrame(() => tooltipEl.classList.add('show'));
        });
    }

    function hideTooltip() {
        if (tooltipShowTimer) {
            window.clearTimeout(tooltipShowTimer);
            tooltipShowTimer = 0;
        }
        tooltipEl = tooltipEl || document.querySelector('.mi-tooltip');
        if (!tooltipEl || !tooltipEl.classList.contains('show')) return;
        tooltipEl.classList.add('hiding');
        tooltipEl.classList.remove('show');
        if (tooltipHideTimer) window.clearTimeout(tooltipHideTimer);
        tooltipHideTimer = window.setTimeout(() => {
            tooltipHideTimer = 0;
            document.querySelectorAll('.mi-tooltip').forEach((node, index) => {
                if (index === 0) node.classList.remove('hiding');
                else node.remove();
            });
        }, 250);
    }

    function bindTooltipEvents(container) {
        if (!container || tooltipBoundContainers.has(container)) return;
        tooltipBoundContainers.add(container);
        container.addEventListener('mouseover', event => {
            const option = event.target.closest?.('.mi-opt[data-details]');
            if (!option || !container.contains(option) || option.contains(event.relatedTarget)) return;
            const details = option.getAttribute('data-details');
            if (!details || details === '{}') return;
            if (tooltipShowTimer) window.clearTimeout(tooltipShowTimer);
            tooltipShowTimer = window.setTimeout(() => showTooltip(option, details), 150);
        });
        container.addEventListener('mouseout', event => {
            const option = event.target.closest?.('.mi-opt[data-details]');
            if (!option || !container.contains(option) || option.contains(event.relatedTarget)) return;
            hideTooltip();
        });
    }

    function updateBadge() {
        const button = q('mi-b');
        const mismatch = hasModelMismatch();
        button?.classList.toggle('is-route-mismatch', mismatch);
        button?.setAttribute('data-route-state', mismatch ? 'mismatch' : (injectionDiagnostic.responseModel ? injectionDiagnostic.routeStatus : 'unknown'));
        const badge = q('mi-n');
        if (!badge) return;
        const prevCount = parseInt(badge.textContent, 10) || 0;
        badge.textContent = String(S.cnt);
        const shouldShow = S.debug && S.cnt > 0;
        badge.style.display = shouldShow ? 'flex' : 'none';
        if (!shouldShow) {
            badge.style.animation = 'none';
            return;
        }
        if (S.cnt > prevCount) {
            badge.style.animation = 'none';
            window.setTimeout(() => { badge.style.animation = 'miBadgeBounce 0.5s var(--mi-ease-spring)'; }, 10);
        }
    }

    function updateInfo() {
        const info = q('mi-info-txt');
        if (!info) return;
        info.dataset.state = modelSyncStatus;
        const totalEntries = S.api.length + S.agents.length;
        if (totalEntries) {
            const parts = [`${S.api.length} ${t('models_unit')}`];
            if (S.agents.length) parts.push(`+ ${S.agents.length} ${t('workspace_agent')}`);
            if (S.lastFetch) parts.push(`| ${S.lastFetch}`);
            if (S.lastAgentFetch && !S.lastFetch) parts.push(`| ${S.lastAgentFetch}`);
            if (modelSyncStatus !== 'idle') parts.push(`| ${getSyncLabel()}`);
            const current = isWorkspaceAgentSelection(S.model) ? getSelectedWorkspaceAgent() : getApiEntry(S.model);
            info.textContent = parts.join(' ');
            info.title = current?.tokens ? `${current.name || current.id} | ${fmtTok(current.tokens)} tokens` : (current?.desc || current?.id || '');
        } else {
            info.textContent = modelSyncStatus !== 'idle' ? getSyncLabel() : t('status_no_models');
            info.title = '';
        }
    }

    function updateModelLabel() {
        const label = q('mi-model-label');
        if (!label) return;
        label.textContent = S.on ? truncate(getDisplayName(S.model), 16) : t('paused');
        label.title = S.model || t('default_model');
    }

    function syncControlState() {
        q('mi-b')?.classList.toggle('off', !S.on);
        for (const [id, enabled] of [['mi-sw-main', S.on], ['mi-sw-effort', S.effortOn], ['mi-sw-debug', S.debug], ['mi-sw-privacy', S.privacyOn]]) {
            const control = q(id);
            control?.classList.toggle('on', Boolean(enabled));
            control?.setAttribute('aria-checked', enabled ? 'true' : 'false');
        }
        for (const [id, enabled] of [['mi-enable-state', S.on], ['mi-effort-state', S.effortOn]]) {
            const state = q(id);
            if (!state) continue;
            state.textContent = t(enabled ? 'state_on' : 'state_off');
            state.classList.toggle('is-on', Boolean(enabled));
        }
        const exportButton = q('mi-export-packets');
        if (exportButton) exportButton.disabled = !S.debug;
        const status = q('mi-st');
        if (status) {
            status.textContent = S.on ? (getDisplayName(S.model) || t('status_ready')) : t('paused');
            status.classList.toggle('paused', !S.on);
        }
    }

    function updateUIState() {
        syncControlState();
        renderEffortGrid();
        renderRecent();
        renderDropdown();
        updateBadge();
        updateInfo();
        updateDiagnostics();
        updateModelLabel();
        scheduleTokenUpdate();
    }

    function applyColor(value) {
        const hex = normalizeHex(value);
        if (!hex) return;
        S.bgColor = hex;
        save('bg', hex);
        applyTheme();
        renderColors();
        updateContextRing(lastStats.pct || 0);
    }

    function animateContextRefresh() {
        const button = q('mi-calc');
        if (!button) return;

        button.classList.remove('is-spinning', 'is-success');
        requestAnimationFrame(() => requestAnimationFrame(() => button.classList.add('is-spinning')));

        if (calcFeedbackTimer) window.clearTimeout(calcFeedbackTimer);
        calcFeedbackTimer = window.setTimeout(() => {
            button.classList.remove('is-spinning');
            button.classList.add('is-success');
            calcFeedbackTimer = window.setTimeout(() => {
                button.classList.remove('is-success');
                calcFeedbackTimer = 0;
            }, 720);
        }, 720);
    }

    function animateModelConfirmation() {
        const button = q('mi-sel-btn');
        if (!button) return;
        button.classList.remove('is-confirmed');
        requestAnimationFrame(() => requestAnimationFrame(() => button.classList.add('is-confirmed')));
        if (modelConfirmTimer) window.clearTimeout(modelConfirmTimer);
        modelConfirmTimer = window.setTimeout(() => {
            button.classList.remove('is-confirmed');
            modelConfirmTimer = 0;
        }, 680);
    }

    function saveSelection(id) {
        if (isHiddenModelId(id)) id = '';
        S.model = id;
        save('m', id);
        touchRecent(id);
        if (isWorkspaceAgentSelection(id)) {
            const agentId = getWorkspaceAgentId(id);
            const agent = getWorkspaceAgent(agentId);
            updateWorkspaceAgentDiagnostic(
                { id: agentId, name: agent?.name || agentId },
                agent ? 'pending' : 'required'
            );
        }
        updateUIState();
        animateModelConfirmation();
    }

    function removeCustomModel(id) {
        const value = String(id || '').trim();
        if (!value || !S.custom.includes(value)) return false;
        const removedCurrentSelection = S.model === value;
        S.custom = S.custom.filter(item => item !== value);
        S.recent = S.recent.filter(item => item !== value);
        saveJson('custom', S.custom);
        saveJson('recent', S.recent);
        if (removedCurrentSelection) {
            S.model = '';
            saveValue('m', '');
        }
        updateUIState();
        return true;
    }

    function syncStateFromStorage() {
        const previousModel = S.model;
        const previousDebug = S.debug;
        const previousPrivacyOn = S.privacyOn;
        const previousPrivacyTzMode = S.privacyTzMode;
        const previousPrivacyLangMode = S.privacyLangMode;
        S.on = readMainToggle();
        S.model = readString('m', '');
        if (S.model === 'auto') S.model = '';
        if (isHiddenModelId(S.model)) S.model = '';
        S.effort = readString('e', 'standard');
        if (!EFFORTS.includes(S.effort)) S.effort = 'standard';
        S.effortOn = readFlag('eo', false);
        S.debug = readFlag('d', false);
        S.privacyOn = readFlag('pv', false);
        S.privacyTzMode = readString('pvtz', 'auto');
        S.privacyLangMode = readString('pvlang', 'auto');
        S.lang = readString('lang', 'zh-CN');
        S.bgColor = readString('bg', '#007aff');
        S.diagOpen = readFlag('diag_open', S.diagOpen);
        S.api = sanitizeApiList(readJson('api', S.api));
        S.custom = sanitizeStringList(readJson('custom', S.custom));
        S.recent = sanitizeStringList(readJson('recent', S.recent)).slice(0, 8);
        S.agents = sanitizeWorkspaceAgentList(readJson('agents', S.agents));
        S.lastFetch = readString('lf', S.lastFetch || '');
        S.lastAgentFetch = readString('laf', S.lastAgentFetch || '');
        if (previousDebug && !S.debug) clearDiagnosticArtifacts();
        const privacyChanged = previousPrivacyOn !== S.privacyOn
            || previousPrivacyTzMode !== S.privacyTzMode
            || previousPrivacyLangMode !== S.privacyLangMode;
        if (privacyChanged) {
            applyPrivacySpoof();
            if (IS_TOP_FRAME) syncAcceptLanguageRule();
            if (IS_TOP_FRAME) renderPrivacySettings();
        }
        applyTheme();
        applyUiText();
        updateUIState();
        if (previousModel !== S.model) {
            appendPacketLog('state-sync', null, {
                previousModel,
                syncedModel: S.model,
                reason: 'storage-event'
            });
            log('State synced from another ChatGPT window', { previousModel, model: S.model });
        }
    }

    function installStorageSync() {
        window.addEventListener('storage', event => {
            if (!event.key || !event.key.startsWith(PREFIX)) return;
            if (event.key === storageKey('packet_log')) return;
            syncStateFromStorage();
        });
    }

    function clampPosition() {
        if (!host) return;
        const x = parseInt(host.style.left || '', 10);
        const y = parseInt(host.style.top || '', 10);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            ensureHostPosition(true);
            return;
        }

        setHostPosition(x, y, true);
    }

    function proportionalReposition(oldVW, oldVH) {
        const root = host;
        if (!root) return;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (root.style.left === '' && root.style.top === '') return;

        let x = parseInt(root.style.left, 10) || 0;
        let y = parseInt(root.style.top, 10) || 0;
        if (oldVW > 0 && oldVH > 0) {
            x = Math.round(x * (vw / oldVW));
            y = Math.round(y * (vh / oldVH));
        }

        x = Math.max(margin, Math.min(x, vw - BUTTON_SIZE - margin));
        y = Math.max(margin, Math.min(y, vh - BUTTON_SIZE - margin));

        root.style.left = `${x}px`;
        root.style.top = `${y}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        S.pos = { x, y };
        save('pos', S.pos);
    }

    function ensureDefaultPosition() {
        if (!host) return;
        if (S.pos && Number.isFinite(S.pos.x) && Number.isFinite(S.pos.y)) {
            setHostPosition(S.pos.x, S.pos.y, true);
        } else {
            setHostPosition(window.innerWidth - BUTTON_SIZE - 24, window.innerHeight - BUTTON_SIZE - 24, false);
        }
    }

    function bindEvents() {
        document.addEventListener('click', hideTooltip, true);

        const $ = id => document.getElementById(id);
        const root = host;
        const button = $('mi-b');
        const mainPanel = $('mi-p');

        const getLanguageOptions = () => [...(q('mi-lang-menu')?.querySelectorAll('.mi-lang-option') || [])];
        const focusLanguageOption = edge => requestAnimationFrame(() => {
            const options = getLanguageOptions();
            if (!options.length) return;
            const selectedIndex = options.findIndex(option => option.getAttribute('aria-selected') === 'true');
            const index = edge === 'last'
                ? options.length - 1
                : edge === 'first'
                ? 0
                : Math.max(0, selectedIndex);
            options[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            options[index].focus({ preventScroll: true });
        });
        const setLanguageMenuOpen = (open, focusEdge = '') => {
            const picker = q('mi-lang-picker');
            const trigger = q('mi-lang-trigger');
            const menu = q('mi-lang-menu');
            if (!picker || !trigger || !menu) return;
            if (open) positionLanguageMenu();
            picker.classList.toggle('open', open);
            menu.classList.toggle('show', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            menu.toggleAttribute('inert', !open);
            if (open && focusEdge) focusLanguageOption(focusEdge);
        };
        const selectLanguageOption = option => {
            if (!option?.dataset.lang) return;
            S.lang = option.dataset.lang;
            save('lang', S.lang);
            setLanguageMenuOpen(false);
            applyUiText();
            renderDropdown();
            renderRecent();
            updateUIState();
            schedulePanelFocus(q('mi-lang-trigger'));
        };

        const toggleMain = () => {
            S.on = !S.on;
            save('on', S.on ? '1' : '0');
            updateUIState();
        };

        $('mi-sw-main').onclick = toggleMain;
        $('mi-sw-effort').onclick = () => {
            S.effortOn = !S.effortOn;
            save('eo', S.effortOn ? '1' : '0');
            updateUIState();
        };
        $('mi-sw-debug').onclick = () => {
            S.debug = !S.debug;
            save('d', S.debug ? '1' : '0');
            if (!S.debug) clearDiagnosticArtifacts();
            updateUIState();
            log('Debug mode', S.debug ? 'on' : 'off');
        };
        q('mi-sw-privacy')?.addEventListener('click', () => {
            S.privacyOn = !S.privacyOn;
            save('pv', S.privacyOn ? '1' : '0');
            if (S.privacyOn) refreshPrivacyGeo(false);
            applyPrivacySpoof();
            syncAcceptLanguageRule();
            renderPrivacySettings();
            log('Privacy spoofing', S.privacyOn ? 'on' : 'off');
        });
        q('mi-privacy-refresh')?.addEventListener('click', () => refreshPrivacyGeo(true));

        for (const kind of ['tz', 'lang']) {
            const getOptions = () => [...(q(`mi-privacy-${kind}-menu`)?.querySelectorAll('.mi-lang-option') || [])];
            const focusOption = edge => {
                const options = getOptions();
                if (!options.length) return;
                const selected = options.find(option => option.classList.contains('active'));
                const index = edge === 'last'
                    ? options.length - 1
                    : edge === 'selected' ? Math.max(0, options.indexOf(selected)) : 0;
                options[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                options[index]?.focus({ preventScroll: true });
            };
            const openMenu = edge => {
                setPrivacySelectOpen(kind === 'tz' ? 'lang' : 'tz', false);
                positionPrivacySelectMenu(kind);
                setPrivacySelectOpen(kind, true);
                if (edge === 'first' || edge === 'last' || edge === 'selected') focusOption(edge);
            };
            q(`mi-privacy-${kind}-trigger`)?.addEventListener('click', () => {
                const picker = q(`mi-privacy-${kind}-picker`);
                const willOpen = !picker?.classList.contains('open');
                setPrivacySelectOpen('tz', false);
                setPrivacySelectOpen('lang', false);
                if (willOpen) openMenu('');
            });
            q(`mi-privacy-${kind}-trigger`)?.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setPrivacySelectOpen(kind, false);
                    return;
                }
                if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
                event.preventDefault();
                openMenu(event.key === 'ArrowUp' ? 'last' : 'selected');
            });
            q(`mi-privacy-${kind}-menu`)?.addEventListener('click', event => {
                const option = event.target.closest('.mi-lang-option');
                if (!option?.dataset.privacyValue) return;
                selectPrivacyOption(kind, option.dataset.privacyValue);
            });
            q(`mi-privacy-${kind}-menu`)?.addEventListener('keydown', event => {
                const options = getOptions();
                const option = event.target.closest('.mi-lang-option');
                const currentIndex = options.indexOf(option);
                if (event.key === 'Tab') {
                    event.preventDefault();
                    setPrivacySelectOpen(kind, false);
                    schedulePanelFocus(q(`mi-privacy-${kind}-trigger`));
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setPrivacySelectOpen(kind, false);
                    schedulePanelFocus(q(`mi-privacy-${kind}-trigger`));
                    return;
                }
                if ((event.key === 'Enter' || event.key === ' ') && option) {
                    event.preventDefault();
                    selectPrivacyOption(kind, option.dataset.privacyValue);
                    return;
                }
                let nextIndex = currentIndex;
                if (event.key === 'ArrowDown') nextIndex = (Math.max(0, currentIndex) + 1) % options.length;
                else if (event.key === 'ArrowUp') nextIndex = (Math.max(0, currentIndex) - 1 + options.length) % options.length;
                else if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = options.length - 1;
                else return;
                event.preventDefault();
                options[nextIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                options[nextIndex]?.focus({ preventScroll: true });
            });
        }

        $('mi-ref-btn').onclick = fetchModels;
        $('mi-calc').onclick = () => {
            animateContextRefresh();
            recalcTokens({ cheap: false });
        };
        q('mi-export-packets')?.addEventListener('click', exportPacketLog);
        q('mi-clear-diagnostics')?.addEventListener('click', resetDiagnostics);
        q('mi-diag-toggle')?.addEventListener('click', () => {
            S.diagOpen = !S.diagOpen;
            save('diag_open', S.diagOpen ? '1' : '0');
            updateDiagnostics();
        });

        $('mi-btn-set').onclick = event => {
            event.stopPropagation();
            closeDropdown(false);
            setLanguageMenuOpen(false);
            if (!mainPanel.classList.contains('show')) showPanel(mainPanel);
            setPanelView('settings');
        };
        $('mi-set-close').onclick = () => {
            setLanguageMenuOpen(false);
            setPanelView('main');
        };
        $('mi-backdrop').onclick = () => {
            closeDropdown(false);
            hidePanel(mainPanel);
        };

        const getDropdownOptions = () => [...$('mi-drop').querySelectorAll('.mi-opt:not([disabled])')];
        const focusDropdownOption = index => {
            const options = getDropdownOptions();
            if (!options.length) return;
            const normalized = (index + options.length) % options.length;
            options[normalized].focus({ preventScroll: true });
            options[normalized].scrollIntoView({ block: 'nearest' });
        };
        const focusDropdownEdge = edge => requestAnimationFrame(() => {
            const options = getDropdownOptions();
            if (!options.length) return;
            if (edge === 'selected') {
                const selectedIndex = options.findIndex(option => option.getAttribute('aria-selected') === 'true');
                focusDropdownOption(selectedIndex >= 0 ? selectedIndex : 0);
                return;
            }
            focusDropdownOption(edge === 'last' ? options.length - 1 : 0);
        });
        const selectDropdownItem = item => {
            if (!item) return;
            const id = item.dataset.id || '';
            closeDropdown(true);
            saveSelection(id);
            schedulePanelFocus($('mi-sel-btn'));
        };

        $('mi-sel-btn').onclick = event => {
            event.stopPropagation();
            if ($('mi-drop').classList.contains('show')) closeDropdown(true);
            else openDropdown();
        };
        $('mi-sel-btn').addEventListener('keydown', event => {
            if (event.key === 'Tab' && $('mi-drop').classList.contains('show')) {
                closeDropdown(false);
                return;
            }
            const edge = event.key === 'ArrowUp' || event.key === 'End'
                ? 'last'
                : event.key === 'ArrowDown'
                ? 'selected'
                : event.key === 'Home'
                ? 'first'
                : '';
            if (!edge) return;
            event.preventDefault();
            if (!$('mi-drop').classList.contains('show')) openDropdown();
            focusDropdownEdge(edge);
        });
        $('mi-drop').onclick = event => {
            if (event.target.closest('[data-action=toggle-offline]')) {
                event.preventDefault();
                event.stopPropagation();
                modelMenuOfflineExpanded = !modelMenuOfflineExpanded;
                dropdownRenderSignature = '';
                renderDropdown({ force: true, animateUpdate: true });
                requestAnimationFrame(() => $('mi-drop')?.querySelector('[data-action=toggle-offline]')?.focus({ preventScroll: true }));
                return;
            }
            if (event.target.closest('[data-action="clear-search"]')) {
                event.preventDefault();
                event.stopPropagation();
                modelMenuQuery = '';
                modelMenuAgentOnly = false;
                renderDropdown();
                requestAnimationFrame(() => $('mi-drop')?.querySelector('#mi-menu-search')?.focus());
                return;
            }
            const removeButton = event.target.closest('[data-action="remove-custom"]');
            if (removeButton) {
                event.preventDefault();
                event.stopPropagation();
                const removeButtons = [...$('mi-drop').querySelectorAll('[data-action="remove-custom"]')];
                const removeIndex = Math.max(0, removeButtons.indexOf(removeButton));
                if (removeCustomModel(removeButton.dataset.id || '')) {
                    requestAnimationFrame(() => {
                        const nextButtons = [...($('mi-drop')?.querySelectorAll('[data-action="remove-custom"]') || [])];
                        const nextTarget = nextButtons[Math.min(removeIndex, Math.max(0, nextButtons.length - 1))]
                            || $('mi-drop')?.querySelector('#mi-menu-search')
                            || $('mi-sel-btn');
                        nextTarget?.focus({ preventScroll: true });
                    });
                }
                return;
            }
            const item = event.target.closest('.mi-opt');
            if (!item) return;
            selectDropdownItem(item);
        };
        $('mi-drop').addEventListener('input', event => {
            if (event.target?.id !== 'mi-menu-search') return;
            modelMenuQuery = event.target.value || '';
            modelMenuAgentOnly = modelMenuQuery.trim().startsWith('/');
            scheduleDropdownFilterRender();
        });
        $('mi-drop').addEventListener('keydown', event => {
            const current = event.target.closest?.('.mi-opt');
            const options = getDropdownOptions();
            const currentIndex = current ? options.indexOf(current) : -1;
            if (event.key === 'Tab') {
                event.preventDefault();
                event.stopPropagation();
                closeDropdown(false);
                schedulePanelFocus(event.shiftKey ? $('mi-sel-btn') : $('mi-ref-btn'));
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeDropdown(true);
                schedulePanelFocus($('mi-sel-btn'));
                return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (!options.length) return;
                event.preventDefault();
                event.stopPropagation();
                const nextIndex = currentIndex < 0
                    ? (event.key === 'ArrowDown' ? 0 : options.length - 1)
                    : currentIndex + (event.key === 'ArrowDown' ? 1 : -1);
                focusDropdownOption(nextIndex);
                return;
            }
            if (current && (event.key === 'Home' || event.key === 'End')) {
                event.preventDefault();
                event.stopPropagation();
                focusDropdownOption(event.key === 'Home' ? 0 : options.length - 1);
                return;
            }
            if (current?.dataset.custom === 'true' && (event.key === 'Delete' || event.key === 'Backspace')) {
                event.preventDefault();
                event.stopPropagation();
                const deletedIndex = Math.max(0, currentIndex);
                if (removeCustomModel(current.dataset.id || '')) {
                    requestAnimationFrame(() => focusDropdownOption(Math.min(deletedIndex, Math.max(0, getDropdownOptions().length - 1))));
                }
                return;
            }
            if (event.key === 'Enter' || (current && event.key === ' ')) {
                const item = current || options[0];
                if (!item) return;
                event.preventDefault();
                event.stopPropagation();
                selectDropdownItem(item);
            }
        });

        const addCustomModel = () => {
            const input = $('mi-cu');
            const value = input?.value.trim();
            if (value === '/') {
                if (input) input.value = '';
                openWorkspaceAgentQuickMenu();
                return;
            }
            if (!value || isHiddenModelId(value) || S.custom.includes(value)) return;
            S.custom = [...S.custom, value];
            save('custom', S.custom);
            if (input) input.value = '';
            renderDropdown();
            renderRecent();
        };
        $('mi-add').onclick = addCustomModel;
        $('mi-cu').addEventListener('input', event => {
            if (String(event.target.value || '').trim() !== '/') return;
            event.target.value = '';
            openWorkspaceAgentQuickMenu();
        });
        $('mi-cu').onkeydown = event => {
            if (event.key === '/' && !event.currentTarget.value.trim()) {
                event.preventDefault();
                openWorkspaceAgentQuickMenu();
                return;
            }
            if (event.key === 'Enter') addCustomModel();
        };

        $('mi-chips').onclick = event => {
            const chip = event.target.closest('.mi-chip');
            if (!chip) return;
            const id = chip.dataset.id || '';
            saveSelection(id);
            const nextChip = [...(q('mi-chips')?.querySelectorAll('.mi-chip') || [])]
                .find(item => item.dataset.id === id);
            schedulePanelFocus(nextChip || q('mi-sel-btn'));
        };

        $('mi-grid-eff').onclick = event => {
            const option = event.target.closest('.mi-g-item');
            if (option && !option.disabled) {
                S.effort = option.dataset.e;
                save('e', S.effort);
                renderEffortGrid();
                schedulePanelFocus(q('mi-grid-eff')?.querySelector(`[data-e="${S.effort}"]`));
            }
        };
        const endEffortPress = () => q('mi-grid-eff')?.classList.remove('is-pressing');
        $('mi-grid-eff').addEventListener('pointerdown', event => {
            const option = event.target.closest('.mi-g-item');
            if (option && !option.disabled) q('mi-grid-eff')?.classList.add('is-pressing');
        }, { passive: true });
        $('mi-grid-eff').addEventListener('pointerup', endEffortPress, { passive: true });
        $('mi-grid-eff').addEventListener('pointercancel', endEffortPress, { passive: true });
        $('mi-grid-eff').addEventListener('lostpointercapture', endEffortPress, { passive: true });
        $('mi-grid-eff').addEventListener('keydown', event => {
            const option = event.target.closest('.mi-g-item');
            if (!option || option.disabled) return;
            const currentIndex = EFFORTS.indexOf(option.dataset.e);
            let nextIndex = currentIndex;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
            else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(EFFORTS.length - 1, currentIndex + 1);
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = EFFORTS.length - 1;
            else return;
            event.preventDefault();
            S.effort = EFFORTS[nextIndex];
            save('e', S.effort);
            renderEffortGrid();
            schedulePanelFocus(q('mi-grid-eff')?.querySelector(`[data-e="${S.effort}"]`));
        });

        $('mi-clrs').onclick = event => {
            const swatch = event.target.closest('.mi-clr');
            if (!swatch) return;
            const hex = swatch.dataset.c || swatch.dataset.color || '';
            applyColor(hex);
            if ($('mi-color-picker')) $('mi-color-picker').value = hex;
            if ($('mi-color-hex')) $('mi-color-hex').value = hex;
            schedulePanelFocus(q('mi-clrs')?.querySelector('.mi-clr.active'));
        };
        $('mi-clrs').addEventListener('keydown', event => {
            const swatch = event.target.closest('.mi-clr');
            if (!swatch) return;
            const swatches = [...q('mi-clrs').querySelectorAll('.mi-clr')];
            const currentIndex = swatches.indexOf(swatch);
            const columns = 5;
            let nextIndex = currentIndex;
            if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + swatches.length) % swatches.length;
            else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % swatches.length;
            else if (event.key === 'ArrowUp') nextIndex = (currentIndex - columns + swatches.length) % swatches.length;
            else if (event.key === 'ArrowDown') nextIndex = (currentIndex + columns) % swatches.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = swatches.length - 1;
            else return;
            event.preventDefault();
            const hex = swatches[nextIndex]?.dataset.color || '';
            applyColor(hex);
            if ($('mi-color-picker')) $('mi-color-picker').value = hex;
            if ($('mi-color-hex')) $('mi-color-hex').value = hex;
            schedulePanelFocus(q('mi-clrs')?.querySelector('.mi-clr.active'));
        });
        q('mi-color-picker')?.addEventListener('input', event => {
            const value = event.target.value;
            applyColor(value);
            if (q('mi-color-hex')) q('mi-color-hex').value = value;
        });
        q('mi-color-hex')?.addEventListener('input', event => {
            let value = String(event.target.value || '').trim();
            if (value && !value.startsWith('#')) value = `#${value}`;
            if (!normalizeHex(value)) return;
            applyColor(value);
            if (q('mi-color-picker')) q('mi-color-picker').value = value;
        });
        q('mi-lang-trigger')?.addEventListener('click', event => {
            event.stopPropagation();
            const picker = q('mi-lang-picker');
            if (!picker) return;
            setLanguageMenuOpen(!picker.classList.contains('open'));
        });
        q('mi-lang-trigger')?.addEventListener('keydown', event => {
            if (event.key === 'Tab' && q('mi-lang-picker')?.classList.contains('open')) {
                setLanguageMenuOpen(false);
                return;
            }
            const edge = event.key === 'ArrowUp' || event.key === 'End'
                ? 'last'
                : event.key === 'ArrowDown'
                ? 'selected'
                : event.key === 'Home'
                ? 'first'
                : '';
            if (!edge) return;
            event.preventDefault();
            setLanguageMenuOpen(true, edge);
        });
        q('mi-lang-menu')?.addEventListener('click', event => {
            const option = event.target.closest('.mi-lang-option');
            if (!option) return;
            selectLanguageOption(option);
        });
        q('mi-lang-menu')?.addEventListener('keydown', event => {
            const options = getLanguageOptions();
            const option = event.target.closest('.mi-lang-option');
            const currentIndex = options.indexOf(option);
            if (event.key === 'Tab') {
                event.preventDefault();
                setLanguageMenuOpen(false);
                schedulePanelFocus(event.shiftKey ? q('mi-lang-trigger') : q('mi-sw-debug'));
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setLanguageMenuOpen(false);
                schedulePanelFocus(q('mi-lang-trigger'));
                return;
            }
            if ((event.key === 'Enter' || event.key === ' ') && option) {
                event.preventDefault();
                selectLanguageOption(option);
                return;
            }
            let nextIndex = currentIndex;
            if (event.key === 'ArrowDown') nextIndex = (Math.max(0, currentIndex) + 1) % options.length;
            else if (event.key === 'ArrowUp') nextIndex = (Math.max(0, currentIndex) - 1 + options.length) % options.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = options.length - 1;
            else return;
            event.preventDefault();
            options[nextIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            options[nextIndex]?.focus({ preventScroll: true });
        });

        document.addEventListener('click', event => {
            const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
            const isWithin = element => Boolean(element && (path.includes(element) || element.contains(event.target)));
            if (!isWithin(q('mi-lang-picker')) && !isWithin(q('mi-lang-menu'))) setLanguageMenuOpen(false);
            for (const kind of ['tz', 'lang']) {
                const picker = q(`mi-privacy-${kind}-picker`);
                const menu = q(`mi-privacy-${kind}-menu`);
                if (privacySelectState[kind].open && !isWithin(picker) && !isWithin(menu)) setPrivacySelectOpen(kind, false);
            }
            if ($('mi-drop').classList.contains('show') && !isWithin($('mi-sel-wrap')) && !isWithin($('mi-drop'))) closeDropdown(true);
            if (mainPanel.classList.contains('show') && !isWithin(root)) {
                closeDropdown(false);
                hidePanel(mainPanel);
            }
        });
        document.addEventListener('keydown', event => {
            trapPanelFocus(event);
            if (event.defaultPrevented) return;
            if (event.altKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                togglePanel(mainPanel);
                return;
            }
            if (event.key !== 'Escape') return;

            if (q('mi-lang-picker')?.classList.contains('open')) {
                event.preventDefault();
                setLanguageMenuOpen(false);
                schedulePanelFocus(q('mi-lang-trigger'));
                return;
            }
            const openPrivacyKind = ['tz', 'lang'].find(kind => privacySelectState[kind].open);
            if (openPrivacyKind) {
                event.preventDefault();
                setPrivacySelectOpen(openPrivacyKind, false);
                schedulePanelFocus(q(`mi-privacy-${openPrivacyKind}-trigger`));
                return;
            }
            if ($('mi-drop').classList.contains('show')) {
                event.preventDefault();
                closeDropdown(false);
                schedulePanelFocus($('mi-sel-btn'));
                return;
            }
            if (mainPanel.classList.contains('show') && mainPanel.dataset.view === 'settings') {
                event.preventDefault();
                setPanelView('main');
                return;
            }
            if (mainPanel.classList.contains('show')) {
                event.preventDefault();
                hidePanel(mainPanel);
            }
        });

        let isDrag = false;
        let startX = 0;
        let startY = 0;
        let initLeft = 0;
        let initTop = 0;
        let dragX = 0;
        let dragY = 0;
        let dragFrame = 0;
        let activePointerId = null;
        let releasingPointerCapture = false;
        const paintDragFrame = () => {
            dragFrame = 0;
            if (isDrag && root) root.style.transform = `translate3d(${dragX}px, ${dragY}px, 0)`;
        };
        const resetDragVisual = () => {
            if (dragFrame) cancelAnimationFrame(dragFrame);
            dragFrame = 0;
            if (root) {
                root.style.transform = '';
                root.style.willChange = '';
            }
            button?.classList.remove('dragging');
        };
        const releaseActivePointer = pointerId => {
            if (!button?.hasPointerCapture?.(pointerId)) return;
            releasingPointerCapture = true;
            try {
                button.releasePointerCapture(pointerId);
            } finally {
                releasingPointerCapture = false;
            }
        };
        button?.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !root) return;
            isDrag = false;
            activePointerId = event.pointerId;
            dragX = 0;
            dragY = 0;
            startX = event.clientX;
            startY = event.clientY;
            button.setPointerCapture(event.pointerId);
            if (!mainPanel.classList.contains('show')) {
                button.classList.add('panel-primed');
                // Let the press paint first. Geometry/WAAPI priming is moved to the
                // next frame so the first pointer response never waits on layout.
                if (panelMotionPrimeFrame) cancelAnimationFrame(panelMotionPrimeFrame);
                panelMotionPrimeFrame = requestAnimationFrame(() => {
                    panelMotionPrimeFrame = 0;
                    if (activePointerId === event.pointerId && !mainPanel.classList.contains('show') && !isDrag) {
                        primePanelMotion(mainPanel);
                    }
                });
            }
        });
        button?.addEventListener('pointermove', event => {
            if (activePointerId !== event.pointerId || event.buttons !== 1) return;
            dragX = event.clientX - startX;
            dragY = event.clientY - startY;
            if (!isDrag && Math.hypot(dragX, dragY) > 5) {
                isDrag = true;
                const rect = root.getBoundingClientRect();
                initLeft = rect.left;
                initTop = rect.top;
                button.classList.remove('panel-primed');
                closeDropdown(false);
                hidePanel(mainPanel, { immediate: true });
                invalidatePanelMotionLayout(mainPanel);
                root.style.left = `${initLeft}px`;
                root.style.top = `${initTop}px`;
                root.style.right = 'auto';
                root.style.bottom = 'auto';
                root.style.willChange = 'transform';
                button.classList.add('dragging');
            }
            if (!isDrag || !root) return;
            if (!dragFrame) dragFrame = requestAnimationFrame(paintDragFrame);
        });
        button?.addEventListener('pointerup', event => {
            if (activePointerId !== event.pointerId) return;
            dragX = event.clientX - startX;
            dragY = event.clientY - startY;
            releaseActivePointer(event.pointerId);
            if (isDrag) {
                resetDragVisual();
                setHostPosition(initLeft + dragX, initTop + dragY, true);
                invalidatePanelMotionLayout(mainPanel);
                schedulePanelMotionPreparation(mainPanel);
                schedulePanelFirstPaintPreparation(mainPanel);
                suppressClick = true;
                window.setTimeout(() => { suppressClick = false; }, 120);
            } else {
                resetDragVisual();
                window.setTimeout(() => {
                    if (!mainPanel.classList.contains('show')) {
                        button.classList.remove('panel-primed');
                        mainPanel.classList.remove('is-motion-primed');
                    }
                }, 180);
            }
            isDrag = false;
            activePointerId = null;
        });
        button?.addEventListener('pointercancel', event => {
            releaseActivePointer(event.pointerId);
            resetDragVisual();
            button.classList.remove('panel-primed');
            mainPanel.classList.remove('is-motion-primed');
            isDrag = false;
            activePointerId = null;
        });
        button?.addEventListener('lostpointercapture', () => {
            if (releasingPointerCapture || activePointerId === null) return;
            if (isDrag) {
                resetDragVisual();
                setHostPosition(initLeft + dragX, initTop + dragY, true);
                invalidatePanelMotionLayout(mainPanel);
                schedulePanelMotionPreparation(mainPanel);
                schedulePanelFirstPaintPreparation(mainPanel);
            } else {
                resetDragVisual();
            }
            button.classList.remove('panel-primed');
            if (!mainPanel.classList.contains('show')) mainPanel.classList.remove('is-motion-primed');
            isDrag = false;
            activePointerId = null;
        });
        button?.addEventListener('click', event => {
            event.stopPropagation();
            if (suppressClick) {
                button.classList.remove('panel-primed');
                mainPanel.classList.remove('is-motion-primed');
                return;
            }
            closeDropdown(false);
            togglePanel(mainPanel);
        });
        button?.addEventListener('contextmenu', event => { event.preventDefault(); toggleMain(); });

        let prevVW = window.innerWidth;
        let prevVH = window.innerHeight;
        let resizeTimer = null;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                proportionalReposition(prevVW, prevVH);
                prevVW = window.innerWidth;
                prevVH = window.innerHeight;
                const panel = q('mi-p');
                const keepOpen = Boolean(panel?.classList.contains('show') && !panel.classList.contains('is-closing'));
                if (panel?.classList.contains('show')) clearPanelMotionAnimation(panel, keepOpen);
                invalidatePanelMotionLayout(panel);
                if (keepOpen) {
                    const geometry = preparePanelMotionLayout(panel);
                    preparePanelMotionAnimation(panel, geometry, PANEL_MOTION_DURATION);
                }
                else schedulePanelMotionPreparation(panel);
                schedulePanelFirstPaintPreparation(panel);
                if (q('mi-drop')?.classList.contains('show')) positionDropdown();
                if (q('mi-lang-menu')?.classList.contains('show')) positionLanguageMenu();
                for (const kind of ['tz', 'lang']) {
                    if (privacySelectState[kind].open) positionPrivacySelectMenu(kind);
                }
            }, 100);
        };
        window.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('resize', onResize);
    }

    function createUI() {
        if (host || !document.body) return;
        cleanupStaleUi();

        host = document.createElement('div');
        host.id = 'mi';
        host.innerHTML = `
<style>
@property --mi-motion-bridge-opacity {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}
@property --mi-motion-bridge-y {
    syntax: '<number>';
    inherits: false;
    initial-value: 8;
}
@property --mi-motion-bridge-scale {
    syntax: '<number>';
    inherits: false;
    initial-value: 0.36;
}
@property --mi-panel-bridge-opacity {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}
@property --mi-panel-bridge-scale {
    syntax: '<number>';
    inherits: false;
    initial-value: 0.68;
}
#mi {
    --mi-bg: #007aff;
    --mi-bg-rgb: 0, 122, 255;
    --mi-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif;
    --mi-font-mono: "SF Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --mi-radius-sm: 10px;
    --mi-radius-md: 14px;
    --mi-radius-lg: 18px;
    --mi-radius-xl: 24px;
    --mi-bg-primary: rgba(18, 20, 24, 0.94);
    --mi-bg-secondary: rgba(31, 34, 40, 0.92);
    --mi-bg-tertiary: rgba(255, 255, 255, 0.055);
    --mi-bg-elevated: rgba(43, 47, 55, 0.96);
    --mi-text-primary: #f5f5f7;
    --mi-text-secondary: rgba(235, 235, 245, 0.68);
    --mi-text-tertiary: rgba(235, 235, 245, 0.46);
    --mi-text-placeholder: rgba(235, 235, 245, 0.54);
    --mi-separator: rgba(255, 255, 255, 0.08);
    --mi-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
    --mi-shadow-glow: 0 0 40px -10px var(--mi-bg), 0 8px 32px -8px rgba(0, 0, 0, 0.3);
    --mi-shadow-float: 0 32px 64px rgba(0, 0, 0, 0.4), 0 16px 32px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(255,255,255,0.1);
    --mi-ease: cubic-bezier(0.4, 0, 0.2, 1);
    --mi-ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --mi-ease-spring: cubic-bezier(0.5, 1.25, 0.75, 1.25);
    --mi-ease-fluid: cubic-bezier(0.32, 0.72, 0, 1);
    --mi-ease-liquid: cubic-bezier(0.22, 1.22, 0.36, 1);
    --mi-ease-panel-close: cubic-bezier(0.4, 0, 1, 1);
    --mi-ease-anchor: cubic-bezier(0.18, 1.08, 0.34, 1);
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    z-index: 99999;
    font-family: var(--mi-font);
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    pointer-events: none;
}
#mi::before {
    content: '';
    position: absolute;
    right: 11px;
    bottom: 18px;
    width: 34px;
    height: 46px;
    border-radius: 999px;
    pointer-events: none;
    z-index: 2;
    opacity: var(--mi-motion-bridge-opacity, 0);
    transform: translate3d(0, calc(var(--mi-motion-bridge-y, 8) * 1px), 0) scaleY(var(--mi-motion-bridge-scale, 0.36));
    transform-origin: bottom center;
    background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.10) 48%, rgba(var(--mi-bg-rgb),0.10));
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px rgba(255,255,255,0.035);
    transition: none;
}
#mi:has(#mi-p[data-placement="below"])::before {
    top: 18px;
    bottom: auto;
    transform-origin: top center;
}
#mi:has(#mi-p[data-placement="detached"])::before {
    display: none;
}
#mi * { box-sizing: border-box; }
:where(#mi) button,
:where(#mi) input {
    font: inherit;
    line-height: normal;
    letter-spacing: normal;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
}
:where(#mi) button {
    display: inline-block;
    width: auto;
    height: auto;
    min-width: 0;
    min-height: 0;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    appearance: none;
    background: none;
    color: inherit;
    box-shadow: none;
    filter: none;
    opacity: 1;
    overflow: visible;
    text-align: inherit;
    transform: none;
    vertical-align: middle;
    white-space: normal;
    -webkit-tap-highlight-color: transparent;
}
:where(#mi) input {
    display: inline-block;
    width: auto;
    height: auto;
    min-width: 0;
    min-height: 0;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    appearance: none;
    background: none;
    color: inherit;
    box-shadow: none;
    filter: none;
    opacity: 1;
    overflow: visible;
    text-align: inherit;
    transform: none;
    vertical-align: middle;
}
#mi :is(button, input, a):focus-visible {
    outline: 2px solid color-mix(in srgb, var(--mi-bg) 72%, #ffffff);
    outline-offset: 2px;
}
.mi-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
#mi-backdrop {
    position: fixed;
    inset: 0;
    background:
        radial-gradient(110% 74% at 50% -10%, rgba(255,255,255,0.045), transparent 58%),
        linear-gradient(180deg, rgba(3, 5, 8, 0.16), rgba(3, 5, 8, 0.30));
    backdrop-filter: blur(4px) saturate(116%) brightness(0.94);
    -webkit-backdrop-filter: blur(4px) saturate(116%) brightness(0.94);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    z-index: 1;
    backface-visibility: hidden;
    transform: translateZ(0);
    transition: opacity 0.28s cubic-bezier(0.3, 0, 0.3, 1), visibility 0s linear 0.28s;
}
#mi-backdrop.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 0.20s cubic-bezier(0.16, 0.8, 0.2, 1), visibility 0s linear 0s;
}
#mi-backdrop.is-first-paint-warmup,
#mi-backdrop.is-first-paint-ready {
    visibility: visible;
    opacity: 0.001;
    pointer-events: none;
}
#mi-backdrop.is-motion-primed,
#mi-backdrop.is-motion-active {
    will-change: opacity;
    backface-visibility: hidden;
}
#mi-b {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
    appearance: none;
    padding: 0;
    color: #fff;
    background:
        radial-gradient(circle at 32% 24%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.025) 34%, transparent 48%),
        linear-gradient(150deg, rgba(41, 44, 51, 0.98) 0%, rgba(24, 26, 31, 0.99) 58%, rgba(15, 17, 21, 0.99) 100%);
    box-shadow: 0 14px 34px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.5);
    transition: transform 0.24s var(--mi-ease-anchor), box-shadow 0.26s var(--mi-ease-fluid), border-color 0.2s var(--mi-ease);
    touch-action: none;
    border: 1px solid rgba(255,255,255,0.13);
    z-index: 3;
}
#mi-b::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: inset 0 1px 4px rgba(255,255,255,0.07), inset 0 -3px 7px rgba(0,0,0,0.13);
    pointer-events: none;
    transition: border-color 0.36s var(--mi-ease), box-shadow 0.42s var(--mi-ease);
}
#mi-b::before {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 1px solid rgba(var(--mi-bg-rgb), 0.34);
    opacity: 0;
    z-index: -1;
    transform: scale(0.88);
    transition: opacity 0.42s var(--mi-ease), transform 0.52s var(--mi-ease-fluid);
}
#mi-b.panel-open {
    transform: translate3d(0,-2px,0) scale(0.972);
    border-color: rgba(var(--mi-bg-rgb), 0.42);
    box-shadow: 0 18px 40px rgba(0,0,0,0.36), 0 0 0 5px rgba(var(--mi-bg-rgb), 0.11), 0 0 22px rgba(var(--mi-bg-rgb), 0.16), inset 0 1px 0 rgba(255,255,255,0.2);
}
#mi-b.panel-open::before {
    opacity: 0.56;
    transform: scale(1.08);
}
#mi-b.panel-open::after {
    border-color: rgba(255,255,255,0.22);
    box-shadow: inset 0 1px 5px rgba(255,255,255,0.11), inset 0 -3px 8px rgba(0,0,0,0.16);
}
#mi-b.panel-primed,
#mi-b:active:not(.dragging) {
    transform: translate3d(0, 0.5px, 0) scale(0.968);
    transition: transform 0.10s cubic-bezier(0.2, 0.82, 0.2, 1), box-shadow 0.10s var(--mi-ease);
}
#mi-b.panel-primed::before {
    opacity: 0.34;
    transform: scale(0.96);
    transition-duration: 0.12s;
}
#mi-b.panel-primed,
#mi-b.is-motion-active { will-change: transform; }
#mi-b.off {
    background: linear-gradient(135deg, rgba(100,100,105,0.9) 0%, rgba(70,70,75,0.9) 100%);
    box-shadow: var(--mi-shadow-sm);
}
#mi-b.is-route-mismatch {
    border-color: rgba(239,68,68,0.74);
    box-shadow: 0 14px 34px rgba(0,0,0,0.32), 0 0 0 4px rgba(239,68,68,0.12), 0 0 24px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.16);
}
#mi-b.is-route-mismatch::before {
    border-color: rgba(239,68,68,0.62);
}
#mi-b.is-route-mismatch::after {
    border-color: rgba(255,120,120,0.3);
}
#mi-b.dragging {
    transform: scale(1.055);
    box-shadow: 0 22px 48px rgba(0,0,0,0.42), 0 0 0 7px rgba(var(--mi-bg-rgb), 0.12);
    cursor: grabbing;
}
#mi-ring-wrap {
    position: absolute;
    top: -5px;
    left: -5px;
    width: 64px;
    height: 64px;
    pointer-events: none;
    transition: transform 0.52s var(--mi-ease-fluid), opacity 0.34s var(--mi-ease);
}
#mi-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
#mi-ring-bg, #mi-ring-fg { fill: none; stroke-width: 2.5; }
#mi-ring-bg { stroke: rgba(255,255,255,0.06); }
#mi-ring-fg {
    stroke: var(--mi-bg);
    stroke-linecap: round;
    transition: stroke 0.3s, stroke-dashoffset 0.5s var(--mi-ease), filter 0.3s;
    filter: drop-shadow(0 0 3px var(--mi-bg));
}
#mi-b.is-route-mismatch #mi-ring-fg {
    stroke: #ef4444;
    filter: drop-shadow(0 0 4px #ef4444);
}
#mi-b .icon {
    width: 34px;
    height: 34px;
    overflow: visible;
    color: #fff;
    filter: drop-shadow(0 3px 6px rgba(0,0,0,0.28));
    transform-box: view-box;
    transform-origin: center;
    transform: rotate(0deg) scale(1);
    transition: transform 0.52s var(--mi-ease-fluid), filter 0.34s var(--mi-ease), color 0.24s var(--mi-ease);
}
#mi-b.is-route-mismatch .icon {
    color: #ff6b6b;
    filter: drop-shadow(0 3px 6px rgba(0,0,0,0.28)) drop-shadow(0 0 8px rgba(239,68,68,0.62));
}
#mi-b.is-route-mismatch .mi-brand-pupil {
    fill: #ff6b6b;
    filter: drop-shadow(0 0 6px rgba(239,68,68,0.72));
}
#mi-b .mi-brand-orbit-group,
#mi-b .mi-brand-core {
    transform-box: view-box;
    transform-origin: center;
    transform: rotate(0deg);
    transition: none;
}
#mi-b .mi-brand-orbit {
    fill: none;
    stroke: currentColor;
    stroke-width: 4.5;
    stroke-linecap: round;
    opacity: 0.94;
}
#mi-b .mi-brand-node {
    fill: currentColor;
}
#mi-b .mi-brand-lens {
    fill: none;
    stroke: currentColor;
    stroke-width: 3.2;
    stroke-linejoin: round;
}
#mi-b .mi-brand-pupil {
    fill: color-mix(in srgb, var(--mi-bg) 72%, #ffffff);
    filter: drop-shadow(0 0 5px rgba(var(--mi-bg-rgb), 0.52));
}
#mi-b .mi-brand-glint {
    fill: #ffffff;
}
#mi-b.panel-open #mi-ring-wrap { transform: scale(1.045); opacity: 0.94; }
#mi-b.panel-open .icon { transform: scale(0.985); }
#mi-b.panel-open .mi-brand-orbit-group { transform: rotate(var(--mi-orbit-open-angle, 224deg)) scale(1.012); }
#mi-b.panel-open .mi-brand-core { transform: rotate(var(--mi-core-open-angle, -202deg)) scale(1.016); }
#mi-b.panel-open.is-motion-active:not(.is-closing) .mi-brand-orbit-group {
    transition: transform 0.60s cubic-bezier(0.26, 0.08, 0.18, 1);
}
#mi-b.panel-open.is-motion-active:not(.is-closing) .mi-brand-core {
    transition: transform 0.56s cubic-bezier(0.28, 0.06, 0.18, 1);
}
#mi-b.is-closing .mi-brand-orbit-group {
    transform: rotate(var(--mi-orbit-close-angle, 360deg)) scale(1);
    transition: transform 0.34s var(--mi-ease-panel-close);
}
#mi-b.is-closing .mi-brand-core {
    transform: rotate(var(--mi-core-close-angle, -360deg)) scale(1);
    transition: transform 0.32s var(--mi-ease-panel-close);
}
#mi-b.is-motion-active .mi-brand-orbit-group,
#mi-b.is-motion-active .mi-brand-core {
    will-change: transform;
}
#mi-n {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ff453a 100%);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: none;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--mi-bg-primary);
    box-shadow: 0 4px 12px rgba(255,69,58,0.5), 0 0 20px rgba(255,69,58,0.3);
}
#mi-model-label {
    position: absolute;
    bottom: -22px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 120px;
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--mi-bg-secondary);
    color: var(--mi-text-primary);
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: var(--mi-shadow-sm);
    opacity: 0;
    transition: opacity 0.25s var(--mi-ease), bottom 0.25s var(--mi-ease-spring);
}
#mi-b:hover #mi-model-label {
    opacity: 1;
    bottom: -30px;
}
#mi-b.panel-open #mi-model-label {
    opacity: 0;
    bottom: -22px;
    pointer-events: none;
}
#mi-p {
    position: absolute;
    bottom: 72px;
    right: 0;
    width: 368px;
    max-height: var(--mi-panel-available-height, min(680px, calc(100vh - 96px)));
    overflow: visible;
    border-radius: 22px;
    opacity: 0;
    transform: none;
    transform-origin: calc(100% - 24px) calc(100% - 24px);
    backface-visibility: hidden;
    pointer-events: none;
    visibility: hidden;
    z-index: 2;
    isolation: isolate;
    contain: layout style;
    transition: none;
}
#mi-p[data-placement="detached"] {
    z-index: 2;
}
#mi-p::before {
    content: '';
    position: absolute;
    left: calc(var(--mi-panel-anchor-x, 340px) - 22px);
    top: calc(var(--mi-panel-anchor-y, 650px) - 10px);
    width: 44px;
    height: 20px;
    border-radius: 999px;
    pointer-events: none;
    z-index: 2;
    opacity: var(--mi-panel-bridge-opacity, 0);
    transform: scale(var(--mi-panel-bridge-scale, 0.68));
    transform-origin: center;
    background: radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(var(--mi-bg-rgb),0.07) 46%, transparent 76%);
    transition: none;
}
#mi-p::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 4;
    opacity: var(--mi-panel-rim-opacity, 0);
    transform: scale3d(var(--mi-panel-rim-scale, 0.72), var(--mi-panel-rim-scale, 0.72), 1);
    transform-origin: var(--mi-panel-anchor-x, calc(100% - 24px)) var(--mi-panel-anchor-y, calc(100% - 24px));
    background:
        radial-gradient(96px 84px at var(--mi-panel-anchor-x, calc(100% - 24px)) var(--mi-panel-anchor-y, calc(100% - 24px)), rgba(255,255,255,0.20), transparent 70%),
        linear-gradient(180deg, rgba(255,255,255,0.10), transparent 24%, transparent 72%, rgba(0,0,0,0.08));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 0 18px rgba(255,255,255,0.055);
    mix-blend-mode: screen;
    transition: none;
}
#mi-p.show:not(.is-motion-active)::before {
    opacity: 0;
    transform: scale(0.82);
}
#mi-p.show:not(.is-motion-active)::after {
    opacity: 0;
    transform: scale(1);
}
.mi-panel-surface {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: inherit;
    background:
        radial-gradient(118% 86% at 10% -12%, rgba(255,255,255,0.18), transparent 47%),
        radial-gradient(74% 54% at 100% 0%, rgba(var(--mi-bg-rgb),0.15), transparent 67%),
        linear-gradient(180deg, rgba(37, 42, 51, 0.56) 0%, rgba(13, 16, 23, 0.66) 100%);
    backdrop-filter: blur(18px) saturate(162%) brightness(1.07);
    -webkit-backdrop-filter: blur(18px) saturate(162%) brightness(1.07);
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 36px 84px rgba(0,0,0,0.42), 0 12px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.045);
    backface-visibility: hidden;
    transform: translateZ(0);
    isolation: isolate;
    contain: layout paint style;
}
.mi-panel-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 5;
    border-radius: inherit;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.20), inset 1px 0 0 rgba(255,255,255,0.045), inset -1px 0 0 rgba(0,0,0,0.08), inset 0 -1px 0 rgba(255,255,255,0.035);
    pointer-events: none;
}
#mi-p.show {
    opacity: 1;
    transform: none;
    pointer-events: auto;
    visibility: visible;
    transition: none;
}
#mi-p.is-first-paint-warmup {
    visibility: visible !important;
    opacity: 0.001 !important;
    transform: translate3d(0, 0, 0) !important;
    pointer-events: none !important;
    will-change: transform, opacity;
}
#mi-p.is-first-paint-ready {
    visibility: visible;
    pointer-events: none;
    will-change: transform, opacity;
}
#mi-p.is-motion-primed,
#mi-p.is-motion-active {
    will-change: transform, opacity;
}
#mi-p.is-motion-primed > .mi-panel-surface,
#mi-p.is-motion-active > .mi-panel-surface {
    will-change: transform;
}
#mi-p.show.is-closing {
    pointer-events: none;
}
#mi-p:not(.show) .mi-view-stack {
    opacity: 0;
    transform: translate3d(0, var(--mi-panel-content-shift-y, 8px), 0);
    transition: none;
}
#mi-p:not(.show) .mi-panel-view {
    transition: none;
}
.mi-view-stack {
    position: relative;
    isolation: isolate;
    height: min(680px, var(--mi-panel-available-height, calc(100vh - 96px)));
    max-height: var(--mi-panel-available-height, calc(100vh - 96px));
    opacity: 1;
    transform: translate3d(0, 0, 0);
    transform-origin: var(--mi-panel-anchor-x, calc(100% - 28px)) var(--mi-panel-anchor-y, calc(100% - 28px));
    transition: none;
}
#mi-p.is-first-paint-warmup .mi-view-stack {
    opacity: 1 !important;
    transform: translate3d(0, 0, 0) !important;
    transition: none !important;
}
#mi-p.show.is-opening .mi-view-stack {
    opacity: 1;
    transform: translate3d(0, 0, 0);
}
#mi-p.show.is-closing .mi-view-stack {
    opacity: 1;
    transform: translate3d(0, 0, 0);
}
#mi-p.is-motion-active .mi-view-stack {
    will-change: opacity, transform;
}
.mi-view-stack::before {
    content: '';
    position: absolute;
    inset: 1px;
    z-index: 0;
    border-radius: 20px;
    pointer-events: none;
    background:
        radial-gradient(130% 72% at 9% -12%, rgba(255,255,255,0.13), transparent 46%),
        linear-gradient(112deg, rgba(255,255,255,0.07) 0%, transparent 18%, transparent 68%, rgba(255,255,255,0.035) 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.065), inset 0 -24px 44px rgba(0,0,0,0.045);
}
#mi-p[data-view="settings"] .mi-view-stack {
    height: min(476px, var(--mi-panel-available-height, calc(100vh - 96px)));
}
.mi-panel-view {
    position: absolute;
    inset: 0;
    min-width: 0;
    min-height: 0;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    z-index: 1;
    transition: opacity 0.16s var(--mi-ease-fluid), transform 0.26s var(--mi-ease-fluid), visibility 0s linear 0.2s;
}
.mi-panel-view.mi-view-transitioning {
    visibility: visible !important;
    pointer-events: none !important;
    will-change: transform, opacity, clip-path;
    transition: none !important;
}
#mi-main-view {
    display: flex;
    flex-direction: column;
    transform: translate3d(-24px, 0, 0) scale(0.99);
}
#mi-set {
    display: flex;
    flex-direction: column;
    padding: 16px 18px 18px;
    overflow-y: auto;
    scrollbar-gutter: stable;
    transform: translate3d(28px, 0, 0) scale(0.99);
}
#mi-p[data-view="main"] #mi-main-view,
#mi-p[data-view="settings"] #mi-set {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    pointer-events: auto;
    visibility: visible;
    transition: opacity 0.22s var(--mi-ease-fluid), transform 0.34s var(--mi-ease-fluid), visibility 0s linear 0s;
}
.mi-head {
    padding: 18px 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid transparent;
    background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
    position: relative;
}
.mi-head::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
}
.mi-head h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
}
.mi-head h3::before {
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--mi-bg) 0%, color-mix(in srgb, var(--mi-bg) 70%, #fff) 100%);
    box-shadow: 0 0 12px var(--mi-bg), 0 0 4px var(--mi-bg);
}
.mi-set-head {
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 32px;
    margin: 0 2px 12px;
}
.mi-set-head h4 { margin: 0; font-size: 15px; color: var(--mi-text-primary); font-weight: 600; }
.mi-set-spacer { width: 28px; height: 28px; }
.mi-status {
    font-size: 13px;
    color: var(--mi-text-secondary);
    max-width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
    font-weight: 500;
}
.mi-body {
    flex: 1;
    min-height: 0;
    padding: 12px 18px 18px;
    overflow-y: auto;
    scrollbar-gutter: stable;
}
.mi-body,
#mi-drop,
#mi-set,
.mi-diag-panel {
    scrollbar-width: thin;
    scrollbar-color: rgba(235,235,245,0.18) transparent;
}
.mi-body::-webkit-scrollbar,
#mi-drop::-webkit-scrollbar,
#mi-set::-webkit-scrollbar,
.mi-diag-panel::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.mi-body::-webkit-scrollbar-track,
#mi-drop::-webkit-scrollbar-track,
#mi-set::-webkit-scrollbar-track,
.mi-diag-panel::-webkit-scrollbar-track {
    background: transparent;
}
.mi-body::-webkit-scrollbar-thumb,
#mi-drop::-webkit-scrollbar-thumb,
#mi-set::-webkit-scrollbar-thumb,
.mi-diag-panel::-webkit-scrollbar-thumb {
    min-height: 38px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: rgba(235,235,245,0.18);
    background-clip: padding-box;
}
.mi-body::-webkit-scrollbar-thumb:hover,
#mi-drop::-webkit-scrollbar-thumb:hover,
#mi-set::-webkit-scrollbar-thumb:hover,
.mi-diag-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(235,235,245,0.32);
    background-clip: padding-box;
}
.mi-body::-webkit-scrollbar-button,
#mi-drop::-webkit-scrollbar-button,
#mi-set::-webkit-scrollbar-button,
.mi-diag-panel::-webkit-scrollbar-button {
    width: 0;
    height: 0;
    display: none;
}
.mi-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 14px 4px 12px;
    min-height: 44px;
    gap: 12px;
}
.mi-lbl {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.2px;
    min-width: 0;
}
.mi-lbl em {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 7px;
    font-size: 12px;
    color: var(--mi-text-secondary);
    font-style: normal;
    margin-top: 2px;
    font-weight: 400;
}
.mi-toggle-state {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: rgba(235,235,245,0.58);
    font-size: 11px;
    font-weight: 720;
    white-space: nowrap;
}
.mi-glass-defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
}
.mi-toggle-state::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(235,235,245,0.34);
    box-shadow: 0 0 0 2px rgba(255,255,255,0.035);
}
.mi-toggle-state.is-on {
    color: color-mix(in srgb, var(--mi-bg) 76%, #ffffff);
}
.mi-toggle-state.is-on::before {
    background: color-mix(in srgb, var(--mi-bg) 82%, #ffffff);
    box-shadow: 0 0 8px rgba(var(--mi-bg-rgb),0.52);
}
.mi-sw {
    width: 52px;
    height: 32px;
    background:
        linear-gradient(180deg, rgba(112,115,124,0.42) 0%, rgba(63,66,74,0.62) 100%),
        rgba(44,46,52,0.94);
    border-radius: 16px;
    position: relative;
    cursor: pointer;
    transition: background 0.22s var(--mi-ease), border-color 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease);
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.115);
}
.mi-sw::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255,255,255,0.13), transparent 46%);
    opacity: 0.36;
    pointer-events: none;
}
.mi-sw::after {
    content: "";
    position: absolute;
    top: 2.5px;
    left: 2.5px;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background:
        radial-gradient(circle at 34% 20%, #ffffff 0%, #fbfbfc 34%, #eceef2 100%);
    box-shadow: 0 3px 8px rgba(0,0,0,0.36), 0 1px 2px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95);
    transform: translate3d(0,0,0);
    transform-origin: left center;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s var(--mi-ease);
}
.mi-sw.on {
    background:
        linear-gradient(180deg, color-mix(in srgb, var(--mi-bg) 72%, #ffffff) 0%, var(--mi-bg) 58%, color-mix(in srgb, var(--mi-bg) 78%, #000000) 100%);
    border-color: rgba(var(--mi-bg-rgb),0.74);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -2px 4px rgba(0,0,0,0.16), 0 0 14px rgba(var(--mi-bg-rgb),0.18);
}
.mi-sw.on::before { opacity: 0.62; }
.mi-sw.on::after {
    transform: translate3d(22px,0,0);
    transform-origin: right center;
}
.mi-sw:active::after { transform: translate3d(0,0,0) scaleX(1.08) scaleY(0.96); }
.mi-sw.on:active::after { transform: translate3d(22px,0,0) scaleX(1.08) scaleY(0.96); }
.mi-sw-compact {
    flex: 0 0 52px;
}
#mi-sel-wrap { margin: 0 4px 16px; position: relative; }
#mi-sel-btn {
    width: 100%;
    min-height: 50px;
    padding: 0 18px 0 16px;
    background:
        radial-gradient(100% 160% at 0% 0%, rgba(255,255,255,0.075), transparent 44%),
        linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.032) 100%);
    border-radius: 15px;
    border: 1px solid rgba(255,255,255,0.105);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px;
    align-items: center;
    column-gap: 12px;
    cursor: pointer;
    transition: transform 0.22s var(--mi-ease-fluid), border-color 0.22s var(--mi-ease), background 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease);
    font-size: 15px;
    color: var(--mi-text-primary);
    overflow: hidden;
    position: relative;
    isolation: isolate;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.065), 0 8px 20px rgba(0,0,0,0.09);
}
#mi-sel-btn:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.18);
    background:
        radial-gradient(100% 160% at 0% 0%, rgba(255,255,255,0.095), transparent 44%),
        linear-gradient(180deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.04) 100%);
}
#mi-sel-txt {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    position: relative;
    z-index: 2;
}
#mi-sel-btn > .mi-select-chevron {
    position: relative;
    z-index: 2;
    justify-self: center;
    display: grid;
    place-items: center;
    width: 24px;
    min-width: 24px;
    max-width: 24px;
    height: 24px;
    min-height: 24px;
    max-height: 24px;
    margin: 0;
    padding: 0;
    color: rgba(235,235,245,0.78);
    overflow: visible;
    pointer-events: none;
    transition: color 0.18s var(--mi-ease);
}
#mi-sel-btn > .mi-select-chevron > svg {
    display: block;
    width: 18px;
    min-width: 18px;
    max-width: 18px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: visible;
    transform: translate3d(0,0,0);
    transform-origin: center;
    transition: transform 0.22s var(--mi-ease-fluid);
}
#mi-sel-btn > .mi-select-chevron > svg > path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    shape-rendering: geometricPrecision;
}
#mi-sel-wrap.open #mi-sel-btn > .mi-select-chevron {
    color: rgba(255,255,255,0.92);
}
#mi-sel-wrap.open #mi-sel-btn > .mi-select-chevron > svg {
    transform: rotate(180deg);
}
#mi-sel-btn::before {
    content: '';
    position: absolute;
    top: -18%;
    bottom: -18%;
    left: -34%;
    width: 28%;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.045) 82%, transparent 100%);
    filter: blur(0.35px);
    transform: translate3d(0,0,0);
}
#mi-sel-btn.is-confirmed::before {
    animation: miModelGlassSweep 0.64s cubic-bezier(0.22, 1, 0.36, 1) 1 both;
}
#mi-drop {
    position: absolute;
    top: 0;
    left: 18px;
    right: auto;
    width: calc(100% - 36px);
    max-height: min(520px, 58vh);
    overflow: auto;
    padding: 8px;
    border-radius: 18px;
    background:
        radial-gradient(110% 74% at 12% -10%, rgba(255,255,255,0.16), transparent 50%),
        radial-gradient(100% 88% at 100% 108%, rgba(var(--mi-bg-rgb),0.11), transparent 62%),
        linear-gradient(180deg, rgba(34,38,46,0.992), rgba(11,14,20,0.996));
    backdrop-filter: blur(16px) saturate(145%) brightness(1.045);
    -webkit-backdrop-filter: blur(16px) saturate(145%) brightness(1.045);
    border: 1px solid rgba(255,255,255,0.20);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.14);
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
    pointer-events: none;
    visibility: hidden;
    z-index: 100;
    isolation: isolate;
    contain: layout paint style;
    will-change: transform, opacity;
    transition: none;
}
#mi-drop::before,
#mi-drop::after {
    content: '';
    position: absolute;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
}
#mi-drop::before {
    inset: 0;
    background:
        linear-gradient(108deg, rgba(255,255,255,0.08), transparent 24%, transparent 72%, rgba(255,255,255,0.035)),
        radial-gradient(90% 64% at 50% 0%, rgba(255,255,255,0.06), transparent 72%);
}
#mi-drop::after {
    display: none;
}
#mi-drop > * { position: relative; z-index: 1; }
#mi-drop[data-placement="above"] { transform: translateY(8px) scale(0.985); }
#mi-drop[data-placement="overlay"] { transform: scale(0.985); }
#mi-drop.show {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    visibility: visible;
    transition: none;
}
#mi-drop.is-closing {
    pointer-events: none;
}
#mi-drop.is-cloth-motion {
    will-change: transform, opacity;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}
#mi-drop[data-compact="true"] {
    padding: 6px;
    border-radius: 14px;
}
#mi-drop[data-compact="true"] .mi-menu-search {
    gap: 0;
    margin-bottom: 5px;
    padding: 4px;
    border-radius: 12px;
}
#mi-drop[data-compact="true"] .mi-menu-search-head,
#mi-drop[data-compact="true"] .mi-menu-search-hint {
    display: none;
}
#mi-drop[data-compact="true"] .mi-menu-search-box {
    min-height: 36px;
    border-radius: 9px;
}
#mi-drop[data-compact="true"] .mi-menu-options {
    gap: 5px;
}
#mi-drop[data-compact="true"] .mi-opt-grp,
#mi-drop[data-compact="true"] .mi-family-head {
    display: none;
}
#mi-drop[data-compact="true"] .mi-menu-section,
#mi-drop[data-compact="true"] .mi-family {
    gap: 3px;
}
#mi-drop[data-compact="true"] .mi-family {
    padding: 2px;
    border-radius: 10px;
}
#mi-drop[data-compact="true"] .mi-opt {
    min-height: 40px;
    padding: 7px 9px;
}
#mi-drop[data-compact="true"] .mi-opt .sub,
#mi-drop[data-compact="true"] .mi-opt .meta {
    display: none;
}
#mi-drop[data-compact="true"] .mi-agent-section-bottom {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
}
.mi-menu-options {
    display: grid;
    gap: 6px;
    padding: 0 1px 4px;
}
.mi-menu-search {
    position: sticky;
    top: 0;
    z-index: 3;
    display: grid;
    gap: 0;
    margin: 0 0 8px;
    padding: 5px;
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.08);
}
.mi-menu-search:focus-within {
    border-color: rgba(var(--mi-bg-rgb), 0.54);
    box-shadow: 0 0 0 1px rgba(var(--mi-bg-rgb), 0.17), 0 8px 20px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.12);
}
.mi-menu-search-head {
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}
.mi-menu-search-title {
    color: rgba(255,255,255,0.94);
    font-size: 12px;
    font-weight: 820;
    letter-spacing: -0.01em;
}
.mi-menu-search-mode {
    min-width: 0;
    color: rgba(235,235,245,0.52);
    font-size: 10px;
    font-weight: 700;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mi-menu-search.agent-mode .mi-menu-search-mode {
    color: rgba(134, 239, 172, 0.92);
}
.mi-menu-search-box {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 7px 0 6px;
    border-radius: 12px;
    background: rgba(7, 9, 13, 0.28);
    border: 1px solid rgba(255,255,255,0.085);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
    transition: border-color 0.18s var(--mi-ease), background 0.18s var(--mi-ease), box-shadow 0.18s var(--mi-ease);
}
.mi-menu-search:focus-within .mi-menu-search-box {
    background: rgba(7, 9, 13, 0.34);
    border-color: rgba(var(--mi-bg-rgb), 0.52);
    box-shadow: inset 0 0 0 1px rgba(var(--mi-bg-rgb), 0.13), 0 0 0 3px rgba(var(--mi-bg-rgb),0.055);
}
.mi-menu-search-icon {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(var(--mi-bg-rgb),0.13));
    border: 1px solid rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.90);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
}
.mi-menu-search-icon svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
}
#mi-menu-search {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--mi-text-primary);
    font: 720 14px/1.2 var(--mi-font);
}
#mi-menu-search::placeholder { color: rgba(235,235,245,0.52); }
.mi-menu-search-clear {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: rgba(255,255,255,0.07);
    color: rgba(235,235,245,0.62);
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    opacity: 0;
    transform: scale(0.86);
    pointer-events: none;
    transition: opacity 0.16s var(--mi-ease), transform 0.16s var(--mi-ease), background 0.16s var(--mi-ease), color 0.16s var(--mi-ease);
}
.mi-menu-search.has-value .mi-menu-search-clear {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
}
.mi-menu-search-clear:hover { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.94); }
.mi-menu-search-hint {
    color: rgba(235,235,245,0.50);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
    display: none;
    align-items: center;
    gap: 6px;
}
.mi-menu-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 6px;
    color: rgba(255,255,255,0.88);
    background: rgba(255,255,255,0.085);
    border: 1px solid rgba(255,255,255,0.12);
    font: 800 11px/1 var(--mi-font-mono);
}
.mi-menu-empty {
    padding: 22px 14px;
    color: rgba(235,235,245,0.5);
    font-size: 13px;
    text-align: center;
    border-radius: 14px;
    background: rgba(255,255,255,0.035);
    border: 1px dashed rgba(255,255,255,0.08);
}
.mi-group {
    padding: 8px 8px 6px;
    color: rgba(255,255,255,0.48);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.mi-opt {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 18px;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    border-radius: var(--mi-radius-sm);
    background: rgba(255,255,255,0.018);
    border: 1px solid rgba(255,255,255,0.04);
    color: #fff;
    text-align: left;
    cursor: pointer;
    position: relative;
    min-height: 40px;
    overflow: hidden;
    isolation: isolate;
}
.mi-opt::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    background:
        radial-gradient(90% 140% at 0% 0%, rgba(255,255,255,0.105), transparent 52%),
        linear-gradient(90deg, rgba(var(--mi-bg-rgb),0.13), rgba(255,255,255,0.025) 68%, transparent);
    opacity: 0;
    transition: opacity 0.2s var(--mi-ease);
    pointer-events: none;
}
.mi-opt > * { position: relative; z-index: 1; }
.mi-opt:hover::before { opacity: 0.62; }
.mi-opt:hover {
    background: rgba(255,255,255,0.075);
    transform: none;
}
.mi-opt.active {
    border-color: rgba(var(--mi-bg-rgb),0.38);
    transform: none;
}
.mi-opt.active::before {
    opacity: 1;
}
.mi-custom-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 38px;
    gap: 5px;
    align-items: stretch;
    min-width: 0;
}
.mi-custom-row .mi-opt {
    width: 100%;
    min-width: 0;
}
.mi-custom-remove {
    width: 38px;
    min-width: 38px;
    min-height: 40px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: rgba(235,235,245,0.46);
    background: linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.018));
    border: 1px solid rgba(255,255,255,0.065);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.055);
    cursor: pointer;
    transition: color 0.18s var(--mi-ease), background 0.18s var(--mi-ease), border-color 0.18s var(--mi-ease), transform 0.16s var(--mi-ease-fluid);
}
.mi-custom-remove svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
}
.mi-custom-remove:hover {
    color: #ff8d87;
    background: linear-gradient(180deg, rgba(255,105,97,0.16), rgba(255,69,58,0.07));
    border-color: rgba(255,105,97,0.24);
    transform: translateY(-0.5px);
}
.mi-custom-remove:active { transform: scale(0.94); }
.mi-custom-remove:focus-visible {
    outline: 2px solid color-mix(in srgb, #ff6961 70%, #ffffff);
    outline-offset: 1px;
}
.mi-opt.official {
    border-color: rgba(255,255,255,0.075);
    background: rgba(255,255,255,0.016);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
}
.mi-opt.official:hover {
    border-color: rgba(255,255,255,0.16);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}
.mi-opt.mi-agent-opt {
    border-color: rgba(var(--mi-bg-rgb), 0.34);
    background: linear-gradient(135deg, rgba(var(--mi-bg-rgb), 0.105) 0%, rgba(255,255,255,0.035) 100%);
    box-shadow: inset 0 0 0 1px rgba(var(--mi-bg-rgb), 0.08);
}
.mi-opt.mi-agent-opt .meta {
    color: rgba(134, 239, 172, 0.9);
    opacity: 0.9;
}
.mi-opt .txt {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    font-weight: 700;
    letter-spacing: -0.012em;
}
.mi-opt-title-row {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
}
.mi-opt-title-row .txt {
    min-width: 0;
    flex: 0 1 auto;
}
.mi-source-state {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 5px;
    min-height: 18px;
    padding: 0 6px 0 5px;
    border: 1px solid rgba(161, 255, 207, 0.27);
    border-radius: 999px;
    color: rgba(211, 255, 229, 0.98);
    background:
        linear-gradient(180deg, rgba(255,255,255,0.17), rgba(255,255,255,0.035)),
        rgba(52, 211, 153, 0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.17), inset 0 -1px 0 rgba(0,0,0,0.14);
    font: 760 9px/1 var(--mi-font);
    letter-spacing: 0.025em;
    white-space: nowrap;
}
.mi-source-dot {
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 50%;
    background: #79efb1;
    box-shadow: 0 0 0 1px rgba(106, 244, 171, 0.12), inset 0 1px 1px rgba(255,255,255,0.62);
}
.mi-opt .sub {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    color: rgba(255,255,255,0.5);
    font-size: 11px;
    font-weight: 500;
}
.mi-opt .meta {
    font-size: 11px;
    opacity: 0.5;
    font-family: var(--mi-font-mono);
    font-weight: 600;
}
.mi-check {
    opacity: 0;
    color: rgba(255,255,255,0.86);
    font-size: 13px;
    font-weight: 800;
    text-align: right;
    transform: scale(0.78);
    transition: opacity 0.2s var(--mi-ease), transform 0.2s var(--mi-ease);
}
.mi-opt.active .mi-check {
    opacity: 1;
    transform: scale(1);
}
.mi-menu-section {
    display: grid;
    gap: 6px;
}
.mi-opt-grp {
    padding: 8px 9px 1px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: rgba(235,235,245,0.58);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
}
.mi-group-count {
    display: inline-flex;
    min-width: 22px;
    height: 20px;
    padding: 0 7px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255,255,255,0.065);
    border: 1px solid rgba(255,255,255,0.075);
    color: rgba(255,255,255,0.62);
    font: 720 10px/1 var(--mi-font);
    letter-spacing: 0;
}
.mi-live-section .mi-opt-grp {
    color: rgba(179, 255, 215, 0.9);
}
.mi-live-section .mi-group-count {
    color: rgba(211, 255, 229, 0.96);
    border-color: rgba(121, 239, 177, 0.2);
    background: rgba(52, 211, 153, 0.1);
}
.mi-live-empty {
    gap: 6px;
}
.mi-live-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #79efb1;
    box-shadow: 0 0 0 0 rgba(121, 239, 177, 0.3);
    animation: miLivePulse 1.7s ease-out infinite;
}
.mi-menu-live-note {
    margin: 0 6px;
    padding: 13px 14px;
    border-radius: 14px;
    color: rgba(235,235,245,0.54);
    background: rgba(255,255,255,0.026);
    border: 1px solid rgba(255,255,255,0.045);
    font-size: 12px;
    font-weight: 600;
}
.mi-special-section {
    padding-top: 2px;
}
.mi-special-section .mi-opt-grp {
    color: rgba(175, 210, 255, 0.88);
}
.mi-offline-section {
    gap: 7px;
    margin-top: 6px;
    padding-top: 9px;
    border-top: 1px solid rgba(255,255,255,0.055);
}
.mi-offline-toggle {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-radius: 13px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.026);
    color: rgba(235,235,245,0.62);
    font: 700 11px/1 var(--mi-font);
    cursor: pointer;
    transition: background 0.2s var(--mi-ease), border-color 0.2s var(--mi-ease), color 0.2s var(--mi-ease), transform 0.2s var(--mi-ease-fluid);
}
.mi-offline-toggle:hover {
    color: rgba(255,255,255,0.82);
    background: rgba(255,255,255,0.055);
    border-color: rgba(255,255,255,0.1);
}
.mi-offline-toggle:active {
    transform: scale(0.985);
}
.mi-offline-toggle:focus-visible {
    outline: none;
    border-color: rgba(var(--mi-bg-rgb),0.52);
    box-shadow: 0 0 0 3px rgba(var(--mi-bg-rgb),0.14);
}
.mi-offline-toggle-label,
.mi-offline-toggle-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.mi-offline-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(235,235,245,0.32);
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.16);
}
.mi-offline-chevron {
    width: 8px;
    height: 8px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg) translateY(-1px);
    transition: transform 0.3s var(--mi-ease-fluid);
}
.mi-offline-section.is-expanded .mi-offline-chevron {
    transform: rotate(225deg) translate(-1px, -1px);
}
.mi-offline-body {
    display: grid;
    gap: 8px;
    transform-origin: top center;
}
.mi-agent-section {
    margin-bottom: 2px;
}
.mi-agent-section-bottom {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.055);
}
.mi-agent-section .mi-opt-grp {
    color: rgba(134, 239, 172, 0.88);
}
.mi-family {
    display: grid;
    gap: 3px;
    padding: 3px;
    border-radius: 14px;
    background: rgba(255,255,255,0.014);
    border: 1px solid rgba(255,255,255,0.035);
}
.mi-family-head {
    padding: 7px 9px 3px;
    color: rgba(255,255,255,0.86);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
}
.mi-opt {
    border-radius: 12px;
    min-height: 45px;
    padding: 9px 11px;
}
.mi-opt:hover {
    background: rgba(255,255,255,0.08);
    transform: none;
    padding-left: 12px;
}
.mi-opt.active {
    transform: none;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025)),
        rgba(var(--mi-bg-rgb),0.12);
    border-color: rgba(var(--mi-bg-rgb), 0.44);
    box-shadow: 0 8px 18px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(var(--mi-bg-rgb),0.06);
}
.mi-opt.official.active {
    background:
        linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
        rgba(var(--mi-bg-rgb),0.12);
    border-color: rgba(var(--mi-bg-rgb),0.42);
    box-shadow: 0 8px 18px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15);
}
.mi-opt.mi-agent-opt.active {
    background: linear-gradient(135deg, rgba(var(--mi-bg-rgb), 0.16) 0%, rgba(var(--mi-bg-rgb), 0.075) 100%);
    border-color: rgba(var(--mi-bg-rgb), 0.42);
    box-shadow: 0 0 0 1px rgba(var(--mi-bg-rgb), 0.12), 0 8px 18px rgba(0,0,0,0.16);
}
.mi-opt-body {
    display: grid;
    gap: 2px;
    min-width: 0;
}
.mi-infobar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 4px 12px;
    font-size: 12px;
    color: var(--mi-text-secondary);
}
#mi-info-txt {
    font-size: 12px;
}
#mi-ref-btn {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: color 0.2s var(--mi-ease), background 0.2s var(--mi-ease), transform 0.15s var(--mi-ease);
    padding: 5px 8px;
    border-radius: 8px;
}
#mi-ref-btn:hover { color: var(--mi-text-primary); background: var(--mi-bg-tertiary); transform: translateX(-2px); }
#mi-ref-btn.loading { opacity: 0.72; }
#mi-ref-btn.cached { color: #fbbf24; }
#mi-ref-btn.ok { color: #34d399; }
#mi-ref-btn.fail { color: #f87171; }
.mi-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 4px 16px;
}
.mi-chip {
    padding: 6px 10px;
    border-radius: 100px;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.045);
    color: rgba(255,255,255,0.74);
    font-size: 12px;
    cursor: pointer;
    transition: transform 0.2s var(--mi-ease-fluid), border-color 0.2s var(--mi-ease), background 0.2s var(--mi-ease), color 0.2s var(--mi-ease);
}
.mi-chip:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.16); color: var(--mi-text-primary); }
.mi-chip.active { background: rgba(var(--mi-bg-rgb), 0.18); border-color: rgba(var(--mi-bg-rgb), 0.38); color: var(--mi-text-primary); }
.mi-inp-grp, .mi-color-row { display: flex; gap: 8px; }
.mi-color-row,
#mi-lang-row,
.mi-debug-row {
    align-items: center;
}
#mi-set .mi-color-row,
#mi-set #mi-lang-row,
#mi-set .mi-debug-row {
    flex: 0 0 auto;
    min-height: 48px;
    margin: 0 0 8px;
    padding: 0 12px;
    border-radius: 14px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.065);
}
.mi-color-row label,
#mi-lang-row label,
.mi-debug-row > label {
    flex: 1 1 auto;
    min-width: 0;
    color: rgba(235,235,245,0.7);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mi-debug-row {
    margin-top: 0;
}
.mi-privacy-card {
    display: grid;
    gap: 8px;
    flex: 0 0 auto;
    margin: 0 0 8px;
    padding: 10px 12px 12px;
    border-radius: 16px;
    background:
        radial-gradient(circle at 0% 0%, rgba(var(--mi-bg-rgb), 0.1), transparent 55%),
        rgba(255,255,255,0.02);
    border: 1px solid rgba(var(--mi-bg-rgb), 0.14);
}
.mi-privacy-card > .mi-debug-row {
    min-height: 40px;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
}
.mi-privacy-head {
    display: grid;
    flex: 1 1 auto;
    gap: 1px;
    min-width: 0;
}
.mi-privacy-head strong {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.1px;
    color: var(--mi-text-primary);
}
.mi-privacy-head span,
.mi-privacy-status {
    color: rgba(235,235,245,0.55);
    font-size: 11px;
    line-height: 1.4;
}
.mi-privacy-status { padding-left: 2px; }
.mi-privacy-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 7px 9px;
}
.mi-privacy-field-label {
    color: rgba(235,235,245,0.62);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}
.mi-privacy-picker {
    width: 100%;
    min-width: 0;
}
.mi-privacy-trigger {
    min-height: 38px;
    padding: 8px 34px 8px 12px;
    border-radius: 12px;
    font-size: 12px;
}
.mi-privacy-trigger::after {
    right: 12px;
    width: 8px;
    height: 8px;
}
.mi-privacy-card .mi-link-btn {
    justify-self: start;
    min-height: 28px;
    padding: 0 9px;
    font-size: 11px;
}
.mi-settings-note {
    display: grid;
    gap: 4px;
    margin-top: auto;
    padding: 12px 13px;
    border-radius: 16px;
    color: var(--mi-text-primary);
    background:
        radial-gradient(circle at 0% 0%, rgba(var(--mi-bg-rgb), 0.12), transparent 58%),
        rgba(255,255,255,0.025);
    border: 1px solid rgba(var(--mi-bg-rgb), 0.18);
}
.mi-settings-note strong {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.1px;
}
.mi-settings-note span {
    color: rgba(235,235,245,0.58);
    font-size: 11px;
    line-height: 1.45;
}
.mi-settings-note .mi-link-btn {
    justify-self: start;
    min-height: 28px;
    margin-top: 3px;
    padding: 0 9px;
    border-color: rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.035);
    font-size: 11px;
}
.mi-inp {
    flex: 1;
    min-width: 0;
    padding: 12px 16px;
    border-radius: var(--mi-radius-md);
    border: 1px solid rgba(255,255,255,0.1);
    background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.2) 100%);
    color: var(--mi-text-primary);
    outline: none;
    transition: border-color 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease), background 0.22s var(--mi-ease);
    min-height: 48px;
}
.mi-inp::placeholder { color: var(--mi-text-placeholder); }
.mi-inp:focus { border-color: var(--mi-bg); box-shadow: 0 0 0 4px rgba(0,122,255,0.15), 0 0 20px -5px var(--mi-bg); }
.mi-lang-picker {
    position: relative;
    min-width: 132px;
}
.mi-lang-trigger {
    width: 100%;
    min-width: 0;
    padding: 10px 38px 10px 12px;
    border-radius: var(--mi-radius-md);
    border: 1px solid rgba(255,255,255,0.12);
    background:
        linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.2) 100%),
        linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
    color: var(--mi-text-primary);
    font: 500 13px/1.25 var(--mi-font);
    text-align: left;
    outline: none;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    transition: border-color 0.2s var(--mi-ease), box-shadow 0.2s var(--mi-ease), background 0.2s var(--mi-ease), transform 0.2s var(--mi-ease);
    position: relative;
}
.mi-lang-trigger > span {
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mi-lang-trigger::after {
    content: '';
    position: absolute;
    right: 12px;
    top: 50%;
    width: 10px;
    height: 10px;
    transform: translateY(-50%) rotate(45deg);
    border-right: 1.5px solid rgba(235,235,245,0.72);
    border-bottom: 1.5px solid rgba(235,235,245,0.72);
    transition: transform 0.2s var(--mi-ease);
}
.mi-lang-picker.open .mi-lang-trigger::after {
    transform: translateY(-30%) rotate(-135deg);
}
.mi-lang-trigger:hover {
    border-color: rgba(255,255,255,0.2);
    transform: translateY(-1px);
}
.mi-lang-trigger:focus-visible {
    border-color: var(--mi-bg);
    box-shadow: 0 0 0 4px rgba(0,122,255,0.15);
}
.mi-lang-menu {
    position: absolute;
    top: 0;
    left: 18px;
    right: auto;
    width: 148px;
    max-height: 220px;
    display: grid;
    gap: 4px;
    padding: 6px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(26,29,36,0.98);
    box-shadow: 0 20px 40px rgba(0,0,0,0.28);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-6px) scale(0.98);
    transform-origin: top right;
    transition:
        opacity 0.18s var(--mi-ease),
        transform 0.18s var(--mi-ease),
        visibility 0s linear 0.18s;
    z-index: 110;
}
.mi-lang-menu[data-placement=above] {
    transform: translateY(6px) scale(0.98);
}
.mi-lang-menu[data-placement=overlay] {
    transform: scale(0.985);
}
.mi-lang-menu.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
    transition:
        opacity 0.18s var(--mi-ease),
        transform 0.18s var(--mi-ease),
        visibility 0s linear 0s;
}
.mi-lang-menu[data-compact=true] {
    border-radius: 14px;
    scrollbar-gutter: stable;
}
#mi .mi-lang-option {
    width: 100%;
    padding: 10px 12px;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--mi-text-primary);
    font: 500 13px/1 var(--mi-font);
    text-align: left;
    cursor: pointer;
    transition: background 0.18s var(--mi-ease), border-color 0.18s var(--mi-ease);
}
#mi .mi-lang-option:hover {
    background: rgba(255,255,255,0.06);
}
#mi .mi-lang-option.active {
    background: rgba(var(--mi-bg-rgb), 0.16);
    border-color: rgba(var(--mi-bg-rgb), 0.3);
}
.mi-icon-btn, .mi-link-btn {
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--mi-text-primary);
    cursor: pointer;
    transition: transform 0.22s var(--mi-ease-fluid), border-color 0.22s var(--mi-ease), background 0.22s var(--mi-ease), color 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease);
}
.mi-icon-btn {
    width: 48px;
    height: 48px;
    border-radius: var(--mi-radius-md);
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.mi-icon-btn:hover {
    border-color: var(--mi-bg);
    transform: scale(1.08) translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2), 0 0 25px -5px var(--mi-bg);
}
.mi-refresh-btn {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background:
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 58%),
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
    border: 1px solid rgba(var(--mi-bg-rgb), 0.4);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.14),
        0 10px 20px rgba(0,0,0,0.18),
        0 0 0 1px rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
}
.mi-refresh-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle, rgba(var(--mi-bg-rgb), 0.24) 0%, rgba(var(--mi-bg-rgb), 0) 68%);
    opacity: 0;
    transform: scale(0.74);
    transition: opacity 0.25s var(--mi-ease), transform 0.25s var(--mi-ease);
}
.mi-refresh-btn:hover {
    border-color: rgba(var(--mi-bg-rgb), 0.76);
    transform: translateY(-2px) scale(1.04);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.14),
        0 14px 26px rgba(0,0,0,0.24),
        0 0 24px rgba(var(--mi-bg-rgb), 0.2);
}
.mi-refresh-btn:hover::before {
    opacity: 1;
    transform: scale(1);
}
.mi-refresh-btn:active {
    transform: scale(0.96);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 8px 16px rgba(0,0,0,0.16);
}
.mi-refresh-glyph {
    position: relative;
    z-index: 1;
    font-size: 18px;
    line-height: 1;
    font-weight: 700;
    color: #f8fbff;
    transition: transform 0.3s var(--mi-ease-out-quart), color 0.3s var(--mi-ease);
}
.mi-refresh-btn.is-spinning::before {
    opacity: 1;
    animation: miRefreshHalo 0.8s ease-in-out infinite;
}
.mi-refresh-btn.is-spinning .mi-refresh-glyph {
    animation: miRefreshSpin 0.8s cubic-bezier(0.5, 0, 0.2, 1) infinite;
}
.mi-refresh-btn.is-success {
    border-color: rgba(52, 211, 153, 0.58);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.12),
        0 12px 24px rgba(0,0,0,0.2),
        0 0 20px rgba(52, 211, 153, 0.18);
}
.mi-refresh-btn.is-success::before {
    opacity: 1;
    transform: scale(1);
    background: radial-gradient(circle, rgba(52, 211, 153, 0.24) 0%, rgba(52, 211, 153, 0) 68%);
}
.mi-refresh-btn.is-success .mi-refresh-glyph {
    color: #d1fae5;
    transform: rotate(-10deg) scale(1.08);
}
.mi-grid {
    margin: 0 4px 16px;
}
.mi-effort-track {
    --mi-effort-index: 0;
    --mi-effort-glass-x: 12.5%;
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    min-height: 56px;
    padding: 4px;
    overflow: hidden;
    isolation: isolate;
    contain: layout paint;
    border-radius: 16px;
    background:
        radial-gradient(54% 168% at var(--mi-effort-glass-x) 48%, rgba(var(--mi-bg-rgb),0.115), transparent 66%),
        linear-gradient(120deg, rgba(255,255,255,0.070), transparent 37%, rgba(255,255,255,0.024) 74%, rgba(0,0,0,0.10)),
        linear-gradient(180deg, rgba(255,255,255,0.038), rgba(0,0,0,0.075)),
        rgba(8,11,16,0.34);
    border: 1px solid rgba(255,255,255,0.118);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.095), inset 0 -1px 0 rgba(0,0,0,0.29), 0 10px 24px rgba(0,0,0,0.11);
    transition: opacity 0.2s var(--mi-ease), border-color 0.2s var(--mi-ease);
}
.mi-effort-track::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.075), transparent 34%),
        linear-gradient(90deg, rgba(255,255,255,0.028), transparent 24%, transparent 76%, rgba(255,255,255,0.018));
}
.mi-effort-track::after {
    content: '';
    position: absolute;
    inset: 1px;
    z-index: 0;
    pointer-events: none;
    border-radius: 15px;
    background: radial-gradient(92% 64% at 50% 112%, rgba(0,0,0,0.13), transparent 70%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.028);
}
.mi-effort-track.is-disabled {
    opacity: 0.62;
    border-color: rgba(255,255,255,0.065);
}
.mi-effort-lens {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    z-index: 1;
    width: calc((100% - 8px) / 4);
    pointer-events: none;
    transform: translate3d(calc(var(--mi-effort-index) * 100%), 0, 0);
    will-change: transform;
    transition: transform 0.42s var(--mi-ease-liquid);
}
.mi-effort-lens-material {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    overflow: hidden;
    isolation: isolate;
    background:
        radial-gradient(118% 92% at 18% -18%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.105) 30%, transparent 49%),
        linear-gradient(180deg, rgba(255,255,255,0.082), rgba(255,255,255,0.018) 52%, rgba(0,0,0,0.038)),
        rgba(255,255,255,0.026);
    border: 1px solid rgba(255,255,255,0.28);
    box-shadow:
        0 7px 18px rgba(0,0,0,0.20),
        inset 0 1px 0 rgba(255,255,255,0.34),
        inset 0 -1px 0 rgba(0,0,0,0.24),
        inset 1px 0 0 rgba(255,255,255,0.10),
        inset -1px 0 0 rgba(0,0,0,0.12);
    backdrop-filter: blur(14px) saturate(152%) brightness(1.07);
    -webkit-backdrop-filter: blur(14px) saturate(152%) brightness(1.07);
    transition: transform 0.12s var(--mi-ease), box-shadow 0.16s var(--mi-ease);
}
.mi-effort-lens-material::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 11px;
    z-index: 0;
    background:
        linear-gradient(110deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.105) 12%, transparent 29%, transparent 74%, rgba(255,255,255,0.055) 100%),
        radial-gradient(100% 86% at 54% -24%, rgba(255,255,255,0.17), transparent 54%);
    box-shadow: inset 1px 0 0 rgba(255,255,255,0.15), inset -1px 0 0 rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.10);
}
.mi-effort-lens-material::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
    background:
        linear-gradient(90deg, rgba(255,255,255,0.14), transparent 17%, transparent 83%, rgba(255,255,255,0.10)),
        linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.10));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.075);
}
.mi-grid.is-pressing .mi-effort-lens-material,
.mi-effort-track:has(.mi-g-item:active) .mi-effort-lens-material {
    transform: scaleX(1.018) scaleY(0.964);
    box-shadow: 0 4px 13px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.27), inset 0 -1px 0 rgba(0,0,0,0.25);
}
.mi-g-item {
    position: relative;
    z-index: 2;
    min-width: 0;
    min-height: 48px;
    display: grid;
    place-items: center;
    padding: 8px 4px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: color 0.16s var(--mi-ease), opacity 0.18s var(--mi-ease), transform 0.1s var(--mi-ease);
    color: rgba(235,235,245,0.62);
}
.mi-g-item.active {
    background: transparent;
    border-color: transparent;
    color: #ffffff;
    font-weight: 720;
    text-shadow: 0 1px 7px rgba(0,0,0,0.40);
    box-shadow: none;
}
.mi-g-item:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--mi-bg) 72%, #ffffff);
}
.mi-g-item:disabled {
    opacity: 0.72;
    cursor: not-allowed;
}
.mi-g-main {
    width: 100%;
    font-size: 12px;
    line-height: 1.15;
    font-weight: 680;
    letter-spacing: -0.01em;
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}
.mi-effort-detail {
    min-height: 16px;
    margin: 8px 5px 0;
    color: rgba(235,235,245,0.64);
    font-size: 11.5px;
    line-height: 1.35;
    text-align: center;
}
.mi-diagnostics {
    margin: 14px 4px 0;
    padding: 0;
    border-radius: 17px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.018)),
        rgba(8,10,14,0.13);
    border: 1px solid rgba(255,255,255,0.072);
    overflow: hidden;
    transition: border-color 0.22s var(--mi-ease), background 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
}
.mi-diagnostics.has-error {
    border-color: rgba(248, 113, 113, 0.28);
    background: linear-gradient(180deg, rgba(248, 113, 113, 0.045), rgba(255,255,255,0.022));
}
.mi-diag-toggle {
    width: 100%;
    min-height: 56px;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) 20px;
    align-items: center;
    column-gap: 12px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
}
.mi-diag-toggle:hover {
    background: rgba(255,255,255,0.035);
}
.mi-diag-toggle:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--mi-bg) 72%, #ffffff);
}
.mi-diag-title {
    min-width: 0;
    max-width: 118px;
    color: rgba(235,235,245,0.84);
    font-size: 12.5px;
    font-weight: 690;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mi-diag-summary {
    min-width: 0;
    color: rgba(235,235,245,0.56);
    font-size: 11.5px;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mi-diag-chevron {
    width: 8px;
    height: 8px;
    justify-self: center;
    border-right: 1.75px solid rgba(235,235,245,0.62);
    border-bottom: 1.75px solid rgba(235,235,245,0.62);
    transform: rotate(45deg);
    transform-origin: center;
    transition: transform 0.22s var(--mi-ease-fluid), border-color 0.22s var(--mi-ease);
}
.mi-diagnostics.open .mi-diag-chevron {
    transform: rotate(-135deg);
    border-color: rgba(235,235,245,0.82);
}
.mi-diag-panel {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transform: translateY(-4px);
    transition: max-height 0.28s var(--mi-ease), opacity 0.18s var(--mi-ease), transform 0.22s var(--mi-ease);
}
.mi-diagnostics.open .mi-diag-panel {
    max-height: 360px;
    opacity: 1;
    transform: translateY(0);
    border-top: 1px solid rgba(255,255,255,0.055);
    overflow-y: auto;
}
.mi-diag-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 7px 12px;
    align-items: center;
    padding: 12px 16px 0;
}
.mi-diag-grid span {
    color: rgba(235,235,245,0.46);
    font-size: 11px;
}
.mi-diag-grid strong {
    min-width: 0;
    color: rgba(255,255,255,0.86);
    font-size: 11px;
    font-weight: 650;
    font-family: var(--mi-font-mono);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mi-diag-grid strong.is-muted {
    color: rgba(235,235,245,0.48);
}
.mi-diag-grid strong.is-success {
    color: #86efac;
}
.mi-diag-grid strong.is-normal {
    color: #bef264;
}
.mi-diag-grid strong.is-warning {
    color: #fde68a;
}
.mi-diag-grid strong.has-error {
    color: #fca5a5;
}
.mi-diag-actions {
    display: flex;
    justify-content: flex-end;
    padding: 10px 13px 12px;
}
.mi-diag-actions .mi-link-btn {
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
}
.mi-box {
    padding: 18px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.12) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    margin: 0 4px;
    color: var(--mi-text-primary);
    transition: border-color 0.22s var(--mi-ease), background 0.22s var(--mi-ease), box-shadow 0.24s var(--mi-ease-fluid);
}
.mi-box:hover { border-color: rgba(255,255,255,0.12); box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.mi-box-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.mi-box-head h4 { margin: 0; color: var(--mi-text-primary); font-size: 14px; font-weight: 700; display: flex; gap: 10px; align-items: center; }
.mi-badge {
    margin-left: 6px;
    color: rgba(255,255,255,0.5);
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 100px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    border: 1px solid rgba(255,255,255,0.08);
}
.mi-chart-area { display: flex; align-items: center; gap: 24px; margin-bottom: 16px; }
.mi-ring {
    position: relative;
    width: 76px;
    height: 76px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.mi-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; overflow: visible; }
.mi-ring .bg {
    fill: none;
    stroke: rgba(255,255,255,0.08);
    stroke-width: 6;
}
.mi-ring .fg {
    fill: none;
    stroke: var(--mi-bg);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dasharray 0.8s var(--mi-ease-out-quart), stroke 0.4s var(--mi-ease);
    filter: drop-shadow(0 0 8px var(--mi-bg));
}
.mi-ring-txt {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--mi-text-primary);
    font-size: 15px;
    font-weight: 800;
    font-family: var(--mi-font-mono);
    text-shadow: 0 1px 8px rgba(0,0,0,0.45);
}
.mi-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 20px;
    flex: 1;
}
.mi-stat-kv .v { color: var(--mi-text-primary); font-size: 16px; font-weight: 700; font-family: var(--mi-font-mono); }
.mi-stat-kv .k { margin-top: 3px; color: rgba(235,235,245,0.62); font-size: 11px; }
.mi-foot {
    padding: 14px 22px;
    background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 100%);
    border-top: 1px solid transparent;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    position: relative;
}
.mi-link-btn {
    min-width: 0;
    background: none;
    border: 1px solid transparent;
    color: var(--mi-text-secondary);
    font-size: 13px;
    font-family: var(--mi-font);
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--mi-radius-md);
    transition: transform 0.2s var(--mi-ease-fluid), background 0.2s var(--mi-ease), color 0.2s var(--mi-ease), border-color 0.2s var(--mi-ease);
    min-height: 40px;
}
.mi-link-btn:hover { background: rgba(255,255,255,0.08); color: var(--mi-text-primary); transform: translateY(-2px); }
#mi-sponsor-slot {
    min-width: 0;
    width: 100%;
    margin-left: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    justify-content: stretch;
    gap: 8px;
}
#mi-sponsor-slot:not(:has(.mi-sponsor)) {
    grid-template-columns: minmax(0, max-content);
    justify-content: end;
}
#mi-sponsor-slot > a {
    min-width: 0;
    max-width: 100%;
}
.mi-repo-link,
.mi-sponsor {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 40px;
    gap: 8px;
    padding: 9px 10px;
    border-radius: var(--mi-radius-md);
    color: var(--mi-text-secondary);
    text-decoration: none;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s var(--mi-ease-fluid), background 0.2s var(--mi-ease), color 0.2s var(--mi-ease), border-color 0.2s var(--mi-ease);
}
.mi-repo-link:hover,
.mi-sponsor:hover {
    color: var(--mi-text-primary);
    background: rgba(255,255,255,0.08);
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.14);
}
.mi-repo-link:focus-visible,
.mi-sponsor:focus-visible {
    outline: 2px solid rgba(var(--mi-bg-rgb), 0.82);
    outline-offset: 2px;
}
.mi-repo-icon {
    width: 15px;
    height: 15px;
    flex: 0 0 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.45;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.mi-repo-text,
.mi-sponsor-text {
    display: block;
    min-width: 0;
    max-width: 100%;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    white-space: normal;
    overflow-wrap: anywhere;
    text-wrap: balance;
}
.mi-sponsor-icon {
    flex: 0 0 auto;
    font-size: 14px;
    line-height: 1;
}
/* Cyrillic labels need a little more text width than an inline icon row allows. */
#mi:lang(ru) .mi-repo-link,
#mi:lang(ru) .mi-sponsor {
    flex-direction: column;
    gap: 3px;
    padding: 7px 8px;
}
.mi-clrs {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    justify-items: center;
    gap: 8px;
    margin: 0 0 8px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.075);
}
.mi-section-label {
    margin: 0 4px 6px;
    color: rgba(235,235,245,0.5);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
}
.mi-clr {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.15);
    cursor: pointer;
    transition: transform 0.2s var(--mi-ease-spring), box-shadow 0.2s var(--mi-ease), border-color 0.2s var(--mi-ease);
}
.mi-clr:hover { transform: scale(1.15); box-shadow: 0 4px 12px rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.5); }
.mi-clr.active { transform: scale(1.15); border-color: #fff; box-shadow: 0 0 0 3px var(--mi-bg-primary), 0 4px 16px rgba(0,0,0,0.3); }
.mi-set-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--mi-text-tertiary);
    cursor: pointer;
}
.mi-set-close:hover { color: var(--mi-text-primary); background: var(--mi-bg-tertiary); }
#mi-color-picker {
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    border-radius: 50%;
    overflow: hidden;
    background: none;
    cursor: pointer;
    -webkit-appearance: none;
    flex-shrink: 0;
}
#mi-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
#mi-color-picker::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; }
#mi-color-hex { text-transform: uppercase; text-align: center; font-family: var(--mi-font-mono); }
.mi-tooltip {
    position: fixed;
    z-index: 100001;
    background:
        radial-gradient(circle at top left, rgba(255,255,255,0.07), transparent 36%),
        linear-gradient(180deg, rgba(41, 43, 49, 0.992) 0%, rgba(29, 31, 36, 0.995) 100%);
    border: 1px solid rgba(255,255,255,0.105);
    border-radius: 16px;
    padding: 16px;
    width: 286px;
    box-shadow:
        0 24px 70px rgba(0,0,0,0.34),
        0 10px 24px rgba(0,0,0,0.22),
        inset 0 1px 0 rgba(255,255,255,0.11),
        inset 0 -1px 0 rgba(255,255,255,0.03);
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: translate3d(12px, 0, 0) scale(0.975);
    transition:
        opacity 0.16s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
        visibility 0s linear 0.18s;
}
.mi-tooltip::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.8;
    pointer-events: none;
}
.mi-tooltip[data-side="left"] { transform: translate3d(10px, 0, 0) scale(0.975); }
.mi-tooltip[data-side="right"] { transform: translate3d(-10px, 0, 0) scale(0.975); }
.mi-tooltip[data-side="top"] { transform: translate3d(0, 8px, 0) scale(0.975); }
.mi-tooltip[data-side="bottom"] { transform: translate3d(0, -8px, 0) scale(0.975); }
.mi-tooltip.show {
    opacity: 1;
    visibility: visible;
    transform: translate3d(0, 0, 0) scale(1);
    transition:
        opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
        visibility 0s linear 0s;
}
.mi-tooltip.hiding {
    opacity: 0;
}
.mi-tooltip.hiding[data-side="left"] { transform: translate3d(10px, 0, 0) scale(0.98); }
.mi-tooltip.hiding[data-side="right"] { transform: translate3d(-10px, 0, 0) scale(0.98); }
.mi-tooltip.hiding[data-side="top"] { transform: translate3d(0, 8px, 0) scale(0.98); }
.mi-tooltip.hiding[data-side="bottom"] { transform: translate3d(0, -8px, 0) scale(0.98); }
.mi-tooltip-title {
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 9px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}
.mi-online-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(52, 211, 153, 0.16);
    border: 1px solid rgba(52, 211, 153, 0.32);
    color: #86efac;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.12);
}
.mi-tooltip-id {
    font-family: var(--mi-font-mono);
    font-size: 11px;
    color: rgba(235, 235, 245, 0.5);
    margin-bottom: 12px;
    background: rgba(0,0,0,0.26);
    padding: 7px 10px;
    border-radius: 8px;
    word-break: break-all;
    border: 1px solid rgba(255,255,255,0.06);
}
.mi-tooltip-row {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.03) 100%);
    padding: 9px 10px;
    border-radius: 10px;
    margin: 6px 0;
    border: 1px solid rgba(255,255,255,0.065);
}
.mi-tooltip-row .k {
    font-size: 10px;
    color: rgba(235, 235, 245, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 700;
}
.mi-tooltip-row .v {
    font-size: 12px;
    font-weight: 800;
    color: #ffffff;
    font-family: var(--mi-font-mono);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mi-tooltip-desc {
    font-size: 12px;
    color: rgba(235, 235, 245, 0.75);
    margin-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.075);
    padding-top: 12px;
    line-height: 1.6;
}
.mi-tooltip-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
}
.mi-tooltip-tools .tool {
    font-size: 10px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.06) 100%);
    padding: 5px 10px;
    border-radius: 7px;
    color: rgba(235, 235, 245, 0.85);
    font-family: var(--mi-font-mono);
    border: 1px solid rgba(255,255,255,0.08);
    font-weight: 600;
}
@keyframes miLivePulse {
    0% { box-shadow: 0 0 0 0 rgba(121, 239, 177, 0.28); opacity: 0.95; }
    68% { box-shadow: 0 0 0 7px rgba(121, 239, 177, 0); opacity: 0.78; }
    100% { box-shadow: 0 0 0 0 rgba(121, 239, 177, 0); opacity: 0.95; }
}
@keyframes miBadgeBounce {
    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
    50% { transform: scale(1.3) rotate(10deg); }
    70% { transform: scale(0.9) rotate(-5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes miRefreshSpin {
    from { transform: rotate(0deg) scale(1); }
    60% { transform: rotate(300deg) scale(1.06); }
    to { transform: rotate(360deg) scale(1); }
}
@keyframes miRefreshHalo {
    0%, 100% { transform: scale(0.76); opacity: 0.2; }
    50% { transform: scale(1.04); opacity: 0.9; }
}
@keyframes miModelGlassSweep {
    0% { transform: translate3d(0,0,0); opacity: 0; }
    16% { opacity: 0.26; }
    72% { opacity: 0.16; }
    100% { transform: translate3d(480%,0,0); opacity: 0; }
}
@media (hover: hover) and (pointer: fine) {
    #mi-b:not(.panel-open):hover::before {
        opacity: 0.82;
        transform: scale(1);
    }
    #mi-b:not(.panel-open):hover {
        transform: translateY(-1px) scale(1.035);
        border-color: rgba(var(--mi-bg-rgb), 0.34);
        box-shadow: 0 18px 40px rgba(0,0,0,0.36), 0 0 0 5px rgba(var(--mi-bg-rgb), 0.08), inset 0 1px 0 rgba(255,255,255,0.17);
    }
    #mi-b:not(.panel-open):hover .icon {
        transform: scale(1.035);
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.28));
    }
    .mi-g-item:hover:not(:disabled) {
        color: rgba(255,255,255,0.88);
        transform: translateY(-0.5px);
        background: transparent;
    }
}
@media (max-width: 640px) {
    #mi-p {
        width: min(calc(100vw - 24px), 368px);
    }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .mi-panel-surface,
    #mi-drop { background: rgb(24, 25, 30); }
    #mi-backdrop {
        background: rgba(7, 9, 13, 0.58);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
}
@supports ((backdrop-filter: url(#mi-model-injector-liquid-lens)) or (-webkit-backdrop-filter: url(#mi-model-injector-liquid-lens))) {
    .mi-panel-surface {
        backdrop-filter: blur(18px) url(#mi-model-injector-liquid-lens) saturate(162%) brightness(1.07);
        -webkit-backdrop-filter: blur(18px) url(#mi-model-injector-liquid-lens) saturate(162%) brightness(1.07);
    }
    #mi-drop {
        backdrop-filter: blur(16px) url(#mi-model-injector-liquid-lens) saturate(145%) brightness(1.045);
        -webkit-backdrop-filter: blur(16px) url(#mi-model-injector-liquid-lens) saturate(145%) brightness(1.045);
    }
    .mi-effort-lens-material {
        backdrop-filter: url(#mi-model-injector-liquid-lens) blur(10px) saturate(148%) brightness(1.055);
        -webkit-backdrop-filter: url(#mi-model-injector-liquid-lens) blur(10px) saturate(148%) brightness(1.055);
    }
    #mi-p.is-motion-primed > .mi-panel-surface,
    #mi-p.is-motion-active > .mi-panel-surface {
        backdrop-filter: blur(12px) saturate(152%) brightness(1.06);
        -webkit-backdrop-filter: blur(12px) saturate(152%) brightness(1.06);
    }
    #mi-p.is-motion-primed .mi-effort-lens-material,
    #mi-p.is-motion-active .mi-effort-lens-material {
        background:
            radial-gradient(118% 92% at 18% -18%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 30%, transparent 49%),
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035) 52%, rgba(0,0,0,0.05)),
            rgba(48,52,61,0.70);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
}
@media (prefers-reduced-transparency: reduce) {
    .mi-panel-surface,
    #mi-drop {
        background: rgb(24, 25, 30);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
    #mi-backdrop {
        background: rgba(7, 9, 13, 0.54);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
    .mi-view-stack::before { display: none; }
    .mi-source-state {
        background: rgba(23, 27, 29, 0.96);
        border-color: rgba(160, 255, 202, 0.44);
    }
    .mi-effort-lens-material {
        background: linear-gradient(180deg, rgba(82,86,96,0.98), rgba(48,51,59,0.98));
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
}
@media (prefers-reduced-motion: reduce) {
    #mi *,
    #mi *::before,
    #mi *::after {
        scroll-behavior: auto !important;
        animation: none !important;
        transition: none !important;
    }
}
@media (forced-colors: active) {
    .mi-panel-surface,
    #mi-b,
    #mi-drop,
    .mi-tooltip {
        color: CanvasText;
        background: Canvas;
        border: 1px solid ButtonBorder;
        box-shadow: none;
        forced-color-adjust: auto;
    }
    #mi-backdrop { background: Canvas; opacity: 0.45; }
    #mi-ring-fg,
    #mi-b .mi-brand-orbit,
    #mi-b .mi-brand-lens { stroke: Highlight; }
    #mi-b .mi-brand-pupil,
    #mi-b .mi-brand-node { fill: Highlight; }
    .mi-effort-lens { display: none; }
    .mi-g-item.active { border: 2px solid Highlight; color: Highlight; }
    .mi-sw {
        background: Canvas;
        border: 1px solid ButtonBorder;
        box-shadow: none;
    }
    .mi-sw::before { display: none; }
    .mi-sw::after {
        background: ButtonText;
        border: 1px solid ButtonBorder;
        box-shadow: none;
    }
    .mi-sw.on { background: Highlight; }
    .mi-sw.on::after { background: HighlightText; }
    .mi-source-state {
        color: ButtonText;
        background: Canvas;
        border-color: ButtonBorder;
        box-shadow: none;
    }
    .mi-custom-remove {
        color: ButtonText;
        background: Canvas;
        border-color: ButtonBorder;
        box-shadow: none;
    }
    .mi-source-dot { background: Highlight; }
}
</style>
<svg class="mi-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
        <filter id="mi-model-injector-liquid-lens" x="-18%" y="-28%" width="136%" height="156%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.085" numOctaves="1" seed="19" result="mi-lens-noise"></feTurbulence>
            <feGaussianBlur in="mi-lens-noise" stdDeviation="0.42" result="mi-lens-soft-noise"></feGaussianBlur>
            <feDisplacementMap in="SourceGraphic" in2="mi-lens-soft-noise" scale="2.25" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
        </filter>
    </defs>
</svg>
<div id="mi-backdrop"></div>
<button id="mi-b" type="button" title="Open Model Injector" aria-label="Open Model Injector" aria-expanded="false" aria-controls="mi-p">
    <div id="mi-ring-wrap">
        <svg id="mi-ring-svg" viewBox="0 0 68 68" aria-hidden="true">
            <circle id="mi-ring-bg" cx="34" cy="34" r="31"></circle>
            <circle id="mi-ring-fg" cx="34" cy="34" r="31" stroke-dasharray="${BUTTON_RING}" stroke-dashoffset="${BUTTON_RING}"></circle>
        </svg>
    </div>
    <svg class="icon" viewBox="0 0 64 64" aria-hidden="true">
        <g class="mi-brand-orbit-group">
            <path class="mi-brand-orbit" d="M48.1 15.9A23.2 23.2 0 1 0 51.7 43.7"></path>
            <circle class="mi-brand-node" cx="48.1" cy="15.9" r="2.35"></circle>
            <circle class="mi-brand-node" cx="51.7" cy="43.7" r="1.75" opacity="0.66"></circle>
        </g>
        <g class="mi-brand-core">
            <path class="mi-brand-lens" d="M32 21.7C39.2 26.5 39.2 37.5 32 42.3C24.8 37.5 24.8 26.5 32 21.7Z"></path>
        </g>
        <g class="mi-brand-center">
            <circle class="mi-brand-pupil" cx="32" cy="32" r="3.1"></circle>
            <circle class="mi-brand-glint" cx="30.9" cy="30.9" r="0.85"></circle>
        </g>
    </svg>
    <div id="mi-n">0</div>
    <div id="mi-model-label">Default model</div>
</button>
<div id="mi-p" role="dialog" aria-modal="true" aria-labelledby="mi-panel-title" aria-hidden="true" tabindex="-1" data-view="main" inert>
    <div class="mi-panel-surface">
    <div class="mi-view-stack">
    <section id="mi-main-view" class="mi-panel-view" aria-hidden="false">
    <div class="mi-head">
        <h3 id="mi-panel-title">Model Injector</h3>
        <span class="mi-status" id="mi-st">Ready</span>
    </div>
    <div class="mi-body">
        <div class="mi-row">
            <div class="mi-lbl"><span id="mi-enable-title">Enable override</span><em><span id="mi-enable-subtitle">Override request</span><strong class="mi-toggle-state" id="mi-enable-state">Off</strong></em></div>
            <button class="mi-sw" id="mi-sw-main" type="button" role="switch" aria-checked="false"><span class="mi-sr-only">Enable override</span></button>
        </div>
        <div id="mi-sel-wrap">
            <button id="mi-sel-btn" type="button" title="Choose model" aria-haspopup="listbox" aria-controls="mi-menu-options" aria-expanded="false"><span id="mi-sel-txt">Choose model...</span><span class="mi-select-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6.5 9.25 12 14.5l5.5-5.25"></path></svg></span></button>
        </div>
        <div class="mi-infobar">
            <span id="mi-info-txt">No models loaded</span>
            <button id="mi-ref-btn" type="button" title="Refresh list"><span class="mi-ref-icon" aria-hidden="true">&#8635;</span><span id="mi-ref-label">Refresh list</span></button>
        </div>
        <div class="mi-chips" id="mi-chips"></div>
        <div class="mi-inp-grp">
            <input class="mi-inp" id="mi-cu" placeholder="Add model slug">
            <button class="mi-icon-btn" id="mi-add" type="button" title="Add model slug">+</button>
        </div>
        <div class="mi-row">
            <div class="mi-lbl"><span id="mi-effort-title">Thinking effort</span><em><span id="mi-effort-subtitle">Applies to reasoning models</span><strong class="mi-toggle-state" id="mi-effort-state">Off</strong></em></div>
            <button class="mi-sw" id="mi-sw-effort" type="button" role="switch" aria-checked="false"><span class="mi-sr-only">Thinking effort</span></button>
        </div>
        <div class="mi-grid" id="mi-grid-eff"></div>
        <div class="mi-box">
            <div class="mi-box-head">
                <h4>Context usage <span class="mi-badge">Auto</span></h4>
                <button class="mi-icon-btn mi-refresh-btn" id="mi-calc" type="button" title="Refresh context stats" aria-label="Refresh context stats">
                    <span class="mi-refresh-glyph">&#8635;</span>
                </button>
            </div>
            <div class="mi-chart-area">
                <div class="mi-ring">
                    <svg viewBox="0 0 36 36" aria-hidden="true">
                        <path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                        <path class="fg" id="tok-path" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    </svg>
                    <div class="mi-ring-txt" id="tok-pct">0%</div>
                </div>
                <div class="mi-stats-grid">
                    <div class="mi-stat-kv"><div class="v" id="val-used">0</div><div class="k">Used</div></div>
                    <div class="mi-stat-kv"><div class="v" id="val-free">196k</div><div class="k">Free</div></div>
                    <div class="mi-stat-kv"><div class="v" id="val-msgs">0</div><div class="k">Messages</div></div>
                    <div class="mi-stat-kv"><div class="v" id="val-lim">196k</div><div class="k">Limit</div></div>
                </div>
            </div>
        </div>
        <div class="mi-diagnostics" id="mi-diag">
            <button class="mi-diag-toggle" id="mi-diag-toggle" type="button" aria-expanded="false" aria-controls="mi-diag-panel">
                <span class="mi-diag-title" id="mi-diag-title">Injection diagnostics</span>
                <span class="mi-diag-summary" id="mi-diag-summary">Default model · Not checked · None</span>
                <span class="mi-diag-chevron" aria-hidden="true"></span>
            </button>
            <div class="mi-diag-panel" id="mi-diag-panel" aria-hidden="true" inert>
                <div class="mi-diag-grid">
                    <span id="mi-diag-selected-k">Selected model</span>
                    <strong id="mi-diag-selected">Default model</strong>
                    <span id="mi-diag-last-k">Last rewrite</span>
                    <strong id="mi-diag-last">Not yet</strong>
                    <span id="mi-diag-effort-k">Thinking effort</span>
                    <strong id="mi-diag-effort">Disabled</strong>
                    <span id="mi-diag-route-k">Response model</span>
                    <strong id="mi-diag-route">Not checked</strong>
                    <span id="mi-diag-agent-k">Workspace Agent</span>
                    <strong id="mi-diag-agent">Not detected</strong>
                    <span id="mi-diag-packet-req-k">Request packet</span>
                    <strong id="mi-diag-packet-req">Not captured</strong>
                    <span id="mi-diag-packet-res-k">Response stream</span>
                    <strong id="mi-diag-packet-res">Not captured</strong>
                    <span id="mi-diag-pow-k">PoW detection</span>
                    <strong id="mi-diag-pow">Not observed</strong>
                    <span id="mi-diag-error-k">Failure reason</span>
                    <strong id="mi-diag-error">None</strong>
                </div>
                <div class="mi-diag-actions">
                    <button class="mi-link-btn" id="mi-export-packets" type="button">Export packet log</button>
                </div>
            </div>
        </div>
    </div>
    <div class="mi-foot">
        <button class="mi-link-btn" id="mi-btn-set" type="button">Settings</button>
        <div id="mi-sponsor-slot"></div>
    </div>
</section>
<section id="mi-set" class="mi-panel-view" aria-labelledby="mi-settings-title" aria-hidden="true" inert>
    <div class="mi-set-head">
        <button class="mi-set-close" id="mi-set-close" type="button" aria-label="Back to main panel">&#8592;</button>
        <h4 id="mi-settings-title">Settings</h4>
        <span class="mi-set-spacer" aria-hidden="true"></span>
    </div>
    <div class="mi-section-label" id="mi-theme-label">Theme color</div>
    <div class="mi-clrs" id="mi-clrs"></div>
    <div class="mi-color-row">
        <label>Custom color</label>
        <input type="color" id="mi-color-picker" value="#007aff">
        <input class="mi-inp" id="mi-color-hex" value="#007aff" placeholder="#HEX" maxlength="7">
    </div>
    <div class="mi-row" id="mi-lang-row">
        <label id="mi-lang-label">Language</label>
        <div id="mi-lang-picker" class="mi-lang-picker">
            <button id="mi-lang-trigger" class="mi-lang-trigger" type="button" aria-haspopup="listbox" aria-controls="mi-lang-menu" aria-expanded="false">
                <span id="mi-lang-current"></span>
            </button>
        </div>
    </div>
    <div class="mi-row mi-debug-row">
        <label id="mi-debug-label">Debug mode (open console for logs)</label>
        <button class="mi-sw mi-sw-compact" id="mi-sw-debug" type="button" role="switch" aria-checked="false"><span class="mi-sr-only">Debug mode</span></button>
    </div>
    <div class="mi-privacy-card">
        <div class="mi-row mi-debug-row">
            <div class="mi-privacy-head">
                <strong id="mi-privacy-spoof">IP spoofing</strong>
                <span id="mi-privacy-subtitle">Timezone &amp; language masking</span>
            </div>
            <button class="mi-sw mi-sw-compact" id="mi-sw-privacy" type="button" role="switch" aria-checked="false"><span class="mi-sr-only">IP spoofing</span></button>
        </div>
        <div class="mi-privacy-status" id="mi-privacy-status">Egress location not detected yet</div>
        <div class="mi-privacy-grid">
            <span class="mi-privacy-field-label" id="mi-privacy-tz-label">Timezone</span>
            <div id="mi-privacy-tz-picker" class="mi-lang-picker mi-privacy-picker">
                <button id="mi-privacy-tz-trigger" class="mi-lang-trigger mi-privacy-trigger" type="button" aria-haspopup="listbox" aria-controls="mi-privacy-tz-menu" aria-expanded="false">
                    <span id="mi-privacy-tz-current"></span>
                </button>
            </div>
            <span class="mi-privacy-field-label" id="mi-privacy-lang-label">Main language</span>
            <div id="mi-privacy-lang-picker" class="mi-lang-picker mi-privacy-picker">
                <button id="mi-privacy-lang-trigger" class="mi-lang-trigger mi-privacy-trigger" type="button" aria-haspopup="listbox" aria-controls="mi-privacy-lang-menu" aria-expanded="false">
                    <span id="mi-privacy-lang-current"></span>
                </button>
            </div>
        </div>
        <button class="mi-link-btn" id="mi-privacy-refresh" type="button">Redetect</button>
    </div>
    <div class="mi-settings-note">
        <strong id="mi-privacy-title">Privacy by default</strong>
        <span id="mi-privacy-body">Packet diagnostics stay in memory and are erased when debug mode is turned off.</span>
        <button class="mi-link-btn" id="mi-clear-diagnostics" type="button">Clear diagnostics</button>
    </div>
</section>
    </div>
    </div>
    <div id="mi-lang-menu" class="mi-lang-menu" role="listbox" aria-hidden="true" inert></div>
    <div id="mi-privacy-tz-menu" class="mi-lang-menu" role="listbox" aria-hidden="true" inert></div>
    <div id="mi-privacy-lang-menu" class="mi-lang-menu" role="listbox" aria-hidden="true" inert></div>
    <div id="mi-drop" aria-hidden="true" tabindex="-1"></div>
</div>
        `;

        document.body.appendChild(host);
        registerPanelMotionProperties();
        refs = { mi: host, ...Object.fromEntries([...host.querySelectorAll('[id]')].map(element => [element.id, element])) };
        applyUiText();

        ensureDefaultPosition();
        applyTheme();
        save('m', S.model);
        save('custom', S.custom);
        save('recent', S.recent);
        if (S.model === '') save('m', '');
        if (q('mi-color-picker')) q('mi-color-picker').value = S.bgColor;
        if (q('mi-color-hex')) q('mi-color-hex').value = S.bgColor;

        renderColors();
        renderSponsorModule();
        updateUIState();
        bindEvents();
        scheduleTokenUpdate(true);
        refreshWhenTokenizerReady();
        setupAutoTokenRefresh();
        scheduleWorkspaceAgentScan(300);
        scheduleDropdownWarmRender();

        if (isSupportedHost() && !S.api.length) window.setTimeout(fetchModels, LOAD_DELAY);
        requestAnimationFrame(() => {
            clampPosition();
            schedulePanelMotionPreparation(q('mi-p'));
            schedulePanelFirstPaintPreparation(q('mi-p'));
        });
    }

    function waitForBody(callback) {
        if (document.body) {
            callback();
            return;
        }

        const readyObserver = new MutationObserver(() => {
            if (!document.body) return;
            readyObserver.disconnect();
            callback();
        });

        readyObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (isSupportedHost()) {
        installStorageSync();
        if (IS_TOP_FRAME) installFetchHook();
    }
    if (IS_TOP_FRAME) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => waitForBody(createUI), { once: true });
        } else {
            waitForBody(createUI);
        }
    }

})();
