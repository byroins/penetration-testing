/**
 * @Date    : 2020-09-12 16:26:48
 * @Author  : residuallaugh
 * @Description: 设置页面逻辑
 */

/**
 * 根据ID设置元素的文本内容
 * @param {string} id - 元素ID
 */
function setTextContentById(id) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = chrome.i18n.getMessage(id);
    }
}

/**
 * 初始化国际化文本
 */
function init_locales() {
    // 需要设置文本的元素ID列表
    const settingIdList = [
        "Zhuye",
        "Peizhi",
        "settingClearCache",
        "settingClearLocalStorage",
        "settingGlobalFloatingWindow",
        "settingAutoTimeout",
        "settingWebhook",
        "settingWebhookUrl",
        "settingWebhookMethod",
        "settingWebhookArg",
        "settingWebhookHeaders",
        "settingDomainAllowList",
        "settingSafe",
        "settingInstructions"
    ];

    // 设置常规文本
    for (const id of settingIdList) {
        try {
            setTextContentById(id);
        } catch (e) {
            console.log("无法设置文本内容:", id);
        }
    }

    // 设置重置和保存按钮文本
    const settingResetAndSaveList = document.getElementsByClassName("settingResetAndSave");
    for (const settingResetAndSave of settingResetAndSaveList) {
        settingResetAndSave.textContent = chrome.i18n.getMessage("settingResetAndSave");
    }
    
    const settingSaveList = document.getElementsByClassName("settingSave");
    for (const settingSave of settingSaveList) {
        settingSave.textContent = chrome.i18n.getMessage("settingSave");
    }
    
    // 设置域名白名单提示文本
    const allowlistElement = document.getElementById("allowlist");
    if (allowlistElement) {
        allowlistElement.placeholder = chrome.i18n.getMessage("settingDomainAllowListTip");
    }
}

// ==================== Webhook 设置 ====================

/**
 * 保存Webhook设置
 */
function saveWebhookSettings() {
    let webhook_setting = {};
    const urlElement = document.getElementById('url');
    const methodElement = document.getElementById('method');
    const argElement = document.getElementById('arg');
    const headersElement = document.getElementById('headers');
    
    if (urlElement) webhook_setting['url'] = urlElement.value;
    if (methodElement) webhook_setting['method'] = methodElement.value;
    if (argElement) webhook_setting['arg'] = argElement.value;
    
    if (headersElement) {
        try {
            webhook_setting['headers'] = JSON.parse(headersElement.value);
        } catch (e) {
            webhook_setting['headers'] = {};
            console.log("Headers JSON解析失败:", e);
        }
    }
    
    chrome.storage.local.set({ "webhook_setting": webhook_setting });
}

/**
 * 重置Webhook设置
 */
function resetWebhookSettings() {
    let webhook_setting = { "url": "", "arg": "", "headers": {} };
    
    const urlElement = document.getElementById('url');
    const argElement = document.getElementById('arg');
    const headersElement = document.getElementById('headers');
    
    if (urlElement) urlElement.value = "";
    if (argElement) argElement.value = "";
    if (headersElement) headersElement.value = "{}";
    
    chrome.storage.local.set({ "webhook_setting": webhook_setting });
}

// ==================== 域名白名单设置 ====================

/**
 * 保存域名白名单设置
 */
function saveAllowlistSettings() {
    const allowlistElement = document.getElementById('allowlist');
    if (!allowlistElement) return;
    
    let snsArr = allowlistElement.value.split(/[(\r\n)\r\n]+/);
    snsArr = snsArr.filter(item => item.trim() !== "");
    
    chrome.storage.local.set({ "allowlist": snsArr });
}

/**
 * 重置域名白名单设置
 */
function resetAllowlistSettings() {
    const allowlistElement = document.getElementById('allowlist');
    if (allowlistElement) {
        allowlistElement.value = "";
        chrome.storage.local.set({ "allowlist": [] });
    }
}

// ==================== 功能开关设置 ====================

/**
 * 清理本地存储
 */
function clearLocalStorage() {
    chrome.storage.local.clear();
    console.log(chrome.i18n.getMessage("settingClearComplete"));
    alert(chrome.i18n.getMessage("settingClearComplete"));
}

/**
 * 切换全局悬浮窗开关
 */
function toggleGlobalFloat() {
    chrome.storage.local.get(["global_float"], function (settings) {
        const newValue = !(settings["global_float"] === true);
        chrome.storage.local.set({ "global_float": newValue });
        
        const globalFloatElement = document.getElementById('global_float');
        if (globalFloatElement) {
            globalFloatElement.className = newValue ? "toggle-btn active" : "toggle-btn";
        }
    });
}

/**
 * 切换自动超时开关
 */
function toggleFetchTimeout() {
    chrome.storage.local.get(["fetch_timeout"], function (settings) {
        const newValue = !(settings["fetch_timeout"] === true);
        chrome.storage.local.set({ "fetch_timeout": newValue });
        
        const fetchTimeoutElement = document.getElementById('fetch_timeout');
        if (fetchTimeoutElement) {
            fetchTimeoutElement.className = newValue ? "toggle-btn active" : "toggle-btn";
        }
    });
}

/**
 * 切换安全模式开关
 */
function toggleSafeMode() {
    chrome.storage.local.get(["settingSafeMode"], function (settings) {
        const newValue = !(settings["settingSafeMode"] === true);
        chrome.storage.local.set({ "settingSafeMode": newValue });
        
        const safeModeElement = document.getElementById('settingSafeMode');
        if (safeModeElement) {
            safeModeElement.className = newValue ? "toggle-btn active" : "toggle-btn";
        }
    });
}

// ==================== 使用说明 ====================

/**
 * 加载使用说明内容
 */
function loadInstructions() {
    // 获取使用说明内容并显示
    const instructionsText = chrome.i18n.getMessage("getstartedContent");
    const instructionsElement = document.getElementById("instructions-text");
    
    if (instructionsElement && instructionsText) {
        // 简单的Markdown到HTML的转换
        let htmlContent = instructionsText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // 斜体
            .replace(/## (.*?)\n/g, '<h2>$1</h2>')             // 二级标题
            .replace(/### (.*?)\n/g, '<h3>$1</h3>')            // 三级标题
            .replace(/\n\* (.*?)(?=\n|$)/g, '<li>$1</li>')     // 列表项
            .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>') // 包裹列表
            .replace(/\n/g, '<br>');                           // 换行
        
        // 修复列表嵌套问题
        htmlContent = htmlContent.replace(/<\/ul><ul>/g, '');
        
        instructionsElement.innerHTML = htmlContent;
    }
}

// ==================== 初始化设置值 ====================

/**
 * 初始化Webhook设置值
 */
function initWebhookSettings() {
    chrome.storage.local.get(["webhook_setting"], function (settings) {
        if (!settings || !settings["webhook_setting"]) {
            console.log('获取webhook_setting失败');
            return;
        }
        
        const urlElement = document.getElementById('url');
        const methodElement = document.getElementById('method');
        const argElement = document.getElementById('arg');
        const headersElement = document.getElementById('headers');
        
        if (urlElement) urlElement.value = settings["webhook_setting"]['url'] || "";
        if (methodElement) methodElement.value = settings["webhook_setting"]['method'] || "GET";
        if (argElement) argElement.value = settings["webhook_setting"]['arg'] || "";
        if (headersElement) {
            headersElement.value = JSON.stringify(settings["webhook_setting"]['headers'] || {}, null, 2);
        }
    });
}

/**
 * 初始化全局悬浮窗开关状态
 */
function initGlobalFloatStatus() {
    chrome.storage.local.get(["global_float"], function (settings) {
        const isActive = settings["global_float"] === true;
        const globalFloatElement = document.getElementById('global_float');
        if (globalFloatElement) {
            globalFloatElement.className = isActive ? "toggle-btn active" : "toggle-btn";
        }
    });
}

/**
 * 初始化自动超时开关状态
 */
function initFetchTimeoutStatus() {
    chrome.storage.local.get(["fetch_timeout"], function (settings) {
        const isActive = settings["fetch_timeout"] === true;
        const fetchTimeoutElement = document.getElementById('fetch_timeout');
        if (fetchTimeoutElement) {
            fetchTimeoutElement.className = isActive ? "toggle-btn active" : "toggle-btn";
        }
    });
}

/**
 * 初始化安全模式开关状态
 */
function initSafeModeStatus() {
    chrome.storage.local.get(["settingSafeMode"], function (settings) {
        // 默认开启安全模式
        const isActive = settings["settingSafeMode"] !== false;
        const safeModeElement = document.getElementById('settingSafeMode');
        if (safeModeElement) {
            safeModeElement.className = isActive ? "toggle-btn active" : "toggle-btn";
        }
        
        // 如果未设置过，则设置默认值
        if (settings["settingSafeMode"] == null) {
            chrome.storage.local.set({ "settingSafeMode": true });
        }
    });
}

/**
 * 初始化域名白名单
 */
function initAllowlist() {
    chrome.storage.local.get(["allowlist"], function (allowlist) {
        const allowlistElement = document.getElementById('allowlist');
        if (allowlistElement && allowlist && allowlist["allowlist"]) {
            allowlistElement.value = allowlist["allowlist"].join('\n');
        }
    });
}

/**
 * 初始化所有设置
 */
function initAllSettings() {
    initWebhookSettings();
    initGlobalFloatStatus();
    initFetchTimeoutStatus();
    initSafeModeStatus();
    initAllowlist();
    loadInstructions(); // 加载使用说明
}

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // Webhook设置按钮
    const saveBtn = document.getElementById("save");
    const resetBtn = document.getElementById("reset");
    
    if (saveBtn) saveBtn.addEventListener("click", saveWebhookSettings);
    if (resetBtn) resetBtn.addEventListener("click", resetWebhookSettings);
    
    // 域名白名单按钮
    const saveAllowlistBtn = document.getElementById("save_allowlist");
    const resetAllowlistBtn = document.getElementById("reset_allowlist");
    
    if (saveAllowlistBtn) saveAllowlistBtn.addEventListener("click", saveAllowlistSettings);
    if (resetAllowlistBtn) resetAllowlistBtn.addEventListener("click", resetAllowlistSettings);
    
    // 功能开关按钮
    const clearStorageBtn = document.getElementById("settingClearLocalStorage");
    const globalFloatBtn = document.getElementById("global_float");
    const fetchTimeoutBtn = document.getElementById("fetch_timeout");
    const safeModeBtn = document.getElementById("settingSafeMode");
    
    if (clearStorageBtn) clearStorageBtn.addEventListener("click", clearLocalStorage);
    if (globalFloatBtn) globalFloatBtn.addEventListener("click", toggleGlobalFloat);
    if (fetchTimeoutBtn) fetchTimeoutBtn.addEventListener("click", toggleFetchTimeout);
    if (safeModeBtn) safeModeBtn.addEventListener("click", toggleSafeMode);
}

// ==================== 页面加载完成后初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 初始化界面
    init_locales();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化所有设置值
    initAllSettings();
});