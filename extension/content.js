// ChatGPT Model Injector Extension Context Script

(function () {
    'use strict';

    const PREFIX = 'cgpt_v12_';
    const SCRIPT_BUILD = '2026-05-19-menu-filter-endpoint-guard';
    const PACKET_LOG_LIMIT = 160;
    const MODELS_ENDPOINT = '/backend-api/models';
    const ACCOUNT_ENDPOINT = '/backend-api/accounts/check';
    const CES_STATS_ENDPOINT = '/ces/statsc/flush';
    const SENTINEL_FINALIZE_ENDPOINT = '/backend-api/sentinel/chat-requirements/finalize';
    const WORKSPACE_AGENT_PREFIX = 'workspace-agent:';
    const HERMES_AGENT_PATH_RE = /\/backend-api\/hermes\/agent\/(agt_[a-z0-9_:-]+)(?:\/|$)/i;
    const AGENT_PAGE_PATH_RE = /\/agents\/a\/(agt_[a-z0-9_:-]+)/i;
    const CHAT_CONVERSATION_PATH_RE = /\/c\/([0-9a-f]{8}-[0-9a-f-]{20,})/i;
    const BACKEND_CONVERSATION_PATH_RE = /\/backend-api\/conversation\/([0-9a-f]{8}-[0-9a-f-]{20,})/i;
    const BUTTON_SIZE = 56;
    const VIEW_MARGIN = 12;
    const BUTTON_RING = 194.78;
    const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const COLORS = ['#007aff', '#2563eb', '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
    const EFFORTS = ['light', 'standard', 'extended', 'heavy'];
    const PRESETS = [
        ['auto', 'Auto', false, 'default'],
        ['gpt-5-5-pro', 'GPT-5.5 Pro', true, 'current'],
        ['gpt-5-5-thinking', 'GPT-5.5 Thinking', true, 'current'],
        ['gpt-5-3', 'GPT-5.3 Instant', false, 'current'],
        ['gpt-5-4-thinking', 'GPT-5.4 Thinking', true, 'current'],
        ['gpt-5-4-pro', 'GPT-5.4 Pro', true, 'current'],
        ['o3', 'o3', true, 'reasoning'],
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
        ['research', 'Deep Research', true, 'special'],
        ['agent-mode', 'Agent', false, 'special'],
        ['chatgpt_alpha_model_external_access_reserved_gate_13', 'Alpha', true, 'special']
    ];
    const MODELS_REQUEST_HEADER_ALLOWLIST = new Set([
        'accept',
        'accept-language',
        'authorization',
        'chatgpt-account-id',
        'oai-client-build-number',
        'oai-client-version',
        'oai-device-id',
        'oai-language',
        'oai-session-id',
        'x-oai-is',
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
    const MENU_LABELS = {
        auto: 'Auto',
        'gpt-5-5-pro': 'Pro',
        'gpt-5-5-thinking': 'Thinking',
        'gpt-5-4-pro': 'Pro',
        'gpt-5-4-thinking': 'Thinking',
        'gpt-5-4-t-mini': 'Thinking Mini',
        'gpt-5-3': 'Instant',
        'gpt-5-3-mini': 'Mini',
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
        'o3': 'o3',
        'o3-pro': 'o3-pro',
        'gpt-4.5': 'GPT-4.5',
        'gpt-4-5': 'GPT-4.5',
        research: 'Deep Research',
        'agent-mode': 'Agent',
        chatgpt_alpha_model_external_access_reserved_gate_13: 'Alpha'
    };
    const MODEL_MENU_SECTIONS = [
        {
            key: 'gpt',
            titleKey: 'section_gpt',
            families: [
                ['GPT-5.5', /^gpt-5-5(?:$|-)/i],
                ['GPT-5.4', /^gpt-5-4(?:$|-)/i],
                ['GPT-5.3', /^gpt-5-3(?:$|-)/i],
                ['GPT-5.2', /^gpt-5-2(?:$|-)/i],
                ['GPT-5.1', /^gpt-5-1(?:$|-)/i],
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
    const CHATGPT_ICON_PATH = 'm297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z';
    const PRESET_MAP = new Map(PRESETS.map(([id, name, thinking, group]) => [id, { id, name, thinking, group }]));
    const tokenCache = new Map();
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
    if (S.model === 'auto') S.model = '';
    if (isHiddenModelId(S.model)) S.model = '';
    if (Array.isArray(S.custom)) S.custom = S.custom.filter(id => !isHiddenModelId(id));
    if (Array.isArray(S.recent)) S.recent = S.recent.filter(id => !isHiddenModelId(id));

    let host = null;
    let refs = {};
    let modelsRequestSnapshot = null;
    let backendRequestHeadersSnapshot = null;
    let lastSentinelFinalize = null;
    let observer = null;
    let contextTimer = 0;
    let dragState = null;
    let suppressClick = false;
    let hookInstalled = false;
    let wrappedFetch = null;
    let wrappedSendBeacon = null;
    let wrappedXHROpen = null;
    let wrappedXHRSend = null;
    let fetchHookKeepalive = 0;
    let calcFeedbackTimer = 0;
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
        packetResponse: null
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
            title_enable: '启用注入',
            subtitle_enable: '覆盖请求',
            title_effort: '思考深度',
            subtitle_effort: '推理模型生效',
            title_context: '上下文用量',
            used: '已用',
            free: '剩余',
            messages: '消息',
            limit: '上限',
            settings: '设置',
            theme_color: '主题颜色',
            custom_color: '自定义颜色',
            debug_mode: '调试模式（打开控制台查看日志）',
            language: '语言',
            choose_model: '选择模型',
            refresh_list: '刷新列表',
            refresh_context: '刷新上下文统计',
            add_model: '添加模型 slug',
            support_dev: '感谢开发者',
            tooltip_context: '上下文长度',
            tooltip_reasoning: '推理类型',
            tooltip_version: '版本',
            online: '在线',
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
            title_enable: 'Enable override',
            subtitle_enable: 'Override request',
            title_effort: 'Thinking effort',
            subtitle_effort: 'Applies to reasoning models',
            title_context: 'Context usage',
            used: 'Used',
            free: 'Free',
            messages: 'Messages',
            limit: 'Limit',
            settings: 'Settings',
            theme_color: 'Theme color',
            custom_color: 'Custom color',
            debug_mode: 'Debug mode (open console for logs)',
            language: 'Language',
            choose_model: 'Choose model',
            refresh_list: 'Refresh list',
            refresh_context: 'Refresh context stats',
            add_model: 'Add model slug',
            support_dev: 'Support developer',
            tooltip_context: 'Context window',
            tooltip_reasoning: 'Reasoning mode',
            tooltip_version: 'Version',
            online: 'Online',
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
            title_enable: '上書きを有効化',
            subtitle_enable: 'リクエストを上書き',
            title_effort: '思考強度',
            subtitle_effort: '推論モデルのみ有効',
            title_context: 'コンテキスト使用量',
            used: '使用',
            free: '残り',
            messages: 'メッセージ',
            limit: '上限',
            settings: '設定',
            theme_color: 'テーマカラー',
            custom_color: 'カスタムカラー',
            debug_mode: 'デバッグモード（コンソールで確認）',
            language: '言語',
            choose_model: 'モデルを選択',
            refresh_list: '一覧を更新',
            refresh_context: 'コンテキストを更新',
            add_model: 'モデル slug を追加',
            support_dev: '開発者を支援',
            tooltip_context: 'コンテキスト長',
            tooltip_reasoning: '推論タイプ',
            tooltip_version: 'バージョン',
            online: 'オンライン',
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
            title_enable: 'Включить подмену',
            subtitle_enable: 'Переопределять запрос',
            title_effort: 'Глубина мышления',
            subtitle_effort: 'Только для reasoning-моделей',
            title_context: 'Использование контекста',
            used: 'Использовано',
            free: 'Осталось',
            messages: 'Сообщения',
            limit: 'Лимит',
            settings: 'Настройки',
            theme_color: 'Цвет темы',
            custom_color: 'Свой цвет',
            debug_mode: 'Режим отладки (смотрите консоль)',
            language: 'Язык',
            choose_model: 'Выберите модель',
            refresh_list: 'Обновить список',
            refresh_context: 'Обновить контекст',
            add_model: 'Добавить slug модели',
            support_dev: 'Поддержать разработчика',
            tooltip_context: 'Окно контекста',
            tooltip_reasoning: 'Режим рассуждения',
            tooltip_version: 'Версия',
            online: 'Онлайн',
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
        const value = readJson('packet_log', []);
        return Array.isArray(value) ? value : [];
    }
    function writePacketLog(entries) {
        saveJson('packet_log', Array.isArray(entries) ? entries.slice(-PACKET_LOG_LIMIT) : []);
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
                thinkingEfforts: sanitizeStringList(item.thinkingEfforts),
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
    function truncate(value, length) { const text = String(value || ''); return text.length > length ? `${text.slice(0, Math.max(0, length - 3))}...` : text; }
    function formatTokens(value) {
        const number = Number(value) || 0;
        if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
        if (number >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return String(Math.round(number));
    }
    function fmtTok(value) { return Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(Number(value) || 0)); }
    function sortModelEntries(a, b) { return COLLATOR.compare(a?.name || a?.id || '', b?.name || b?.id || ''); }
    function getApiEntry(id) { return S.api.find(item => item.id === id) || null; }
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
        if (isWorkspaceAgentSelection(id)) return getWorkspaceAgent(getWorkspaceAgentId(id))?.name || getWorkspaceAgentId(id) || id;
        return getApiEntry(id)?.name || PRESET_MAP.get(id)?.name || id;
    }
    function isSupportedHost() { return /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i.test(location.hostname); }
    function isThinkingModel(id, entry) {
        if (!id) return false;
        const model = entry || getApiEntry(id);
        if (model?.reasoning && !/^(none|auto)$/i.test(model.reasoning)) return true;
        return Boolean(PRESET_MAP.get(id)?.thinking || /(^o[1-4])|thinking|reasoning|(?:^|-)t-mini$|(?:^|-)pro$|alpha/i.test(id));
    }
    function mapEffort(value) { return value === 'light' ? 'min' : value === 'heavy' ? 'max' : value || 'standard'; }
    function touchRecent(id) {
        if (!id || isHiddenModelId(id)) return;
        S.recent = [id, ...S.recent.filter(item => item !== id)].slice(0, 6);
        saveJson('recent', S.recent);
    }
    function getEffectiveLimit() { return Number(isWorkspaceAgentSelection(S.model) ? 0 : getApiEntry(S.model)?.tokens) || 196000; }
    function getToneColor(pct) { return pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : S.bgColor; }
    function trimCache() {
        if (tokenCache.size <= 600) return;
        const keys = [...tokenCache.keys()];
        for (let index = 0; index < 200; index += 1) tokenCache.delete(keys[index]);
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
        const text = preferred?.innerText || preferred?.textContent || node.innerText || node.textContent || '';
        return cleanMessageText(text);
    }
    function collectMessages() {
        const byRole = Array.from(document.querySelectorAll('[data-message-author-role]'));
        if (byRole.length) {
            return byRole.map(node => ({
                role: node.getAttribute('data-message-author-role') || 'user',
                content: extractMessageText(node)
            })).filter(item => item.content);
        }

        const articles = Array.from(document.querySelectorAll('main article, article[data-testid*="conversation-turn"], [data-testid^="conversation-turn-"]'));
        if (articles.length) {
            return articles.map((node, index) => ({
                role: index % 2 === 0 ? 'user' : 'assistant',
                content: extractMessageText(node)
            })).filter(item => item.content);
        }

        return [];
    }
    function getTokenizerApi() {
        const tokenizer = window.GPTTokenizer_o200k_base;
        return tokenizer && typeof tokenizer === 'object' ? tokenizer : null;
    }
    function estimateTextTokens(text) {
        if (!text) return 0;
        if (tokenCache.has(text)) return tokenCache.get(text);

        let tokens = 0;
        try {
            const tokenizer = getTokenizerApi();
            if (tokenizer?.countTokens) tokens = tokenizer.countTokens(text);
            else if (tokenizer?.encode) tokens = tokenizer.encode(text).length;
            else tokens = Math.ceil(text.length / 4);
        } catch {
            tokens = Math.ceil(text.length / 4);
        }

        tokenCache.set(text, tokens);
        trimCache();
        return tokens;
    }
    function countConversationTokens() {
        const messages = collectMessages();
        let plain = 0;
        for (const message of messages) plain += estimateTextTokens(`${message.role}\n${message.content}`) + 4;
        return { msgs: messages.length, plain, chat: null };
    }
    function updateContextRing(pct) {
        const ring = q('mi-ring-fg');
        if (!ring) return;
        const offset = BUTTON_RING - (pct / 100) * BUTTON_RING;
        ring.setAttribute('stroke-dashoffset', String(offset));
        ring.style.stroke = getToneColor(pct);

        const panelRing = q('tok-path');
        if (panelRing) {
            panelRing.setAttribute('stroke-dasharray', `${pct}, 100`);
            panelRing.style.stroke = getToneColor(pct);
        }
    }
    function recalcTokens() {
        const { msgs, plain, chat } = countConversationTokens();
        const used = chat ?? plain;
        const limit = getEffectiveLimit();
        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
        const remaining = Math.max(0, limit - used);

        lastStats = { msgs, plain, chat, used, limit, pct };

        if (q('val-used')) q('val-used').textContent = formatTokens(used);
        if (q('val-free')) q('val-free').textContent = formatTokens(remaining);
        if (q('val-msgs')) q('val-msgs').textContent = String(msgs);
        if (q('val-lim')) q('val-lim').textContent = formatTokens(limit);
        if (q('tok-pct')) q('tok-pct').textContent = `${Math.round(pct)}%`;

        updateContextRing(pct);
    }
    function scheduleTokenUpdate(immediate = false) {
        if (contextTimer) window.clearTimeout(contextTimer);
        contextTimer = window.setTimeout(recalcTokens, immediate ? 0 : 500);
    }
    function setupAutoTokenRefresh() {
        if (observer || !document.body) return;
        observer = new MutationObserver(records => {
            let relevant = false;
            let shouldScanAgents = false;
            for (const record of records) {
                const target = record.target && record.target.nodeType === 1 ? record.target : record.target?.parentElement;
                if (target?.closest?.('#mi')) continue;
                if (record.type === 'characterData') {
                    const parent = record.target?.parentElement;
                    if (parent?.closest?.('[data-message-author-role], article, main')) {
                        relevant = true;
                        break;
                    }
                }
                if (record.addedNodes?.length || record.removedNodes?.length) {
                    relevant = true;
                    shouldScanAgents = true;
                    break;
                }
            }
            if (relevant) scheduleTokenUpdate();
            if (shouldScanAgents) scheduleWorkspaceAgentScan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    let agentScanTimer = 0;
    let modelMenuQuery = '';
    let modelMenuAgentOnly = false;

    function mergeSourceValue(previous, next) {
        const parts = new Set(String(previous || '').split('+').filter(Boolean));
        if (next) parts.add(next);
        return [...parts].join('+') || next || previous || 'page';
    }

    function registerWorkspaceAgent(agent, source = 'page') {
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
        saveJson('agents', S.agents);
        saveValue('laf', S.lastAgentFetch);
        renderDropdown();
        renderRecent();
        updateInfo();
        updateDiagnostics();
        log('Workspace agent captured', next);
        return true;
    }

    function getTextLabel(node) {
        return String(node?.innerText || node?.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
    }

    function scanWorkspaceAgentsFromPage() {
        if (!isSupportedHost() || !document.body) return 0;
        let count = 0;
        const seen = new Set();
        const selectors = [
            'a[href*="/agents/a/"]',
            '[href*="/agents/a/"]',
            '[data-href*="/agents/a/"]'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(node => {
            const href = node.getAttribute?.('href') || node.getAttribute?.('data-href') || '';
            const match = href.match(AGENT_PAGE_PATH_RE);
            if (!match || seen.has(match[1])) return;
            seen.add(match[1]);
            const label = getTextLabel(node) || getTextLabel(node.closest?.('li, [role="menuitem"], [role="treeitem"], [data-testid], div')) || match[1];
            if (registerWorkspaceAgent({ id: match[1], name: label }, 'page')) count += 1;
        });

        const current = location.pathname.match(AGENT_PAGE_PATH_RE);
        if (current && !seen.has(current[1])) {
            const title = (document.title || '').replace(/\s*\|\s*ChatGPT.*$/i, '').trim();
            if (registerWorkspaceAgent({ id: current[1], name: title || current[1] }, 'page')) count += 1;
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
            }, 'page')) count += 1;
        }

        return count;
    }

    function scheduleWorkspaceAgentScan(delay = 800) {
        if (agentScanTimer) window.clearTimeout(agentScanTimer);
        agentScanTimer = window.setTimeout(() => {
            agentScanTimer = 0;
            scanWorkspaceAgentsFromPage();
        }, delay);
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
            value.slice(0, 120).forEach(item => collectConversationIds(item, out, depth + 1));
            return out;
        }
        for (const [key, nested] of Object.entries(value)) {
            if (/^(id|conversation_id|conversationId|conversation|conversation_uuid|conversationUuid)$/i.test(key)) {
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
            value.slice(0, 80).forEach(item => collectWorkspaceAgentRecords(item, fallbackId, out, depth + 1));
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
            if (/prompt|instructions?|system_message/i.test(key)) continue;
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
            if (registerWorkspaceAgent(agent, source)) count += 1;
        });
        return count;
    }

    function findWorkspaceAgentMarker(value, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 8) return null;
        if (Array.isArray(value)) {
            for (const item of value.slice(0, 120)) {
                const marker = findWorkspaceAgentMarker(item, depth + 1);
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
            if (/prompt|content|text|parts/i.test(key)) continue;
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
            for (const item of value.slice(0, 160)) {
                const marker = findWorkspaceAgentRuntimeMarker(item, depth + 1);
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
        if (/custom[_-]?agent[_-]?run/i.test(kind)) {
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
            if (/^(system_hints|systemHints)$/i.test(key)) continue;
            if (/custom[_-]?agent[_-]?run/i.test(key)) {
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
            for (const item of value.slice(0, 160)) {
                const marker = findWorkspaceAgentAuthorMarker(item, depth + 1);
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
            if (/^(content|parts|text|message|messages)$/i.test(key) && typeof nested === 'string') continue;
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
            return `${resolved.pathname}${resolved.search}`;
        } catch {
            return url;
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

    function normalizeApiModels(payload) {
        const models = Array.isArray(payload) ? payload : payload?.models;
        const categoryIndex = buildCategoryIndex(Array.isArray(payload) ? [] : payload?.categories);
        const versionIndex = buildVersionIndex(Array.isArray(payload) ? [] : payload?.versions);
        const unique = new Map();
        for (const model of models || []) {
            const slug = typeof model?.slug === 'string' ? model.slug : '';
            if (slug) unique.set(slug, model);
        }

        return [...unique.values()].map(model => ({
            id: model.slug,
            name: model.title || model.slug,
            tokens: Number(model.max_tokens) > 0 ? Number(model.max_tokens) : 0,
            desc: model.description || '',
            tools: sanitizeStringList(model.enabled_tools || []),
            reasoning: model.reasoning_type || '',
            configurableEffort: Boolean(model.configurable_thinking_effort),
            thinkingEfforts: sanitizeStringList(model.thinking_efforts || []),
            category: categoryIndex.get(model.slug)?.category || '',
            categoryName: categoryIndex.get(model.slug)?.human_category_name || '',
            categoryLabel: categoryIndex.get(model.slug)?.human_category_short_name || '',
            categoryLane: categoryIndex.get(model.slug)?.model_lane || '',
            version: versionIndex.get(model.slug)?.id || categoryIndex.get(model.slug)?.model_version || '',
            versionLabel: versionIndex.get(model.slug)?.display_text || '',
            shortExplainer: categoryIndex.get(model.slug)?.short_explainer || '',
            tagline: categoryIndex.get(model.slug)?.tagline || ''
        })).sort(sortModelEntries);
    }

    function ingestApiModels(payload, options = {}) {
        const normalized = sanitizeApiList(normalizeApiModels(payload));
        if (!normalized.length) return false;

        S.api = normalized;
        S.lastFetch = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveJson('api', S.api);
        saveValue('lf', S.lastFetch);

        log(options.fromHook ? 'API models updated from hook' : 'API models loaded', S.api.length);
        renderDropdown();
        renderRecent();
        updateInfo();
        updateModelLabel();
        recalcTokens();
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

    function getStructuredAgentSignal(value, depth = 0) {
        if (typeof value === 'string') return getAgentIdFromSystemHint(value) ? 'system_hints.custom_agent' : '';
        if (!value || typeof value !== 'object' || depth > 3) return '';
        if (Array.isArray(value)) {
            for (const item of value.slice(0, 20)) {
                const signal = getStructuredAgentSignal(item, depth + 1);
                if (signal) return signal;
            }
            return '';
        }

        const ignoredContentKeys = new Set(['messages', 'content', 'parts', 'text', 'prompt']);
        const structuralKeys = [
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

        for (const key of structuralKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) return key;
        }

        for (const [key, nested] of Object.entries(value)) {
            if (ignoredContentKeys.has(key)) continue;
            if (/^(system_hints|systemHints)$/i.test(key)) {
                const id = getAgentIdFromSystemHints(nested);
                if (id) return `${key}.custom_agent`;
            }
            if (/^(metadata|client_contextual_info|conversation_mode|conversationMode|system_hints|systemHints|mode|tools?|selected_tools|selectedTools|enabled_tools|enabledTools|features?|workspace|gizmo|assistant)$/i.test(key)) {
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
            const inputs = [...document.querySelectorAll('[contenteditable="true"][role="textbox"], textarea')]
                .filter(isVisibleElement)
                .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
            const input = inputs[0];
            if (!input) return null;

            let root = input.closest('form') || input.parentElement;
            const roots = [];
            for (let i = 0; root && i < 8; i += 1, root = root.parentElement) {
                roots.push(root);
                const anchors = [...root.querySelectorAll('a[href*="/agents/a/"]')].filter(isVisibleElement);
                const anchor = anchors[0];
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
                const text = (candidateRoot.innerText || candidateRoot.textContent || '').replace(/\s+/g, ' ').trim();
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

            const inputRect = input.getBoundingClientRect();
            const nearbyVisible = [...document.querySelectorAll('button, [role="button"], a, [data-testid], span, div')]
                .filter(isVisibleElement)
                .filter(element => {
                    const rect = element.getBoundingClientRect();
                    const verticalGap = Math.min(Math.abs(rect.bottom - inputRect.top), Math.abs(rect.top - inputRect.bottom));
                    return rect.bottom >= inputRect.top - 90
                        && rect.top <= inputRect.bottom + 24
                        && rect.left <= inputRect.right + 40
                        && rect.right >= inputRect.left - 40
                        && verticalGap <= 90;
                });
            for (const element of nearbyVisible) {
                const matched = findKnownAgentInText(element.innerText || element.textContent || '');
                if (matched) {
                    return {
                        id: matched.id,
                        name: matched.name,
                        source: 'composer-nearby-text'
                    };
                }
            }

            for (const candidateRoot of roots) {
                const text = (candidateRoot.innerText || candidateRoot.textContent || '').replace(/\s+/g, ' ').trim();
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

    function getRewriteBlockReason(payload) {
        const kind = getConversationModeKind(payload);
        if (kind && kind !== 'primary_assistant') return `conversation_mode=${kind}`;

        const structuredAgentSignal = getStructuredAgentSignal(payload);
        if (structuredAgentSignal) return `agent_signal=${structuredAgentSignal}`;

        if (!isWorkspaceAgentSelection(S.model)) {
            const conversationId = getConversationIdFromValue(payload?.conversation_id || payload?.conversationId) || getCurrentConversationId();
            const conversationAgent = getWorkspaceAgentForConversation(conversationId);
            if (conversationAgent) return `conversation_agent_history=${conversationAgent.id}`;
        }

        const composerAgent = getActiveComposerWorkspaceAgent();
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

    function buildConversationRequestPacket(payload, stage = 'before') {
        const rootHints = normalizeSystemHints(payload.system_hints ?? payload.systemHints);
        const messageHints = Array.isArray(payload.messages)
            ? payload.messages.flatMap(message => normalizeSystemHints(message?.metadata?.system_hints ?? message?.metadata?.systemHints))
            : [];
        const messageMetadataKeys = Array.isArray(payload.messages)
            ? [...new Set(payload.messages.flatMap(message => Object.keys(message?.metadata || {})))]
            : [];
        const composerAgent = getActiveComposerWorkspaceAgent();
        const runtimeMarker = findWorkspaceAgentRuntimeMarker(payload);
        const hintMarker = findWorkspaceAgentMarker(payload);
        const packet = {
            stage,
            model: payload.model || null,
            selectedModel: S.model || null,
            conversationMode: getConversationModeKind(payload) || null,
            rootSystemHints: rootHints,
            messageSystemHints: [...new Set(messageHints)],
            rootKeys: Object.keys(payload).slice(0, 80),
            messageMetadataKeys: messageMetadataKeys.slice(0, 80),
            composerAgent: composerAgent ? { id: composerAgent.id, name: composerAgent.name || composerAgent.id } : null,
            runtimeAgent: runtimeMarker ? { id: runtimeMarker.id, name: runtimeMarker.name || runtimeMarker.id, source: runtimeMarker.source || '' } : null,
            hintAgent: hintMarker ? { id: hintMarker.id, name: hintMarker.name || hintMarker.id, source: hintMarker.source || '' } : null,
            forceParallelSwitch: payload.force_parallel_switch || payload.forceParallelSwitch || null,
            agentSignal: getStructuredAgentSignal(payload) || null,
            action: payload.action || null,
            clientPrepareState: payload.client_prepare_state || payload.clientPrepareState || null,
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        return packet;
    }

    function sanitizeUrlForLog(url) {
        try {
            const parsed = new URL(String(url || ''), location.origin);
            return `${parsed.pathname}${parsed.search}`;
        } catch {
            return String(url || '').slice(0, 240);
        }
    }

    function isConversationEndpointUrl(url) {
        return /\/backend-api\/f\/conversation(?:\?|$)|\/backend-api\/conversation(?:\?|$)/.test(String(url || ''));
    }

    function appendPacketLog(kind, packet, extra = {}) {
        try {
            const entry = {
                kind,
                build: SCRIPT_BUILD,
                time: new Date().toISOString(),
                page: sanitizeUrlForLog(location.href),
                selected: S.model || '',
                enabled: Boolean(S.on),
                packet: packet || null,
                extra: extra && typeof extra === 'object' ? extra : {}
            };
            const next = [...readPacketLog(), entry].slice(-PACKET_LOG_LIMIT);
            writePacketLog(next);
            document.documentElement.setAttribute('data-mi-packet-log-size', String(next.length));
        } catch (error) {
            log('Packet log write failed', { error: error?.message || String(error) });
        }
    }

    async function captureSentinelFinalize(input, init, url, response) {
        if (!String(url || '').includes(SENTINEL_FINALIZE_ENDPOINT)) return;
        const bodyText = await getRequestBodyText(input, init);
        const payload = parseJsonMaybe(bodyText);
        const headerValue = response?.headers?.get?.('x-oai-is-update') || '';
        const record = {
            endpoint: SENTINEL_FINALIZE_ENDPOINT,
            status: response?.status || 0,
            ok: Boolean(response?.ok),
            hasOaiIsUpdate: Boolean(headerValue),
            oaiIsUpdatePrefix: headerValue ? headerValue.slice(0, 12) : '',
            oaiIsUpdateLength: headerValue.length || 0,
            requestKeys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 40) : [],
            at: Date.now()
        };
        lastSentinelFinalize = record;
        appendPacketLog('sentinel-finalize', null, record);
        log('Sentinel finalize captured', record);
    }

    function getSentinelFinalizeSummary() {
        if (!lastSentinelFinalize?.at) return null;
        return {
            status: lastSentinelFinalize.status || 0,
            ok: Boolean(lastSentinelFinalize.ok),
            hasOaiIsUpdate: Boolean(lastSentinelFinalize.hasOaiIsUpdate),
            ageMs: Math.max(0, Date.now() - lastSentinelFinalize.at)
        };
    }

    function exportPacketLog() {
        try {
            const payload = {
                build: SCRIPT_BUILD,
                exportedAt: new Date().toISOString(),
                page: sanitizeUrlForLog(location.href),
                selected: S.model || '',
                enabled: Boolean(S.on),
                currentDiagnostic: injectionDiagnostic,
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

    function rewriteConversationPayload(payload) {
        if (!(S.on && S.model) || !payload || typeof payload !== 'object') return null;
        if (!isConversationTurnPayload(payload)) return null;
        const blockReason = getRewriteBlockReason(payload);
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
            thinkingEffort: '',
            effortApplied: false,
            removedThinkingEffort: false
        };
        payload.model = S.model;
        if (S.effortOn && isThinkingModel(S.model)) {
            rewriteInfo.thinkingEffort = mapEffort(S.effort);
            rewriteInfo.effortApplied = true;
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

        const rewriteInfo = rewriteConversationPayload(payload);
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
            packetRequest: buildConversationRequestPacket(payload, 'after-model-rewrite'),
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

        const rewriteInfo = rewriteConversationPayload(payload);
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
            packetRequest: buildConversationRequestPacket(payload, 'xhr-after-model-rewrite'),
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

    function extractErrorFromObject(value) {
        if (!value || typeof value !== 'object') return '';
        if (Array.isArray(value)) {
            return sanitizeErrorText(value.map(item => extractErrorFromObject(item) || item).filter(Boolean).join('; '));
        }
        const keys = ['error', 'message', 'detail', 'details', 'reason', 'title', 'description', 'code'];
        for (const key of keys) {
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

    function collectModelFields(value, out = new Set()) {
        if (!value || typeof value !== 'object') return out;
        if (Array.isArray(value)) {
            value.forEach(item => collectModelFields(item, out));
            return out;
        }

        const keys = [
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
        ];
        for (const [key, nested] of Object.entries(value)) {
            if (keys.includes(key) && typeof nested === 'string' && /^[a-z0-9][\w.-]{1,120}$/i.test(nested)) {
                out.add(nested);
            }
            if (nested && typeof nested === 'object') collectModelFields(nested, out);
        }
        return out;
    }

    function extractResponseModel(sample, requestedModel = '') {
        const text = String(sample || '').trim();
        if (!text) return '';

        const candidates = collectModelFields(parseJsonMaybe(text));
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!/^data:/i.test(trimmed)) continue;
            const data = trimmed.replace(/^data:\s*/i, '').trim();
            if (!data || data === '[DONE]') continue;
            collectModelFields(parseJsonMaybe(data), candidates);
        }

        const values = [...candidates].filter(Boolean);
        if (!values.length) return '';
        return values.find(value => requestedModel && value !== requestedModel) || values[0];
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
        registerWorkspaceAgent({
            id: evidence.marker.id,
            name: evidence.marker.name,
            conversations: getCurrentConversationId() ? [getCurrentConversationId()] : [],
            lastConversationId: getCurrentConversationId()
        }, evidence.marker.source || 'stream');
        injectionDiagnostic = {
            ...injectionDiagnostic,
            packetResponse: {
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
        if (!String(url || '').includes(CES_STATS_ENDPOINT)) return;
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

    function updateRewriteFailure(diagnostic, errorText) {
        if (diagnostic?.at && injectionDiagnostic.at && diagnostic.at !== injectionDiagnostic.at) return;
        injectionDiagnostic = {
            ...injectionDiagnostic,
            ...(diagnostic || {}),
            responseModel: injectionDiagnostic.responseModel || diagnostic?.responseModel || '',
            routeStatus: injectionDiagnostic.routeStatus || diagnostic?.routeStatus || 'unknown',
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
            routeStatus: exposed ? (requested && exposed !== requested ? 'routed' : 'same') : 'hidden',
            error: injectionDiagnostic.error || ''
        };
        updateDiagnostics();
        log('Rewrite route observed', {
            requestedModel: requested || null,
            responseModel: exposed || null,
            routeStatus: injectionDiagnostic.routeStatus
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
            updateRewriteRoute(diagnostic, extractResponseModel(sample, diagnostic?.lastModel || ''));
            const failure = formatHttpFailure(response, sample);
            updateRewriteFailure(diagnostic, failure);
            log('Rewrite response failed', { status: response.status, statusText: response.statusText, failure });
            return;
        }

        updateRewriteFailure(diagnostic, '');
        if (/text\/event-stream|application\/x-ndjson/i.test(contentType)) {
            readResponseSample(response, 12000).then(sample => {
                const responseModel = extractResponseModel(sample, diagnostic?.lastModel || '');
                updateRewriteRoute(diagnostic, responseModel);
                observeWorkspaceAgentStreamSample(sample, { ...diagnostic, responseModel });
                const streamFailure = extractResponseError(sample, true);
                if (streamFailure) updateRewriteFailure(diagnostic, streamFailure);
            }).catch(error => log('Stream response observer failed', error));
        } else if (/json/i.test(contentType)) {
            readResponseSample(response, 4000).then(sample => {
                const responseModel = extractResponseModel(sample, diagnostic?.lastModel || '');
                updateRewriteRoute(diagnostic, responseModel);
                observeWorkspaceAgentStreamSample(sample, { ...diagnostic, responseModel });
            }).catch(error => log('JSON response observer failed', error));
        } else {
            updateRewriteRoute(diagnostic, '');
        }
    }

    function observeConversationStreamResponse(url, response) {
        if (!isConversationEndpointUrl(url) || !response?.ok) return;
        const contentType = response.headers?.get?.('content-type') || '';
        if (!/text\/event-stream|application\/x-ndjson|json/i.test(contentType)) return;
        readResponseSample(response, 12000).then(sample => {
            observeWorkspaceAgentStreamSample(sample, { responseModel: extractResponseModel(sample, injectionDiagnostic.lastModel || S.model || '') });
        }).catch(error => log('Conversation stream observer failed', error));
    }

    function captureModelsRequest(input, init, url) {
        if (!url.includes(MODELS_ENDPOINT)) return;
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

        modelsRequestSnapshot = {
            url: getRelativeUrl(url),
            headers: [...headers.entries()]
        };
    }

    function captureBackendRequestHeaders(input, init, url) {
        if (!/\/backend-api\//.test(url || '')) return;
        const headers = pickHeaders(
            mergeHeaders(input instanceof Request ? input.headers : null, init?.headers),
            MODELS_REQUEST_HEADER_ALLOWLIST
        );
        if (!headers.size) return;
        backendRequestHeadersSnapshot = [...headers.entries()];
    }

    function buildModelsRequestConfig() {
        const isGizmo = /^\/g\//.test(location.pathname);
        const baseUrl = modelsRequestSnapshot?.url || `${MODELS_ENDPOINT}?iim=false&is_gizmo=${isGizmo}`;
        const requestUrl = new URL(baseUrl, location.origin);
        if (!requestUrl.searchParams.has('iim')) requestUrl.searchParams.set('iim', 'false');
        if (!requestUrl.searchParams.has('is_gizmo')) requestUrl.searchParams.set('is_gizmo', String(isGizmo));

        const headers = new Headers(backendRequestHeadersSnapshot || []);
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
        const usingCachedHeaders = !modelsRequestSnapshot && Boolean(backendRequestHeadersSnapshot?.length);
        setModelSyncStatus(usingCachedHeaders ? 'cached' : 'syncing');
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

    function captureAccountInfo(response) {
        if (!window.MI_CONFIG?.advanced?.fetchAccountInfo) return;
        response.clone().json().then(data => {
            window.__MI_ACCOUNT_INFO = {
                accountPlan: data?.account_plan?.plan_type || 'Unknown',
                hasPaymentMethod: Boolean(data?.account_plan?.has_payment_method),
                features: data?.features || [],
                accountId: data?.accounts?.default?.id || 'Unknown'
            };
        }).catch(() => {});
    }

    function installFetchHook() {
        if (hookInstalled || !nativeFetch) return;
        hookInstalled = true;

        wrappedFetch = async function (input, init) {
            try {
                const url = getFetchUrl(input);
                captureCesStatsRequest(input, init, url, 'fetch').catch(error => log('CES fetch capture failed', error));
                captureBackendRequestHeaders(input, init, url);
                captureConversationRequestPacket(input, init, url, 'before-rewrite').catch(error => log('Conversation request capture failed', error));

                if (url.includes(MODELS_ENDPOINT)) {
                    captureModelsRequest(input, init, url);
                    const response = await nativeFetch(input, init);
                    response.clone().json().then(data => ingestApiModels(data, { fromHook: true })).catch(() => {});
                    return response;
                }

                if (url.includes(ACCOUNT_ENDPOINT)) {
                    const response = await nativeFetch(input, init);
                    captureAccountInfo(response);
                    return response;
                }

                if (url.includes(SENTINEL_FINALIZE_ENDPOINT)) {
                    const response = await nativeFetch(input, init);
                    captureSentinelFinalize(input, init, url, response).catch(error => log('Sentinel finalize capture failed', error));
                    return response;
                }

                const rewritten = await rewriteConversationRequest(input, init, url);
                if (rewritten) {
                    if (rewritten.blocked) return nativeFetch(input, init);
                    const response = await nativeFetch(...rewritten.args);
                    observeWorkspaceAgentResponse(url, response);
                    observeRewriteResponse(response, rewritten.diagnostic).catch(error => {
                        updateRewriteFailure(rewritten.diagnostic, error?.message || String(error));
                        log('Rewrite response observer failed', error);
                    });
                    return response;
                }

                const response = await nativeFetch(input, init);
                observeWorkspaceAgentResponse(url, response);
                observeConversationStreamResponse(url, response);
                return response;
            } catch (error) {
                injectionDiagnostic.error = error?.message || String(error);
                updateDiagnostics();
                log('Fetch hook failed', error);
            }

            return nativeFetch(input, init);
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
                            const responseModel = extractResponseModel(sample, rewritten.diagnostic?.lastModel || '');
                            if (responseModel) updateRewriteRoute(rewritten.diagnostic, responseModel);
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
        }, 1500);
    }

    function applyTheme() {
        if (!host) return;
        host.style.setProperty('--mi-bg', S.bgColor);
        host.style.setProperty('--mi-bg-rgb', hexToRgb(S.bgColor));
    }

    function updateBackdrop() {
        const open = q('mi-p')?.classList.contains('show') || q('mi-set')?.classList.contains('show');
        const backdrop = q('mi-backdrop');
        if (!backdrop) return;
        backdrop.classList.toggle('show', Boolean(open));
        if (!open) backdrop.classList.add('hiding');
        else backdrop.classList.remove('hiding');
    }

    function closeDropdown(animate = true) {
        const wrap = q('mi-sel-wrap');
        const drop = q('mi-drop');
        if (!wrap || !drop || !drop.classList.contains('show')) return;
        wrap.classList.remove('open');
        if (!animate) {
            drop.classList.remove('show', 'hiding');
            return;
        }
        drop.classList.add('hiding');
        drop.classList.remove('show');
        window.setTimeout(() => drop.classList.remove('hiding'), 180);
    }

    function focusMenuSearch() {
        const search = host?.querySelector('#mi-menu-search');
        if (!search) return;
        search.focus();
        const pos = search.value.length;
        search.setSelectionRange(pos, pos);
    }

    function openDropdown(focusSearch = false) {
        scanWorkspaceAgentsFromPage();
        renderDropdown();
        q('mi-sel-wrap')?.classList.add('open');
        q('mi-drop')?.classList.remove('hiding');
        q('mi-drop')?.classList.add('show');
        if (focusSearch) requestAnimationFrame(focusMenuSearch);
    }

    function openWorkspaceAgentQuickMenu() {
        modelMenuQuery = '/';
        modelMenuAgentOnly = true;
        scanWorkspaceAgentsFromPage();
        renderDropdown();
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
            setHostPosition(x, y, persist);
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
        const panelWidth = panel.offsetWidth || (panel.id === 'mi-set' ? 320 : 380);
        const panelHeight = panel.offsetHeight || 420;
        const gap = 16;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const targetLeft = clamp(anchorRect.right - panelWidth, VIEW_MARGIN, viewportWidth - panelWidth - VIEW_MARGIN);
        let targetTop = anchorRect.top - panelHeight - gap;
        let originY = `calc(100% + ${gap}px)`;

        if (targetTop < VIEW_MARGIN) {
            targetTop = anchorRect.bottom + gap;
            originY = `-${gap}px`;
        }
        targetTop = clamp(targetTop, VIEW_MARGIN, viewportHeight - panelHeight - VIEW_MARGIN);

        const originX = clamp(anchorRect.left + (anchorRect.width / 2) - targetLeft, 24, panelWidth - 24);
        panel.style.left = `${Math.round(targetLeft - hostRect.left)}px`;
        panel.style.top = `${Math.round(targetTop - hostRect.top)}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transformOrigin = `${Math.round(originX)}px ${originY}`;
    }

    function showPanel(panel) {
        if (!panel) return;
        positionFloatingPanel(panel);
        panel.classList.remove('hiding');
        panel.classList.add('show');
        if (panel.id === 'mi-p') q('mi-b')?.classList.add('panel-open');
        q('mi-backdrop')?.classList.remove('hiding');
        updateBackdrop();
    }

    function hidePanel(panel, callback) {
        if (!panel || !panel.classList.contains('show')) {
            if (callback) callback();
            return;
        }
        panel.classList.add('hiding');
        panel.classList.remove('show');
        if (panel.id === 'mi-p') q('mi-b')?.classList.remove('panel-open');
        updateBackdrop();
        window.setTimeout(() => {
            panel.classList.remove('hiding');
            if (callback) callback();
        }, panel.id === 'mi-p' ? 300 : 250);
    }

    function togglePanel(panel) {
        if (!panel) return;
        if (panel.classList.contains('show')) hidePanel(panel);
        else showPanel(panel);
    }

    function renderColors() {
        const container = q('mi-clrs');
        if (!container) return;
        container.innerHTML = COLORS.map(color => `<button type="button" class="mi-clr ${color === S.bgColor ? 'active' : ''}" data-color="${color}" style="background:${color}" aria-label="${color}"></button>`).join('');
    }

    function renderSponsorModule() {
        const slot = q('mi-sponsor-slot');
        const sponsor = window.MI_CONFIG?.sponsor;
        if (!slot) return;
        if (!sponsor?.enabled || !sponsor.href) {
            slot.innerHTML = '';
            return;
        }

        const target = sponsor.newTab === false ? '_self' : '_blank';
        const rel = target === '_blank' ? 'noopener noreferrer' : '';
        const label = sponsor.useI18nLabel === false ? (sponsor.label || t('support_dev')) : t('support_dev');
        const title = sponsor.useI18nLabel === false ? (sponsor.title || label) : t('support_dev');
        slot.innerHTML = `
            <a class="mi-sponsor" href="${escapeHtml(sponsor.href)}" target="${target}" rel="${rel}" title="${escapeHtml(title)}">
                <span class="mi-sponsor-icon">+</span>
                <span class="mi-sponsor-text">${escapeHtml(label)}</span>
            </a>
        `;
    }

    function renderLanguageOptions() {
        const current = q('mi-lang-current');
        const menu = q('mi-lang-menu');
        if (!current || !menu) return;

        const currentLabel = LANGUAGE_OPTIONS.find(([value]) => value === S.lang)?.[1] || LANGUAGE_OPTIONS[0][1];
        current.textContent = currentLabel;
        menu.innerHTML = LANGUAGE_OPTIONS.map(([value, label]) => `
            <button type="button" class="mi-lang-option ${value === S.lang ? 'active' : ''}" data-lang="${value}" role="option" aria-selected="${value === S.lang}">
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
        updateInfo();
    }

    function getDiagnosticEffortText() {
        const hasRewrite = Boolean(injectionDiagnostic.at);
        const enabled = hasRewrite ? injectionDiagnostic.effortEnabled : S.effortOn;
        const requested = (hasRewrite ? injectionDiagnostic.effortRequested : S.effort) || 'standard';
        const label = t(`effort_${requested}`);
        if (!enabled) return t('effort_disabled');
        if (!injectionDiagnostic.effortApplied) return `${t('effort_not_applied')} / ${label}`;
        return `${injectionDiagnostic.thinkingEffort || mapEffort(requested)} / ${label}`;
    }

    function getDiagnosticRouteText() {
        if (!injectionDiagnostic.at) return t('route_unknown');
        if (injectionDiagnostic.routeStatus === 'skipped') return t('route_skipped');
        if (!injectionDiagnostic.responseModel) return t(injectionDiagnostic.routeStatus === 'hidden' ? 'route_hidden' : 'route_unknown');
        return `${injectionDiagnostic.responseModel} / ${t(injectionDiagnostic.routeStatus === 'routed' ? 'route_routed' : 'route_same')}`;
    }

    function getDiagnosticSummaryText() {
        const model = truncate(getDisplayName(S.model), 22);
        const route = getDiagnosticRouteText();
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
                hintOnly: '\u4ec5 hint'
            },
            en: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only'
            },
            ja: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only'
            },
            ru: {
                request: 'Request packet',
                response: 'Response stream',
                none: 'Not captured',
                noHint: 'No hint',
                agentConfirmed: 'Agent confirmed',
                hintOnly: 'Hint only'
            }
        };
        return dict[S.lang]?.[key] || dict.en[key] || key;
    }

    function summarizePacketRequest() {
        const packet = injectionDiagnostic.packetRequest;
        if (!packet) return getPacketUiText('none');
        const hints = [...new Set([...(packet.rootSystemHints || []), ...(packet.messageSystemHints || [])])];
        const hintText = hints.length ? hints.join(', ') : getPacketUiText('noHint');
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
        const status = packet.status === 'confirmed' ? getPacketUiText('agentConfirmed') : getPacketUiText('hintOnly');
        return `${packet.agentName || packet.agentId || '-'} | ${status} | ${packet.source || '-'}`;
    }

    function getDiagnosticWorkspaceAgentText() {
        const selectedId = getWorkspaceAgentId();
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
        const labels = {
            'zh-CN': {
                hinted: '仅请求提示',
                forced: '请求已注入',
                ready: '请求已带 hint',
                confirmed: 'Agent 已确认',
                fallback: '普通模型回退',
                detected: '已检测'
            },
            en: {
                hinted: 'Hint only',
                forced: 'Hint injected',
                ready: 'Hint present',
                confirmed: 'Agent confirmed',
                fallback: 'Model fallback',
                detected: 'Detected'
            },
            ja: {
                hinted: 'ヒントのみ',
                forced: 'ヒント注入済み',
                ready: 'ヒントあり',
                confirmed: 'Agent 確認済み',
                fallback: '通常モデルへ回退',
                detected: '検出済み'
            },
            ru: {
                hinted: 'Только hint',
                forced: 'Hint внедрен',
                ready: 'Hint есть',
                confirmed: 'Agent подтвержден',
                fallback: 'Откат к модели',
                detected: 'Обнаружен'
            }
        };
        const statusKey = injectionDiagnostic.workspaceAgentStatus || 'detected';
        const status = labels[S.lang]?.[statusKey]
            || labels.en[statusKey]
            || (statusKey === 'required'
                ? t('workspace_agent_required')
                : statusKey === 'pending'
                ? t('workspace_agent_pending')
                : t('workspace_agent_detected'));
        return `${name} / ${status}`;
    }

    function publishDiagnosticSnapshot() {
        try {
            const snapshot = {
                build: SCRIPT_BUILD,
                selected: S.model || '',
                enabled: Boolean(S.on),
                debug: Boolean(S.debug),
                currentUrl: location.pathname,
                diagnostic: injectionDiagnostic,
                packetLogSize: readPacketLog().length,
                packetLogTail: readPacketLog().slice(-12),
                selectedWorkspaceAgent: getSelectedWorkspaceAgent() || null,
                agents: S.agents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    source: agent.source,
                    lastConversationId: agent.lastConversationId || ''
                })).slice(0, 12)
            };
            document.documentElement.setAttribute('data-mi-diagnostic', JSON.stringify(snapshot));
        } catch (error) {
            log('Diagnostic export failed', { error: error?.message || String(error) });
        }
    }

    function updateDiagnostics() {
        injectionDiagnostic.selected = S.model || '';
        publishDiagnosticSnapshot();

        const diag = q('mi-diag');
        const toggle = q('mi-diag-toggle');
        const summary = q('mi-diag-summary');
        const title = q('mi-diag-title');
        const selectedKey = q('mi-diag-selected-k');
        const lastKey = q('mi-diag-last-k');
        const effortKey = q('mi-diag-effort-k');
        const routeKey = q('mi-diag-route-k');
        const agentKey = q('mi-diag-agent-k');
        const packetReqKey = q('mi-diag-packet-req-k');
        const packetResKey = q('mi-diag-packet-res-k');
        const errorKey = q('mi-diag-error-k');
        const selected = q('mi-diag-selected');
        const last = q('mi-diag-last');
        const effort = q('mi-diag-effort');
        const route = q('mi-diag-route');
        const agent = q('mi-diag-agent');
        const packetReq = q('mi-diag-packet-req');
        const packetRes = q('mi-diag-packet-res');
        const error = q('mi-diag-error');
        if (!selected || !last || !error) return;

        if (diag) {
            diag.classList.toggle('open', S.diagOpen);
            diag.classList.toggle('has-error', Boolean(injectionDiagnostic.error));
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', S.diagOpen ? 'true' : 'false');
            toggle.setAttribute('title', S.diagOpen ? t('diagnostic_collapse') : t('diagnostic_expand'));
        }
        if (summary) {
            summary.textContent = getDiagnosticSummaryText();
            summary.title = `${t('diagnostic_selected')}: ${S.model || t('default_model')} | ${t('diagnostic_response_model')}: ${getDiagnosticRouteText()} | ${t('diagnostic_error')}: ${injectionDiagnostic.error || t('diagnostic_none')}`;
        }
        if (title) title.textContent = t('diagnostic_title');
        if (selectedKey) selectedKey.textContent = t('diagnostic_selected');
        if (lastKey) lastKey.textContent = t('diagnostic_last');
        if (effortKey) effortKey.textContent = t('diagnostic_effort');
        if (routeKey) routeKey.textContent = t('diagnostic_response_model');
        if (agentKey) agentKey.textContent = t('diagnostic_workspace_agent');
        if (packetReqKey) packetReqKey.textContent = getPacketUiText('request');
        if (packetResKey) packetResKey.textContent = getPacketUiText('response');
        if (errorKey) errorKey.textContent = t('diagnostic_error');
        selected.textContent = S.model || t('default_model');
        selected.title = S.model || t('default_model');
        last.textContent = injectionDiagnostic.skipReason
            ? `${t('diagnostic_skipped_agent')} @ ${injectionDiagnostic.at}`
            : injectionDiagnostic.at
            ? `${injectionDiagnostic.lastModel || t('default_model')} @ ${injectionDiagnostic.at}`
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
            route.textContent = getDiagnosticRouteText();
            route.title = injectionDiagnostic.responseModel
                ? `requested=${injectionDiagnostic.lastModel || S.model || ''}; response=${injectionDiagnostic.responseModel}`
                : t('route_hidden');
            route.classList.toggle('is-muted', !injectionDiagnostic.responseModel);
        }
        if (agent) {
            agent.textContent = getDiagnosticWorkspaceAgentText();
            agent.title = injectionDiagnostic.workspaceAgentId || getWorkspaceAgentId() || '';
            agent.classList.toggle('is-muted', !(injectionDiagnostic.workspaceAgentId || getWorkspaceAgentId()));
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
        error.textContent = injectionDiagnostic.error || t('diagnostic_none');
        error.title = injectionDiagnostic.error || '';
        error.classList.toggle('has-error', Boolean(injectionDiagnostic.error));
    }

    function applyUiText() {
        q('mi-b')?.setAttribute('title', 'Drag to move | Right click to pause');
        document.documentElement.lang = S.lang;
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

        const mainLabels = host.querySelectorAll('#mi-p .mi-lbl');
        if (mainLabels[0]) mainLabels[0].innerHTML = `${t('title_enable')} <em>${t('subtitle_enable')}</em>`;
        if (mainLabels[1]) mainLabels[1].innerHTML = `${t('title_effort')} <em>${t('subtitle_effort')}</em>`;

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
        if (q('mi-set-close')) q('mi-set-close').textContent = 'x';
        const colorLabel = host.querySelector('#mi-set .mi-color-row label');
        if (colorLabel) colorLabel.textContent = t('custom_color');
        if (q('mi-lang-label')) q('mi-lang-label').textContent = t('language');
        const debugLabel = q('mi-debug-label');
        if (debugLabel) debugLabel.textContent = t('debug_mode');
        if (q('mi-export-packets')) q('mi-export-packets').textContent = t('diagnostic_export');
        renderLanguageOptions();
        updateDiagnostics();
        setModelSyncStatus(modelSyncStatus);
    }

    function renderEffortGrid() {
        const container = q('mi-grid-eff');
        if (!container) return;
        const meter = { light: 24, standard: 48, extended: 74, heavy: 100 };
        const stopwatchMap = {
            light: { progress: 18, hand: 'M11 11 L14.5 8.7', secondary: '', inner: false },
            standard: { progress: 42, hand: 'M11 11 L15.1 11', secondary: '', inner: false },
            extended: { progress: 68, hand: 'M11 11 L14.2 13.8', secondary: 'M11 11 L11 7.1', inner: true },
            heavy: { progress: 90, hand: 'M11 11 L9.2 15.2', secondary: 'M11 11 L14.7 8.1', inner: true }
        };
        const renderStopwatch = (level) => {
            const config = stopwatchMap[level];
            return `
                <svg class="mi-g-stopwatch" viewBox="0 0 22 22" aria-hidden="true">
                    <path class="mi-g-cap" d="M8.7 1.9h4.6"></path>
                    <path class="mi-g-stem" d="M11 2.1v2"></path>
                    <circle class="mi-g-shell" cx="11" cy="11.2" r="7.2"></circle>
                    <circle class="mi-g-progress" cx="11" cy="11.2" r="7.2" pathLength="100" stroke-dasharray="${config.progress} 100"></circle>
                    ${config.inner ? '<circle class="mi-g-inner" cx="11" cy="11.2" r="3.2"></circle>' : ''}
                    <path class="mi-g-hand" d="${config.hand}"></path>
                    ${config.secondary ? `<path class="mi-g-hand-secondary" d="${config.secondary}"></path>` : ''}
                    <path class="mi-g-center" d="M11 11.2 L11.01 11.2"></path>
                </svg>
            `;
        };
        container.innerHTML = EFFORTS.map(effort => `
            <button class="mi-g-item ${S.effort === effort ? 'active' : ''}" ${S.effortOn ? '' : 'disabled'} data-e="${effort}">
                <svg class="mi-g-frame-progress" viewBox="0 0 100 136" preserveAspectRatio="none" aria-hidden="true">
                    <rect class="mi-g-frame-bg" x="2" y="2" width="96" height="132" rx="18" ry="18" pathLength="100"></rect>
                    <rect class="mi-g-frame-fg" x="2" y="2" width="96" height="132" rx="18" ry="18" pathLength="100" stroke-dasharray="${meter[effort]} 100"></rect>
                </svg>
                <div class="mi-g-headline">
                    <span class="mi-g-top">${effort.toUpperCase()}</span>
                </div>
                <div class="mi-g-main">${t(`effort_${effort}`)}</div>
                <div class="mi-g-sub">${t(`effort_${effort}_sub`)}</div>
                <div class="mi-g-meter">
                    <div class="mi-g-icon-wrap">${renderStopwatch(effort)}</div>
                </div>
            </button>
        `).join('');
    }

    function renderRecent() {
        const container = q('mi-chips');
        if (!container) return;
        container.innerHTML = S.recent.map(id => `<div class="mi-chip ${S.model === id ? 'active' : ''}" data-id="${escapeHtml(id)}" title="${escapeHtml(id)}">${escapeHtml(truncate(getDisplayName(id), 18))}</div>`).join('');
    }

    function renderModelOption(id, name, entry) {
        const meta = entry?.tokens ? `${fmtTok(entry.tokens)}` : '';
        const label = MENU_LABELS[id] || name;
        const details = escapeHtml(JSON.stringify({
            id,
            name,
            tokens: entry?.tokens || null,
            desc: entry?.desc || '',
            tools: entry?.tools || [],
            reasoning: entry?.reasoning || '',
            versionLabel: entry?.versionLabel || '',
            official: Boolean(entry)
        }));
        return `<div class="mi-opt ${S.model === id ? 'active' : ''} ${entry ? 'official' : ''}" data-id="${escapeHtml(id)}" data-details="${details}">
            <div class="mi-opt-body">
                <span class="txt">${escapeHtml(label)}</span>
                <span class="sub">${escapeHtml(name)}</span>
            </div>
            <span class="meta">${escapeHtml(meta)}</span>
            <span class="mi-check" aria-hidden="true">&#10003;</span>
        </div>`;
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
        return `<div class="mi-opt mi-agent-opt ${S.model === id ? 'active' : ''} official" data-id="${escapeHtml(id)}" data-details="${details}">
            <div class="mi-opt-body">
                <span class="txt">${escapeHtml(agent.name || agent.id)}</span>
                <span class="sub">${escapeHtml(agent.id)}</span>
            </div>
            <span class="meta">${escapeHtml(t('workspace_agent'))}</span>
            <span class="mi-check" aria-hidden="true">&#10003;</span>
        </div>`;
    }

    function getMenuFilter() {
        const raw = String(modelMenuQuery || '').trim();
        const slash = raw.startsWith('/');
        return {
            raw,
            query: slash ? raw.slice(1).trim() : raw,
            agentOnly: modelMenuAgentOnly || slash
        };
    }

    function menuMatches(values, query) {
        const normalized = String(query || '').trim().toLowerCase();
        if (!normalized) return true;
        const haystack = values.filter(Boolean).join(' ').toLowerCase();
        return normalized.split(/\s+/).filter(Boolean).every(part => haystack.includes(part));
    }

    function renderMenuSearch() {
        const filter = getMenuFilter();
        const hasValue = Boolean(filter.raw);
        return `<div class="mi-menu-search ${filter.agentOnly ? 'agent-mode' : ''} ${hasValue ? 'has-value' : ''}">
            <div class="mi-menu-search-head">
                <span class="mi-menu-search-title">${escapeHtml(t('search_quick_title'))}</span>
                <span class="mi-menu-search-mode">${escapeHtml(filter.agentOnly ? t('search_agent_mode') : t('search_models'))}</span>
            </div>
            <div class="mi-menu-search-box">
                <span class="mi-menu-search-icon" aria-hidden="true">⌕</span>
                <input id="mi-menu-search" type="text" value="${escapeHtml(modelMenuQuery)}" placeholder="${escapeHtml(t('search_placeholder'))}" autocomplete="off" spellcheck="false">
                <button class="mi-menu-search-clear" type="button" data-action="clear-search" title="${escapeHtml(t('search_clear'))}" aria-label="${escapeHtml(t('search_clear'))}">×</button>
            </div>
            <div class="mi-menu-search-hint"><span class="mi-menu-key">/</span>${escapeHtml(filter.agentOnly ? t('section_workspace_agents') : t('search_models_hint'))}</div>
        </div>`;
    }

    function renderEmptyMenuNotice() {
        return `<div class="mi-menu-empty">${escapeHtml(t('no_menu_results'))}</div>`;
    }

    function renderDropdown() {
        hideTooltip();
        const dropdown = q('mi-drop');
        const label = q('mi-sel-txt');
        if (!dropdown) return;
        const keepSearchFocus = document.activeElement?.id === 'mi-menu-search';
        const filter = getMenuFilter();

        if (label) {
            label.textContent = getDisplayName(S.model);
            label.title = S.model || t('default_model');
        }

        let visibleGroups = 0;
        let html = renderMenuSearch();

        if (!filter.agentOnly && menuMatches([t('default_model'), t('auto_label'), 'auto default'], filter.query)) {
            visibleGroups += 1;
            html += `
            <div class="mi-menu-section">
                <div class="mi-opt-grp">${escapeHtml(t('group_default'))}</div>
                <div class="mi-family">
                    <div class="mi-opt ${(!S.model || S.model === 'auto') ? 'active' : ''}" data-id="" title="${escapeHtml(t('default_model'))}">
                        <div class="mi-opt-body">
                            <span class="txt">${escapeHtml(t('default_model'))}</span>
                            <span class="sub">${escapeHtml(t('auto_label'))}</span>
                        </div>
                        <span class="meta"></span>
                        <span class="mi-check" aria-hidden="true">&#10003;</span>
                    </div>
                </div>
            </div>
        `;
        }

        const merged = new Map();
        PRESETS.forEach(([id, displayName]) => {
            if (id === 'auto') return;
            if (!isHiddenModelId(id)) merged.set(id, { id, name: displayName, entry: getApiEntry(id) });
        });
        S.api.forEach(item => {
            if (item.id === 'auto') return;
            if (!isHiddenModelId(item.id)) merged.set(item.id, { id: item.id, name: item.name || item.id, entry: item });
        });

        const remaining = new Set(merged.keys());

        const agentItems = [...S.agents];
        const selectedAgentId = getWorkspaceAgentId();
        if (selectedAgentId && !agentItems.some(agent => agent.id === selectedAgentId)) {
            agentItems.unshift({ id: selectedAgentId, name: selectedAgentId, source: 'selected', skills: [], tools: [] });
        }
        const visibleAgents = agentItems.filter(agent => menuMatches([agent.id, agent.name, agent.desc, agent.source, ...(agent.skills || []), ...(agent.tools || [])], filter.query));
        if (visibleAgents.length && filter.agentOnly) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section mi-agent-section"><div class="mi-opt-grp">${escapeHtml(t('section_workspace_agents'))}</div><div class="mi-family">`;
            visibleAgents.forEach(agent => { html += renderWorkspaceAgentOption(agent); });
            html += `</div></div>`;
        }

        if (!filter.agentOnly) for (const section of MODEL_MENU_SECTIONS) {
            let sectionHtml = '';
            for (const [familyName, matcher] of section.families) {
                const familyItems = [...merged.values()]
                    .filter(item => remaining.has(item.id) && matcher.test(item.id))
                    .filter(item => menuMatches([item.id, item.name, MENU_LABELS[item.id], item.entry?.desc, item.entry?.reasoning, item.entry?.versionLabel], filter.query))
                    .sort((a, b) => ((PRESET_ORDER.get(a.id) ?? 999) - (PRESET_ORDER.get(b.id) ?? 999)) || sortModelEntries(a, b));
                if (!familyItems.length) continue;

                familyItems.forEach(item => remaining.delete(item.id));
                sectionHtml += `<div class="mi-family"><div class="mi-family-head">${escapeHtml(familyName)}</div>`;
                familyItems.forEach(item => { sectionHtml += renderModelOption(item.id, item.name, item.entry); });
                sectionHtml += `</div>`;
            }
            if (sectionHtml) {
                visibleGroups += 1;
                html += `<div class="mi-menu-section"><div class="mi-opt-grp">${escapeHtml(t(section.titleKey))}</div>${sectionHtml}</div>`;
            }
        }

        const discovered = [...merged.values()]
            .filter(item => remaining.has(item.id))
            .filter(item => !filter.agentOnly && menuMatches([item.id, item.name, item.entry?.desc, item.entry?.reasoning, item.entry?.versionLabel], filter.query))
            .sort((a, b) => sortModelEntries(a, b));
        if (discovered.length) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section"><div class="mi-opt-grp">${escapeHtml(t('group_api'))}</div><div class="mi-family">`;
            discovered.forEach(item => { html += renderModelOption(item.id, item.name, item.entry); });
            html += `</div></div>`;
        }

        const customItems = S.custom
            .filter(id => !isHiddenModelId(id))
            .filter(id => !filter.agentOnly && menuMatches([id, t('custom_subtitle')], filter.query));
        if (customItems.length) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section"><div class="mi-opt-grp">${escapeHtml(t('custom_group'))}</div><div class="mi-family">`;
            customItems.forEach(id => {
                html += `<div class="mi-opt ${S.model === id ? 'active' : ''}" data-id="${escapeHtml(id)}" data-details="{}">
                    <div class="mi-opt-body">
                        <span class="txt">${escapeHtml(id)}</span>
                        <span class="sub">${escapeHtml(t('custom_subtitle'))}</span>
                    </div>
                    <span class="meta"></span>
                    <span class="mi-check" aria-hidden="true">&#10003;</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (visibleAgents.length && !filter.agentOnly) {
            visibleGroups += 1;
            html += `<div class="mi-menu-section mi-agent-section mi-agent-section-bottom"><div class="mi-opt-grp">${escapeHtml(t('section_workspace_agents'))}</div><div class="mi-family">`;
            visibleAgents.forEach(agent => { html += renderWorkspaceAgentOption(agent); });
            html += `</div></div>`;
        }

        if (!visibleGroups) html += renderEmptyMenuNotice();
        dropdown.innerHTML = html;
        bindTooltipEvents(dropdown);
        const search = dropdown.querySelector('#mi-menu-search');
        if (search && keepSearchFocus) {
            requestAnimationFrame(() => {
                search.focus();
                const pos = search.value.length;
                search.setSelectionRange(pos, pos);
            });
        }
    }

    let tooltipEl = null;
    let tooltipTimeout = null;

    function showTooltip(target, details) {
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
        tooltipEl = getTooltipElement();
        tooltipEl.classList.remove('show', 'hiding');

        const d = typeof details === 'string' ? JSON.parse(details) : details;
        if (!d?.id) return;

        let html = `<div class="mi-tooltip-title">${escapeHtml(d.name || d.id)}${d.official ? `<span class="mi-online-badge">${escapeHtml(d.agent ? t('workspace_agent_detected') : t('online'))}</span>` : ''}</div>`;
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
        tooltipEl = tooltipEl || document.querySelector('.mi-tooltip');
        if (!tooltipEl || !tooltipEl.classList.contains('show')) return;
        tooltipEl.classList.add('hiding');
        tooltipEl.classList.remove('show');
        tooltipTimeout = window.setTimeout(() => {
            document.querySelectorAll('.mi-tooltip').forEach((node, index) => {
                if (index === 0) node.classList.remove('hiding');
                else node.remove();
            });
        }, 250);
    }

    function bindTooltipEvents(container) {
        container.querySelectorAll('.mi-opt[data-details]').forEach(option => {
            option.addEventListener('mouseenter', () => {
                const details = option.getAttribute('data-details');
                if (details && details !== '{}') tooltipTimeout = window.setTimeout(() => showTooltip(option, details), 150);
            });
            option.addEventListener('mouseleave', () => {
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = null;
                }
                hideTooltip();
            });
        });
    }

    function updateBadge() {
        const badge = q('mi-n');
        if (!badge) return;
        const prevCount = parseInt(badge.innerText, 10) || 0;
        badge.innerText = String(S.cnt);
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

    function updateUIState() {
        q('mi-b')?.classList.toggle('off', !S.on);
        q('mi-sw-main')?.classList.toggle('on', S.on);
        q('mi-sw-effort')?.classList.toggle('on', S.effortOn);
        q('mi-sw-debug')?.classList.toggle('on', S.debug);
        if (q('mi-st')) {
            q('mi-st').textContent = S.on ? (getDisplayName(S.model) || t('status_ready')) : t('paused');
            q('mi-st').classList.toggle('paused', !S.on);
        }
        renderEffortGrid();
        renderRecent();
        renderDropdown();
        renderColors();
        renderSponsorModule();
        updateBadge();
        updateInfo();
        updateDiagnostics();
        updateModelLabel();
        recalcTokens();
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
        void button.offsetWidth;
        button.classList.add('is-spinning');

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
    }

    function syncStateFromStorage() {
        const previousModel = S.model;
        S.on = readMainToggle();
        S.model = readString('m', '');
        if (S.model === 'auto') S.model = '';
        if (isHiddenModelId(S.model)) S.model = '';
        S.effort = readString('e', 'standard');
        S.effortOn = readFlag('eo', false);
        S.debug = readFlag('d', false);
        S.lang = readString('lang', 'zh-CN');
        S.bgColor = readString('bg', '#007aff');
        S.diagOpen = readFlag('diag_open', S.diagOpen);
        S.api = sanitizeApiList(readJson('api', S.api));
        S.custom = sanitizeStringList(readJson('custom', S.custom));
        S.recent = sanitizeStringList(readJson('recent', S.recent)).slice(0, 8);
        S.agents = sanitizeWorkspaceAgentList(readJson('agents', S.agents));
        S.lastFetch = readString('lf', S.lastFetch || '');
        S.lastAgentFetch = readString('laf', S.lastAgentFetch || '');
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
        const settingsPanel = $('mi-set');

        const toggleMain = () => {
            S.on = !S.on;
            save('on', S.on ? '1' : '0');
            updateUIState();
            updateModelLabel();
        };

        $('mi-sw-main').onclick = toggleMain;
        $('mi-sw-effort').onclick = () => {
            S.effortOn = !S.effortOn;
            save('eo', S.effortOn ? '1' : '0');
            updateUIState();
            renderEffortGrid();
        };
        $('mi-sw-debug').onclick = () => {
            S.debug = !S.debug;
            save('d', S.debug ? '1' : '0');
            updateUIState();
            updateBadge();
            log('Debug mode', S.debug ? 'on' : 'off');
        };

        $('mi-ref-btn').onclick = fetchModels;
        $('mi-calc').onclick = () => {
            animateContextRefresh();
            recalcTokens();
        };
        q('mi-export-packets')?.addEventListener('click', exportPacketLog);
        q('mi-diag-toggle')?.addEventListener('click', () => {
            S.diagOpen = !S.diagOpen;
            save('diag_open', S.diagOpen ? '1' : '0');
            updateDiagnostics();
        });

        $('mi-btn-set').onclick = event => {
            event.stopPropagation();
            if (settingsPanel.classList.contains('show')) hidePanel(settingsPanel);
            else if (mainPanel.classList.contains('show')) hidePanel(mainPanel, () => window.setTimeout(() => showPanel(settingsPanel), 50));
            else showPanel(settingsPanel);
        };
        $('mi-set-close').onclick = () => hidePanel(settingsPanel);
        $('mi-backdrop').onclick = () => {
            closeDropdown(false);
            hidePanel(mainPanel);
            hidePanel(settingsPanel);
        };

        $('mi-sel-btn').onclick = event => {
            event.stopPropagation();
            if ($('mi-drop').classList.contains('show')) closeDropdown(true);
            else openDropdown();
        };
        $('mi-drop').onclick = event => {
            if (event.target.closest('[data-action="clear-search"]')) {
                event.preventDefault();
                event.stopPropagation();
                modelMenuQuery = '';
                modelMenuAgentOnly = false;
                renderDropdown();
                requestAnimationFrame(() => $('mi-drop')?.querySelector('#mi-menu-search')?.focus());
                return;
            }
            const item = event.target.closest('.mi-opt');
            if (!item) return;
            const id = item.dataset.id;
            saveSelection(id || '');
            closeDropdown(true);
        };
        $('mi-drop').addEventListener('input', event => {
            if (event.target?.id !== 'mi-menu-search') return;
            modelMenuQuery = event.target.value || '';
            modelMenuAgentOnly = modelMenuQuery.trim().startsWith('/');
            renderDropdown();
        });
        $('mi-drop').addEventListener('keydown', event => {
            if (event.target?.id !== 'mi-menu-search') return;
            event.stopPropagation();
            if (event.key === 'Escape' && modelMenuQuery) {
                event.preventDefault();
                modelMenuQuery = '';
                modelMenuAgentOnly = false;
                renderDropdown();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown(true);
                return;
            }
            if (event.key === 'Enter') {
                const first = $('mi-drop').querySelector('.mi-opt');
                if (first) {
                    event.preventDefault();
                    saveSelection(first.dataset.id || '');
                    closeDropdown(true);
                }
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
            if (chip) saveSelection(chip.dataset.id || '');
        };

        $('mi-grid-eff').onclick = event => {
            const option = event.target.closest('.mi-g-item');
            if (option && !option.disabled) {
                S.effort = option.dataset.e;
                save('e', S.effort);
                renderEffortGrid();
            }
        };

        $('mi-clrs').onclick = event => {
            const swatch = event.target.closest('.mi-clr');
            if (!swatch) return;
            const hex = swatch.dataset.c || swatch.dataset.color || '';
            applyColor(hex);
            if ($('mi-color-picker')) $('mi-color-picker').value = hex;
            if ($('mi-color-hex')) $('mi-color-hex').value = hex;
        };
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
            const trigger = q('mi-lang-trigger');
            if (!picker || !trigger) return;
            const open = picker.classList.toggle('open');
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        q('mi-lang-menu')?.addEventListener('click', event => {
            const option = event.target.closest('.mi-lang-option');
            if (!option) return;
            S.lang = option.dataset.lang;
            save('lang', S.lang);
            q('mi-lang-picker')?.classList.remove('open');
            q('mi-lang-trigger')?.setAttribute('aria-expanded', 'false');
            applyUiText();
            renderDropdown();
            renderRecent();
            updateUIState();
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('#mi-lang-picker')) {
                q('mi-lang-picker')?.classList.remove('open');
                q('mi-lang-trigger')?.setAttribute('aria-expanded', 'false');
            }
            if ($('mi-drop').classList.contains('show') && !event.target.closest('#mi-sel-wrap')) closeDropdown(true);
            if ((mainPanel.classList.contains('show') || settingsPanel.classList.contains('show')) && !event.target.closest('#mi')) {
                closeDropdown(false);
                hidePanel(mainPanel);
                hidePanel(settingsPanel);
            }
        });
        document.addEventListener('keydown', event => {
            if (event.altKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                togglePanel(mainPanel);
            }
            if (event.key === 'Escape') {
                closeDropdown(false);
                if (settingsPanel.classList.contains('show')) hidePanel(settingsPanel);
                else if (mainPanel.classList.contains('show')) hidePanel(mainPanel);
            }
        });

        let isDrag = false;
        let startX = 0;
        let startY = 0;
        let initLeft = 0;
        let initTop = 0;
        button?.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !root) return;
            isDrag = false;
            startX = event.clientX;
            startY = event.clientY;
            const rect = root.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;
            root.style.left = `${initLeft}px`;
            root.style.top = `${initTop}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            button.setPointerCapture(event.pointerId);
            button.classList.add('dragging');
        });
        button?.addEventListener('pointermove', event => {
            if (event.buttons !== 1) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (Math.hypot(dx, dy) > 5) isDrag = true;
            if (!isDrag || !root) return;
            root.style.left = `${initLeft + dx}px`;
            root.style.top = `${initTop + dy}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
        });
        button?.addEventListener('pointerup', event => {
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            button.classList.remove('dragging');
            if (isDrag) {
                clampPosition();
                suppressClick = true;
                window.setTimeout(() => { suppressClick = false; }, 120);
            }
        });
        button?.addEventListener('pointercancel', event => {
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            button.classList.remove('dragging');
            isDrag = false;
        });
        button?.addEventListener('click', event => {
            event.stopPropagation();
            if (suppressClick) return;
            closeDropdown(false);
            if (settingsPanel.classList.contains('show')) hidePanel(settingsPanel);
            else togglePanel(mainPanel);
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
#mi {
    --mi-bg: #007aff;
    --mi-bg-rgb: 0, 122, 255;
    --mi-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif;
    --mi-font-mono: "SF Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --mi-radius-sm: 10px;
    --mi-radius-md: 14px;
    --mi-radius-lg: 18px;
    --mi-radius-xl: 24px;
    --mi-bg-primary: rgba(22, 22, 24, 0.92);
    --mi-bg-secondary: rgba(38, 38, 42, 0.9);
    --mi-bg-tertiary: rgba(255, 255, 255, 0.06);
    --mi-bg-elevated: rgba(52, 52, 56, 0.95);
    --mi-text-primary: #ffffff;
    --mi-text-secondary: rgba(235, 235, 245, 0.65);
    --mi-text-tertiary: rgba(235, 235, 245, 0.35);
    --mi-separator: rgba(255, 255, 255, 0.08);
    --mi-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
    --mi-shadow-glow: 0 0 40px -10px var(--mi-bg), 0 8px 32px -8px rgba(0, 0, 0, 0.3);
    --mi-shadow-float: 0 32px 64px rgba(0, 0, 0, 0.4), 0 16px 32px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(255,255,255,0.1);
    --mi-ease: cubic-bezier(0.4, 0, 0.2, 1);
    --mi-ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --mi-ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
    --mi-ease-spring: cubic-bezier(0.5, 1.25, 0.75, 1.25);
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
#mi * { box-sizing: border-box; }
#mi-backdrop {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.4) 100%);
    backdrop-filter: blur(0px) saturate(100%);
    -webkit-backdrop-filter: blur(0px) saturate(100%);
    opacity: 0;
    pointer-events: none;
    z-index: 1;
    transition: opacity 0.4s var(--mi-ease-out-quart), backdrop-filter 0.5s var(--mi-ease-out-quart);
}
#mi-backdrop.show {
    opacity: 1;
    pointer-events: auto;
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
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
    background: linear-gradient(135deg, var(--mi-bg) 0%, color-mix(in srgb, var(--mi-bg) 80%, #000) 100%);
    box-shadow: var(--mi-shadow-glow), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1);
    transition: transform 0.35s var(--mi-ease-spring), box-shadow 0.35s var(--mi-ease-out-quart), background 0.4s var(--mi-ease);
    touch-action: none;
    border: 1px solid rgba(255,255,255,0.15);
    z-index: 3;
    animation: miBreathing 4s ease-in-out infinite;
}
#mi-b::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0%, var(--mi-bg) 25%, transparent 50%, var(--mi-bg) 75%, transparent 100%);
    opacity: 0;
    z-index: -1;
    transition: opacity 0.4s var(--mi-ease);
}
#mi-b:hover::before {
    opacity: 0.6;
    animation: miRotateGlow 3s linear infinite;
}
#mi-b:hover {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 0 60px -5px var(--mi-bg), 0 20px 50px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
    animation: none;
}
#mi-b.panel-open { transform: scale(0.92); animation: none; }
#mi-b.off {
    background: linear-gradient(135deg, rgba(100,100,105,0.9) 0%, rgba(70,70,75,0.9) 100%);
    box-shadow: var(--mi-shadow-sm);
    animation: none;
}
#mi-b.dragging {
    transform: scale(1.15);
    box-shadow: 0 0 80px -5px var(--mi-bg), 0 30px 60px -15px rgba(0,0,0,0.5);
    animation: none;
    cursor: grabbing;
}
#mi-ring-wrap {
    position: absolute;
    top: -5px;
    left: -5px;
    width: 64px;
    height: 64px;
    pointer-events: none;
}
#mi-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
#mi-ring-bg, #mi-ring-fg { fill: none; stroke-width: 2.5; }
#mi-ring-bg { stroke: rgba(255,255,255,0.12); }
#mi-ring-fg {
    stroke: var(--mi-bg);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s var(--mi-ease), filter 0.3s;
    filter: drop-shadow(0 0 3px var(--mi-bg));
}
#mi-b .icon {
    width: 28px;
    height: 28px;
    fill: #fff;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    transition: transform 0.4s var(--mi-ease-spring);
}
#mi-b:hover .icon { transform: rotate(20deg) scale(1.1); }
#mi-b.panel-open .icon { transform: rotate(180deg) scale(0.9); }
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
#mi-p, #mi-set {
    position: absolute;
    bottom: 72px;
    right: 0;
    width: 380px;
    max-height: min(680px, calc(100vh - 96px));
    overflow: hidden;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(26, 27, 31, 0.96) 0%, rgba(18, 19, 23, 0.98) 100%);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 24px 70px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08);
    transform-origin: calc(100% - 24px) calc(100% + 24px);
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    z-index: 2;
}
#mi-p {
    transform: scale(0.2);
    transition: opacity 0.3s var(--mi-ease-out-quart), transform 0.3s var(--mi-ease-out-quart), visibility 0s linear 0.3s;
}
#mi-set {
    width: 320px;
    bottom: 76px;
    padding: 18px;
    overflow: auto;
    transform: scale(0.9) translateY(10px);
    transition: opacity 0.22s var(--mi-ease-out-quart), transform 0.22s var(--mi-ease-out-quart), visibility 0s linear 0.22s;
}
#mi-p.show, #mi-set.show {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
}
#mi-p.show {
    transform: scale(1);
    transition: opacity 0.3s var(--mi-ease-out-quart), transform 0.5s var(--mi-ease-out-back), visibility 0s linear 0s;
}
#mi-set.show {
    transform: scale(1) translateY(0);
    transition: opacity 0.3s var(--mi-ease-out-quart), transform 0.5s var(--mi-ease-out-back), visibility 0s linear 0s;
}
#mi-p.hiding { transform: scale(0.2); }
#mi-set.hiding { transform: translateY(10px) scale(0.94); }
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}
.mi-set-head h4 { margin: 0; font-size: 15px; color: var(--mi-text-primary); font-weight: 600; }
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
    padding: 12px 18px 18px;
    max-height: min(560px, calc(100vh - 210px));
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
}
.mi-lbl em {
    display: block;
    font-size: 12px;
    color: var(--mi-text-secondary);
    font-style: normal;
    margin-top: 2px;
    font-weight: 400;
}
.mi-sw {
    width: 52px;
    height: 32px;
    background: linear-gradient(180deg, rgba(100,100,110,0.5) 0%, rgba(80,80,90,0.5) 100%);
    border-radius: 16px;
    position: relative;
    cursor: pointer;
    transition: all 0.35s var(--mi-ease-out-quart);
    flex-shrink: 0;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
}
.mi-sw::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(180deg, #fff 0%, #f0f0f0 100%);
    box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15);
    transition: transform 0.4s var(--mi-ease-spring);
}
.mi-sw.on { background: linear-gradient(135deg, #34d058 0%, #28a745 100%); }
.mi-sw.on::after { transform: translateX(20px); }
.mi-sw-compact {
    transform: scale(0.84);
    transform-origin: right center;
}
#mi-sel-wrap { margin: 0 4px 16px; position: relative; }
#mi-sel-btn {
    width: 100%;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
    border-radius: var(--mi-radius-md);
    border: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s var(--mi-ease-out-quart);
    font-size: 15px;
    color: var(--mi-text-primary);
    white-space: nowrap;
    overflow: hidden;
    min-height: 48px;
}
#mi-sel-btn:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.18); }
#mi-sel-btn::after {
    content: '';
    width: 8px;
    height: 8px;
    border-right: 2px solid var(--mi-text-tertiary);
    border-bottom: 2px solid var(--mi-text-tertiary);
    transform: rotate(45deg) translateY(-2px);
    transition: transform 0.4s var(--mi-ease-spring);
}
#mi-sel-wrap.open #mi-sel-btn::after { transform: rotate(-135deg) translateY(-2px); }
#mi-drop {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    max-height: min(520px, 58vh);
    overflow: auto;
    padding: 8px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(36,37,42,0.985), rgba(30,31,36,0.985));
    border: 1px solid rgba(255,255,255,0.105);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.30), 0 8px 18px rgba(0, 0, 0, 0.16);
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
    pointer-events: none;
    visibility: hidden;
    z-index: 100;
    transition: opacity 0.28s var(--mi-ease), transform 0.28s var(--mi-ease), visibility 0s linear 0.28s;
}
#mi-drop.show {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    visibility: visible;
    transition: opacity 0.35s var(--mi-ease-out-quart), transform 0.35s var(--mi-ease-out-back), visibility 0s linear 0s;
}
#mi-drop.hiding {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
    pointer-events: none;
}
.mi-menu-search {
    position: sticky;
    top: 0;
    z-index: 3;
    display: grid;
    gap: 8px;
    margin: 0 0 10px;
    padding: 11px;
    border-radius: 16px;
    background:
        radial-gradient(circle at 18% 0%, rgba(var(--mi-bg-rgb), 0.16), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.038));
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 10px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(18px) saturate(140%);
}
.mi-menu-search:focus-within {
    border-color: rgba(var(--mi-bg-rgb), 0.58);
    box-shadow: 0 0 0 1px rgba(var(--mi-bg-rgb), 0.32), 0 14px 30px rgba(0,0,0,0.22);
}
.mi-menu-search-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}
.mi-menu-search-title {
    color: rgba(255,255,255,0.92);
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
    min-height: 42px;
    padding: 0 7px 0 6px;
    border-radius: 12px;
    background: rgba(8, 10, 14, 0.38);
    border: 1px solid rgba(255,255,255,0.09);
    transition: border-color 0.18s var(--mi-ease), background 0.18s var(--mi-ease), box-shadow 0.18s var(--mi-ease);
}
.mi-menu-search:focus-within .mi-menu-search-box {
    background: rgba(8, 10, 14, 0.52);
    border-color: rgba(var(--mi-bg-rgb), 0.48);
    box-shadow: inset 0 0 0 1px rgba(var(--mi-bg-rgb), 0.14);
}
.mi-menu-search-icon {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: rgba(var(--mi-bg-rgb), 0.18);
    color: rgba(255,255,255,0.86);
    font-size: 15px;
    font-weight: 900;
    font-family: var(--mi-font-mono);
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
.mi-menu-search-clear:hover {
    background: rgba(255,255,255,0.13);
    color: rgba(255,255,255,0.9);
}
.mi-menu-search-hint {
    color: rgba(235,235,245,0.50);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
    display: flex;
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
    background: rgba(var(--mi-bg-rgb), 0.20);
    border: 1px solid rgba(var(--mi-bg-rgb), 0.22);
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
    background: transparent;
    border: 1px solid transparent;
    color: #fff;
    text-align: left;
    cursor: pointer;
    position: relative;
    min-height: 40px;
    overflow: hidden;
}
.mi-opt::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--mi-bg);
    transform: scaleY(0);
    transition: transform 0.3s var(--mi-ease-out-back);
    border-radius: 0 2px 2px 0;
}
.mi-opt:hover::before { transform: scaleY(1); }
.mi-opt:hover {
    background: rgba(255,255,255,0.1);
    transform: translateX(4px);
    padding-left: 16px;
}
.mi-opt.active {
    background: linear-gradient(135deg, var(--mi-bg) 0%, color-mix(in srgb, var(--mi-bg) 80%, #000) 100%);
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateX(2px);
}
.mi-opt.active::before {
    transform: scaleY(1);
    background: rgba(255,255,255,0.3);
}
.mi-opt.official {
    border-color: rgba(255, 214, 10, 0.16);
    background: linear-gradient(135deg, rgba(255, 214, 10, 0.035) 0%, rgba(255, 159, 10, 0.014) 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 214, 10, 0.035);
}
.mi-opt.official:hover {
    border-color: rgba(255, 214, 10, 0.34);
    box-shadow: 0 8px 18px rgba(255, 214, 10, 0.055), inset 0 0 0 1px rgba(255, 214, 10, 0.08);
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
    font-weight: 600;
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
    gap: 8px;
}
.mi-opt-grp {
    padding: 10px 10px 2px;
    color: rgba(235,235,245,0.58);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
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
    gap: 4px;
    padding: 6px;
    border-radius: 16px;
    background: rgba(255,255,255,0.022);
    border: 1px solid rgba(255,255,255,0.045);
}
.mi-family-head {
    padding: 8px 10px 4px;
    color: rgba(255,255,255,0.86);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
}
.mi-opt {
    border-radius: 12px;
    min-height: 48px;
    padding: 11px 12px;
}
.mi-opt:hover {
    background: rgba(255,255,255,0.08);
    transform: none;
    padding-left: 12px;
}
.mi-opt.active {
    transform: none;
    background: linear-gradient(135deg, rgba(var(--mi-bg-rgb), 0.18) 0%, rgba(var(--mi-bg-rgb), 0.1) 100%);
    border-color: rgba(var(--mi-bg-rgb), 0.4);
    box-shadow: 0 8px 18px rgba(0,0,0,0.14);
}
.mi-opt.official.active {
    background: linear-gradient(135deg, rgba(255, 214, 10, 0.085) 0%, rgba(255, 159, 10, 0.035) 100%);
    border-color: rgba(255, 214, 10, 0.38);
    box-shadow: 0 0 0 1px rgba(255, 214, 10, 0.08), 0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.075);
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
    transition: all 0.3s var(--mi-ease-out-quart);
}
.mi-chip:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.16); color: var(--mi-text-primary); }
.mi-chip.active { background: rgba(var(--mi-bg-rgb), 0.18); border-color: rgba(var(--mi-bg-rgb), 0.38); color: var(--mi-text-primary); }
.mi-inp-grp, .mi-color-row { display: flex; gap: 8px; }
.mi-color-row,
#mi-lang-row,
.mi-debug-row {
    align-items: center;
}
.mi-color-row label,
#mi-lang-row label,
.mi-debug-row label {
    color: rgba(235,235,245,0.7);
    font-size: 12px;
    font-weight: 600;
}
.mi-debug-row {
    margin-top: 12px;
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
    transition: all 0.3s var(--mi-ease-out-quart);
    min-height: 48px;
}
.mi-inp::placeholder { color: var(--mi-text-tertiary); }
.mi-inp:focus { border-color: var(--mi-bg); box-shadow: 0 0 0 4px rgba(0,122,255,0.15), 0 0 20px -5px var(--mi-bg); }
.mi-lang-picker {
    position: relative;
    min-width: 132px;
}
.mi-lang-trigger {
    width: 100%;
    padding: 10px 38px 10px 12px;
    border-radius: var(--mi-radius-md);
    border: 1px solid rgba(255,255,255,0.12);
    background:
        linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.2) 100%),
        linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
    color: var(--mi-text-primary);
    font: 500 13px/1 var(--mi-font);
    text-align: left;
    outline: none;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    transition: border-color 0.2s var(--mi-ease), box-shadow 0.2s var(--mi-ease), background 0.2s var(--mi-ease), transform 0.2s var(--mi-ease);
    position: relative;
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
    top: calc(100% + 8px);
    right: 0;
    min-width: 100%;
    display: grid;
    gap: 4px;
    padding: 6px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(26,29,36,0.98);
    box-shadow: 0 20px 40px rgba(0,0,0,0.28);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-6px) scale(0.98);
    transition: opacity 0.18s var(--mi-ease), transform 0.18s var(--mi-ease);
    z-index: 6;
}
.mi-lang-picker.open .mi-lang-menu {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
}
.mi-lang-option {
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--mi-text-primary);
    font: 500 13px/1 var(--mi-font);
    text-align: left;
    cursor: pointer;
    transition: background 0.18s var(--mi-ease), border-color 0.18s var(--mi-ease);
}
.mi-lang-option:hover {
    background: rgba(255,255,255,0.06);
}
.mi-lang-option.active {
    background: rgba(var(--mi-bg-rgb), 0.16);
    border-color: rgba(var(--mi-bg-rgb), 0.3);
}
.mi-icon-btn, .mi-link-btn {
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--mi-text-primary);
    cursor: pointer;
    transition: all 0.3s var(--mi-ease-out-quart);
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
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 0 4px 16px;
}
.mi-g-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid transparent;
    border-radius: 18px;
    padding: 14px 8px 16px;
    text-align: center;
    cursor: pointer;
    transition: transform 0.28s var(--mi-ease-out-quart), border-color 0.28s var(--mi-ease), background 0.28s var(--mi-ease), box-shadow 0.28s var(--mi-ease);
    color: var(--mi-text-secondary);
    min-height: 150px;
    overflow: hidden;
}
.mi-g-item:hover:not(:disabled) {
    transform: translateY(-2px);
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%);
    box-shadow: 0 10px 24px rgba(0,0,0,0.14);
}
.mi-g-item.active {
    background: linear-gradient(180deg, rgba(var(--mi-bg-rgb), 0.22) 0%, rgba(var(--mi-bg-rgb), 0.14) 100%);
    color: #fff;
    box-shadow: 0 12px 28px rgba(0,0,0,0.18);
}
.mi-g-item:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}
.mi-g-headline,
.mi-g-top,
.mi-g-main,
.mi-g-sub,
.mi-g-meter,
.mi-g-frame-progress {
    position: relative;
    z-index: 1;
}
.mi-g-headline {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
}
.mi-g-top {
    max-width: 100%;
    font-size: 9px;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(235, 235, 245, 0.42);
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mi-g-main {
    margin-top: 10px;
    width: 100%;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: rgba(255,255,255,0.92);
    white-space: normal;
    word-break: keep-all;
    overflow-wrap: anywhere;
    text-align: center;
}
.mi-g-sub {
    margin-top: 6px;
    width: 100%;
    font-size: 10px;
    line-height: 1.4;
    color: rgba(235, 235, 245, 0.52);
    font-weight: 500;
    min-height: 40px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    word-break: keep-all;
    overflow-wrap: anywhere;
    text-align: center;
}
.mi-g-meter {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
}
.mi-g-icon-wrap {
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    display: grid;
    place-items: center;
}
.mi-g-frame-progress {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}
.mi-g-frame-bg,
.mi-g-frame-fg {
    fill: none;
    stroke-width: 1.35;
}
.mi-g-frame-bg {
    stroke: rgba(255,255,255,0.08);
}
.mi-g-frame-fg {
    stroke: rgba(var(--mi-bg-rgb), 0.44);
    stroke-linecap: round;
    transition: stroke-dasharray 0.42s var(--mi-ease-out-quart), stroke 0.28s var(--mi-ease), opacity 0.28s var(--mi-ease);
    opacity: 0.9;
}
.mi-g-stopwatch {
    width: 20px;
    height: 20px;
    display: block;
}
.mi-g-shell {
    fill: none;
    stroke: rgba(255,255,255,0.72);
    stroke-width: 1.8;
}
.mi-g-progress {
    fill: none;
    stroke: rgba(255,255,255,0.96);
    stroke-width: 2.1;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: 11px 11px;
}
.mi-g-cap,
.mi-g-stem,
.mi-g-hand,
.mi-g-hand-secondary,
.mi-g-center,
.mi-g-inner {
    fill: none;
    stroke: rgba(255,255,255,0.96);
    stroke-linecap: round;
    stroke-linejoin: round;
}
.mi-g-cap { stroke-width: 1.8; }
.mi-g-stem { stroke-width: 1.6; }
.mi-g-hand { stroke-width: 1.9; }
.mi-g-hand-secondary { stroke-width: 1.3; opacity: 0.78; }
.mi-g-center { stroke-width: 2.4; }
.mi-g-inner { stroke-width: 1.3; opacity: 0.34; }
.mi-g-dot { display: none; }
.mi-g-item.active .mi-g-top {
    color: rgba(255,255,255,0.68);
}
.mi-g-item.active .mi-g-main {
    color: #ffffff;
}
.mi-g-item.active .mi-g-sub {
    color: rgba(255,255,255,0.78);
}
.mi-g-item.active .mi-g-progress,
.mi-g-item.active .mi-g-cap,
.mi-g-item.active .mi-g-stem,
.mi-g-item.active .mi-g-hand,
.mi-g-item.active .mi-g-hand-secondary,
.mi-g-item.active .mi-g-center {
    stroke: #ffffff;
}
.mi-g-item.active .mi-g-frame-fg {
    stroke: rgba(var(--mi-bg-rgb), 0.96);
    filter: drop-shadow(0 0 12px rgba(var(--mi-bg-rgb), 0.22));
}
.mi-diagnostics {
    margin: 14px 4px 0;
    padding: 0;
    border-radius: 16px;
    background: rgba(255,255,255,0.026);
    border: 1px solid rgba(255,255,255,0.065);
    overflow: hidden;
    transition: border-color 0.22s var(--mi-ease), background 0.22s var(--mi-ease), box-shadow 0.22s var(--mi-ease);
}
.mi-diagnostics.has-error {
    border-color: rgba(248, 113, 113, 0.28);
    background: linear-gradient(180deg, rgba(248, 113, 113, 0.045), rgba(255,255,255,0.022));
}
.mi-diag-toggle {
    width: 100%;
    min-height: 54px;
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr) 18px;
    align-items: center;
    gap: 10px;
    padding: 12px 13px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
}
.mi-diag-toggle:hover {
    background: rgba(255,255,255,0.035);
}
.mi-diag-title {
    color: rgba(235,235,245,0.8);
    font-size: 12px;
    font-weight: 760;
    white-space: nowrap;
}
.mi-diag-summary {
    min-width: 0;
    color: rgba(235,235,245,0.5);
    font-size: 11px;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mi-diag-chevron {
    width: 8px;
    height: 8px;
    border-right: 2px solid rgba(235,235,245,0.5);
    border-bottom: 2px solid rgba(235,235,245,0.5);
    transform: rotate(45deg) translateY(-2px);
    transition: transform 0.22s var(--mi-ease), border-color 0.22s var(--mi-ease);
}
.mi-diagnostics.open .mi-diag-chevron {
    transform: rotate(-135deg) translateY(-1px);
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
    padding: 11px 13px 0;
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
    transition: all 0.35s var(--mi-ease-out-quart);
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
    display: flex;
    justify-content: space-between;
    position: relative;
}
.mi-link-btn {
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
    transition: all 0.3s var(--mi-ease-out-quart);
    min-height: 40px;
}
.mi-link-btn:hover { background: rgba(255,255,255,0.08); color: var(--mi-text-primary); transform: translateY(-2px); }
#mi-sponsor-slot {
    margin-left: auto;
    display: flex;
    align-items: center;
}
.mi-sponsor {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--mi-radius-md);
    color: var(--mi-text-secondary);
    text-decoration: none;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.3s var(--mi-ease-out-quart);
}
.mi-sponsor:hover {
    color: var(--mi-text-primary);
    background: rgba(255,255,255,0.08);
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.14);
}
.mi-sponsor-icon {
    font-size: 14px;
    line-height: 1;
}
.mi-sponsor-text {
    font-size: 12px;
    font-weight: 600;
}
.mi-clrs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 14px;
}
.mi-clr {
    width: 34px;
    height: 34px;
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
        linear-gradient(180deg, rgba(45, 47, 54, 0.982) 0%, rgba(34, 36, 42, 0.982) 100%),
        radial-gradient(circle at top left, rgba(255,255,255,0.065), rgba(255,255,255,0) 34%);
    backdrop-filter: blur(36px) saturate(150%) brightness(1.04);
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
    transform: translate3d(18px, 0, 0) scale(0.94);
    filter: blur(6px) saturate(0.94);
    transition:
        opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
        filter 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        visibility 0s linear 0.22s;
    will-change: transform, opacity, filter;
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
.mi-tooltip > * {
    opacity: 0;
    transform: translateY(6px) scale(0.99);
    transition:
        opacity 0.16s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
.mi-tooltip[data-side="left"] { transform: translate3d(12px, 0, 0) scale(0.94); }
.mi-tooltip[data-side="right"] { transform: translate3d(-12px, 0, 0) scale(0.94); }
.mi-tooltip[data-side="top"] { transform: translate3d(0, 10px, 0) scale(0.94); }
.mi-tooltip[data-side="bottom"] { transform: translate3d(0, -10px, 0) scale(0.94); }
.mi-tooltip.show {
    opacity: 1;
    visibility: visible;
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0) saturate(1);
    transition:
        opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.34s cubic-bezier(0.16, 1, 0.3, 1),
        filter 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        visibility 0s linear 0s;
}
.mi-tooltip.show > * {
    opacity: 1;
    transform: translateY(0) scale(1);
}
.mi-tooltip.show .mi-tooltip-title { transition-delay: 0.02s; }
.mi-tooltip.show .mi-tooltip-id { transition-delay: 0.04s; }
.mi-tooltip.show .mi-tooltip-row:nth-of-type(1) { transition-delay: 0.06s; }
.mi-tooltip.show .mi-tooltip-row:nth-of-type(2) { transition-delay: 0.08s; }
.mi-tooltip.show .mi-tooltip-row:nth-of-type(3) { transition-delay: 0.1s; }
.mi-tooltip.show .mi-tooltip-desc { transition-delay: 0.12s; }
.mi-tooltip.show .mi-tooltip-tools { transition-delay: 0.14s; }
.mi-tooltip.hiding {
    opacity: 0;
    filter: blur(5px) saturate(0.94);
}
.mi-tooltip.hiding[data-side="left"] { transform: translate3d(12px, 0, 0) scale(0.95); }
.mi-tooltip.hiding[data-side="right"] { transform: translate3d(-12px, 0, 0) scale(0.95); }
.mi-tooltip.hiding[data-side="top"] { transform: translate3d(0, 10px, 0) scale(0.95); }
.mi-tooltip.hiding[data-side="bottom"] { transform: translate3d(0, -10px, 0) scale(0.95); }
.mi-tooltip.hiding > * {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
    transition-delay: 0s !important;
}
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
@keyframes miBreathing {
    0%, 100% { box-shadow: var(--mi-shadow-glow), inset 0 1px 0 rgba(255,255,255,0.2); }
    50% { box-shadow: 0 0 50px -5px var(--mi-bg), 0 12px 40px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25); }
}
@keyframes miRotateGlow { 100% { transform: rotate(360deg); } }
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
@media (max-width: 640px) {
    #mi-p, #mi-set {
        width: min(calc(100vw - 24px), 380px);
    }
}
</style>
<div id="mi-backdrop"></div>
<div id="mi-b" title="Drag to move | Right click to pause">
    <div id="mi-ring-wrap">
        <svg id="mi-ring-svg" viewBox="0 0 68 68" aria-hidden="true">
            <circle id="mi-ring-bg" cx="34" cy="34" r="31"></circle>
            <circle id="mi-ring-fg" cx="34" cy="34" r="31" stroke-dasharray="${BUTTON_RING}" stroke-dashoffset="${BUTTON_RING}"></circle>
        </svg>
    </div>
    <svg class="icon" viewBox="0 0 320 320" aria-hidden="true"><path d="${CHATGPT_ICON_PATH}"></path></svg>
    <div id="mi-n">0</div>
    <div id="mi-model-label">Default model</div>
</div>
<div id="mi-p">
    <div class="mi-head">
        <h3>Model Injector</h3>
        <span class="mi-status" id="mi-st">Ready</span>
    </div>
    <div class="mi-body">
        <div class="mi-row">
            <div class="mi-lbl">Enable override <em>Override request</em></div>
            <div class="mi-sw" id="mi-sw-main"></div>
        </div>
        <div id="mi-sel-wrap">
            <div id="mi-sel-btn" title="Choose model"><span id="mi-sel-txt">Choose model...</span></div>
            <div id="mi-drop"></div>
        </div>
        <div class="mi-infobar">
            <span id="mi-info-txt">No models loaded</span>
            <span id="mi-ref-btn" title="Refresh list"><span class="mi-ref-icon" aria-hidden="true">&#8635;</span><span id="mi-ref-label">Refresh list</span></span>
        </div>
        <div class="mi-chips" id="mi-chips"></div>
        <div class="mi-inp-grp">
            <input class="mi-inp" id="mi-cu" placeholder="Add model slug">
            <button class="mi-icon-btn" id="mi-add" title="Add model slug">+</button>
        </div>
        <div class="mi-row">
            <div class="mi-lbl">Thinking effort <em>Applies to reasoning models</em></div>
            <div class="mi-sw" id="mi-sw-effort"></div>
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
            <button class="mi-diag-toggle" id="mi-diag-toggle" type="button" aria-expanded="false">
                <span class="mi-diag-title" id="mi-diag-title">Injection diagnostics</span>
                <span class="mi-diag-summary" id="mi-diag-summary">Default model · Not checked · None</span>
                <span class="mi-diag-chevron" aria-hidden="true"></span>
            </button>
            <div class="mi-diag-panel" id="mi-diag-panel">
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
        <button class="mi-link-btn" id="mi-btn-set">Settings</button>
        <div id="mi-sponsor-slot"></div>
    </div>
</div>
<div id="mi-set">
    <div class="mi-set-head">
        <h4>Settings</h4>
        <span class="mi-set-close" id="mi-set-close">x</span>
    </div>
    <div class="mi-clrs" id="mi-clrs"></div>
    <div class="mi-color-row">
        <label>Custom color</label>
        <input type="color" id="mi-color-picker" value="#007aff">
        <input class="mi-inp" id="mi-color-hex" value="#007aff" placeholder="#HEX" maxlength="7">
    </div>
    <div class="mi-row" id="mi-lang-row">
        <label id="mi-lang-label">Language</label>
        <div id="mi-lang-picker" class="mi-lang-picker">
            <button id="mi-lang-trigger" class="mi-lang-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                <span id="mi-lang-current"></span>
            </button>
            <div id="mi-lang-menu" class="mi-lang-menu" role="listbox"></div>
        </div>
    </div>
    <div class="mi-row mi-debug-row">
        <label id="mi-debug-label">Debug mode (open console for logs)</label>
        <div class="mi-sw mi-sw-compact" id="mi-sw-debug"></div>
    </div>
</div>
        `;

        document.body.appendChild(host);
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

        updateUIState();
        bindEvents();
        scheduleTokenUpdate(true);
        setupAutoTokenRefresh();
        scheduleWorkspaceAgentScan(300);

        if (isSupportedHost() && !S.api.length) window.setTimeout(fetchModels, LOAD_DELAY);
        requestAnimationFrame(clampPosition);
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
        installFetchHook();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => waitForBody(createUI), { once: true });
    } else {
        waitForBody(createUI);
    }

})();
