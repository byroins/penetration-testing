// @Date    : 2020-09-12 16:26:48
// @Author  : residuallaugh
(function(){
    var protocol = window.location.protocol;
    var host = window.location.host;
    var domain_host = host.split(':')[0];
    var href = window.location.href;
    // var source = document.getElementsByTagName('html')[0].innerHTML;
    var source = document.documentElement.outerHTML;
    var settingSafeMode = true;
    init_source(source);

    // 获取页面中所有的 iframe 元素，执行同样的逻辑
    var iframes = document.querySelectorAll('iframe');
    iframes.forEach(function(iframe) {
        iframe.addEventListener('load', function() {
            var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            source = iframeDocument.documentElement.outerHTML
            // console.log(iframeDocument.documentElement.outerHTML);
            init_source(source);
        });
    });

    function init_source(source) {
        var hostPath;
        var urlPath;
        var urlWhiteList = ['.google.com','.amazon.com','portswigger.net'];
        var target_list = [];
        // console.log(source)
        var source_href = source.match(/href=['"].*?['"]/g);
        var source_src = source.match(/src=['"].*?['"]/g);
        var script_src = source.match(/<script [^><]*?src=['"].*?['"]/g);
        chrome.storage.local.get(["settingSafeMode"], function(settings){
            settingSafeMode = settings["settingSafeMode"]==false ? false : true;
        });
        chrome.storage.local.get(["allowlist"], function(settings){
            // console.log(settings , settings['allowlist'])
            if(settings && settings['allowlist']){
                urlWhiteList = settings['allowlist'];
            }
            for(var i = 0;i < urlWhiteList.length;i++){
                if(host.endsWith(urlWhiteList[i]) || domain_host.endsWith(urlWhiteList[i])){
                    console.log('域名在白名单中，跳过当前页')
                    return ;
                }
            }
            // target_list.push(window.location.href);
            
            // console.log(source_href,source_src,script_src)
            if(source_href){
                for(var i=0;i<source_href.length;i++){
                    var u = deal_url(source_href[i].substring(6,source_href[i].length-1));
                    if(u){
                        target_list.push(u);
                    }
                }
            }
            if(source_src){
                for(var i=0;i<source_src.length;i++){
                    var u = deal_url(source_src[i].substring(5,source_src[i].length-1));
                    if(u){
                        target_list.push(u);
                    }
                }
            }
            
            // [Forge] 修复「去重未生效」：
            // 原实现把去重结果写进 tmp_target_list，但 pop() 不接受参数（等于空操作），
            // 且发送给 background 的是未去重的 target_list。此处改为按 Set 去重后再发送。
            // 「跳过当前页」仍由 background 的 `req_url == request.current` 处理，抓取语义不变。
            const tmp_target_list = [...new Set(target_list)];
            chrome.runtime.sendMessage({greeting: "find",data: tmp_target_list, current: href, source: source});
        });
    
        function is_script(u){
            if(script_src){
                for(var i=0;i<script_src.length;i++){
                    if (script_src[i].indexOf(u)>0){
                        return true
                    }
                }
            }
            return false
        }
        function isJavaScriptFile(url) {
            try {
                // 使用URL构造函数解析URL
                const parsedUrl = new URL(url);

                // 获取URL的pathname部分
                const pathname = parsedUrl.pathname;

                // 检查pathname是否以.js结尾
                return pathname.endsWith('.js');
            } catch (error) {
                // 如果URL无效，则捕获错误
                return false;
            }
        }

        function deal_url(u){
            let url;
            if(u.substring(0,4)=="http"){
                url = u;
            }
            else if(u.substring(0,2)=="//"){
                url = protocol+u;
            }
            else if(u.substring(0,1)=='/'){
                url = protocol+'//'+host+u;
            }
            else if(u.substring(0,2)=='./'){
                if (href.indexOf('#')>0) {
                    tmp_href = href.substring(0,href.indexOf('#'))
                }else{
                    tmp_href = href;
                }
                url = tmp_href.substring(0,tmp_href.lastIndexOf('/')+1)+u;
            }else{
                // console.log("not match prefix:"+u+",like http // / ./")
                if (href.indexOf('#')>0) {
                    tmp_href = href.substring(0,href.indexOf('#'))
                }else{
                    tmp_href = href;
                }
                url = tmp_href.substring(0,tmp_href.lastIndexOf('/')+1)+u;
            }
            // console.log(settingSafeMode)
            if(settingSafeMode && !isJavaScriptFile(url) && !is_script(u)){
                // console.log('非js:'+u);
                // if(u.indexOf('.js')>-1){
                //     console.log('有js关键字:'+u);
                // }
                return ;
            }
            // console.log(url)
            return url;
        }
    }

})()


chrome.storage.local.get(["global_float"], function(settings){
    // console.log(settings);
    if (settings["global_float"]!=true){
        return
    }
    // console.log(settings["global_float"]);
    // console.log("findsomething-divglobal_float");
    // 使用自定义标签
    const body = document.getElementsByTagName('html')[0];
    const div = document.createElement('div');
    div.setAttribute("id","findsomething-float-div");
    div.innerHTML = `
    <findsomething-div id="findsomething_neko" style="width:410px;max-height:500px;font-size:14px;color:#000000;box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1) ;background-color: #fff;border-radius: 5px;border: 1px solid #ebebeb;left:20px;top:20px;position: fixed;z-index: 1000000;overflow:hidden;">
        <findsomething-div id="findsomething_neko-title" style="display: flex;justify-content: space-between;background-color: #f5f7fa;padding: 8px 12px;border-bottom: 1px solid #e8e8e8;cursor: move;">
            <findsomething-div id="findsomething_taskstatus" style="height: 20px; line-height: 20px; font-weight: 500;"></findsomething-div>
            <findsomething-div id="findsomething_neko-close" style="cursor: pointer;">×</findsomething-div>
        </findsomething-div>
        
        <!-- 标签页导航 -->
        <findsomething-div id="findsomething_float_tab_nav" style="display: flex; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
            <findsomething-div class="float-tab-nav-item float-tab-active" data-tab="basic" style="padding: 10px 15px; cursor: pointer; border-right: 1px solid #e8e8e8; font-size: 12px;">基础信息</findsomething-div>
            <findsomething-div class="float-tab-nav-item" data-tab="paths" style="padding: 10px 15px; cursor: pointer; border-right: 1px solid #e8e8e8; font-size: 12px;">路径信息</findsomething-div>
            <findsomething-div class="float-tab-nav-item" data-tab="sensitive" style="padding: 10px 15px; cursor: pointer; font-size: 12px;">敏感信息</findsomething-div>
        </findsomething-div>
        
        <!-- 标签页内容区域 -->
        <findsomething-div id="findsomething_float_tab_content" style="max-height: 400px; overflow-y: auto; padding: 10px;">
            <!-- 基础信息标签 -->
            <findsomething-div class="float-tab-pane float-tab-active" id="float-basic-tab">
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>IP</findsomething-span>
                    <findsomething-button type="button" class="float-copy-btn" name="findsomething_ip" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_ip" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>IP_PORT</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_ip_port" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_ip_port" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>域名</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_domain" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_domain" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>

                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>Url</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_url" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_url" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>

            </findsomething-div>
            
            <!-- 路径信息标签 -->
            <findsomething-div class="float-tab-pane" id="float-paths-tab" style="display: none;">
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>Path</findsomething-span>
                    <findsomething-div>
                        <findsomething-button class="float-copy-btn" name="findsomething_path" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                    </findsomething-div>
                </findsomething-div>
                <findsomething-div id="findsomething_path" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>IncompletePath</findsomething-span>
                    <findsomething-div>
                        <findsomething-button class="float-copy-btn" name="findsomething_incomplete_path" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                    </findsomething-div>
                </findsomething-div>
                <findsomething-div id="findsomething_incomplete_path" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>StaticUrl</findsomething-span>
                    <findsomething-div>
                        <findsomething-button class="float-copy-btn" name="findsomething_static" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                    </findsomething-div>
                </findsomething-div>
                <findsomething-div id="findsomething_static" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
            </findsomething-div>
            
            <!-- 敏感信息标签 -->
            <findsomething-div class="float-tab-pane" id="float-sensitive-tab" style="display: none;">
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>手机号</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_mobile" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_mobile" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>

                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>身份证</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_sfz" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_sfz" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>

                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>邮箱</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_mail" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_mail" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>JWT</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_jwt" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_jwt" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>算法</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_algorithm" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_algorithm" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
                
                <findsomething-div class="float-section-title" style="font-size: 14px; font-weight: bold; margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #2c3e50;">
                    <findsomething-span>Secret</findsomething-span>
                    <findsomething-button class="float-copy-btn" name="findsomething_secret" style="background: none; border: none; color: #3498db; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 3px;">复制</findsomething-button>
                </findsomething-div>
                <findsomething-div id="findsomething_secret" style="word-break: break-word; white-space: pre; padding: 6px; background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 3px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px; max-height: 80px; overflow-y: auto;">🈚️</findsomething-div>
            </findsomething-div>
        </findsomething-div>
    </findsomething-div>
    
    <style type="text/css">
        findsomething-div {
            display: block;
        }
        
        findsomething-span {
            display: inline;
        }
        
        findsomething-button {
            display: inline-block;
        }
        
        findsomething-p {
            display: block;
            margin-top: 14px;
            margin-bottom: 14px;
            line-height: 14px;
        }
        
        .float-tab-nav-item.float-tab-active {
            background-color: #fff;
            border-bottom: 2px solid #3498db;
            font-weight: bold;
        }
        
        .float-tab-pane.float-tab-active {
            display: block !important;
        }
        
        .float-copy-btn:hover {
            background-color: #3498db !important;
            color: white !important;
        }
    </style>
    `;
    body.appendChild(div);
    
    // 初始化悬浮窗功能
    initFloatWindow();
});

// 初始化悬浮窗功能
function initFloatWindow() {
    // 等待DOM渲染完成
    setTimeout(() => {
        // 标签页切换功能
        const tabNavItems = document.querySelectorAll('.float-tab-nav-item');
        tabNavItems.forEach(item => {
            item.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // 更新导航项激活状态
                tabNavItems.forEach(navItem => {
                    navItem.classList.remove('float-tab-active');
                });
                this.classList.add('float-tab-active');
                
                // 显示对应的标签页内容
                const tabPanes = document.querySelectorAll('.float-tab-pane');
                tabPanes.forEach(pane => {
                    pane.classList.remove('float-tab-active');
                    pane.style.display = 'none';
                    if (pane.id === 'float-' + tabId + '-tab') {
                        pane.classList.add('float-tab-active');
                        pane.style.display = 'block';
                    }
                });
            });
        });
        
        // 关闭悬浮窗功能
        const closeBtn = document.getElementById('findsomething_neko-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                const neko = document.getElementById('findsomething-float-div');
                if (neko) {
                    neko.remove();
                }
            });
        }
        
        // 复制功能
        initFloatCopy();
        
        // 拖拽功能
        initFloatDrag();
        
        // 信息显示功能
        getFloatInfo();
    }, 100);
}

// 复制功能
function initFloatCopy() {
    var elements = document.getElementsByClassName("float-copy-btn");
    if (elements) {
        for (var i=0, len=elements.length|0; i<len; i=i+1|0) {
            let ele = elements[i];
            let ele_name = ele.getAttribute('name');
            ele.onclick=function () {
                var inp = document.createElement('textarea');
                document.body.appendChild(inp);
                var sourceElement = document.getElementById(ele_name);
                if (sourceElement) {
                    inp.value = sourceElement.textContent;
                    inp.select();
                    document.execCommand('copy', false);
                    inp.remove();
                }
            }
        }
    }
}

// 拖拽功能
function initFloatDrag() {
    var neko = document.querySelector('#findsomething_neko');
    if (!neko) return;
    
    var nekoW = neko.offsetWidth;
    var nekoH = neko.offsetHeight;
    var cuntW = 0;
    var cuntH = 0;
    
    // 初始位置设置为右上角
    neko.style.left = (window.innerWidth - nekoW - 20) + 'px';
    neko.style.top = '20px';
    move(neko, 0, 0);
    
    function move(obj, w, h) {
        if (obj.direction === 'left') {
            obj.style.left = 0 - w + 'px';
        } else if (obj.direction === 'right') {
            obj.style.left = document.body.offsetWidth - nekoW + w + 'px';
        }
        if (obj.direction === 'top') {
            obj.style.top = 0 - h + 'px';
        } else if (obj.direction === 'bottom') {
            obj.style.top = document.body.offsetHeight - nekoH + h + 'px';
        }
    }

    function rate(obj, a) {
        obj.style.transform = ' rotate(' + a + ')'
    }

    var nekotitle = document.querySelector('#findsomething_neko-title');
    if (nekotitle) {
        nekotitle.onmousedown = function (e) {
            var nekoL = e.clientX - neko.offsetLeft;
            var nekoT = e.clientY - neko.offsetTop;
            document.onmousemove = function (e) {
                cuntW = 0;
                cuntH = 0;
                neko.direction = '';
                neko.style.transition = '';
                neko.style.left = (e.clientX - nekoL) + 'px';
                neko.style.top = (e.clientY - nekoT) + 'px';
                if (e.clientX - nekoL < 5) {
                    neko.direction = 'left';
                }
                if (e.clientY - nekoT < 5) {
                    neko.direction = 'top';
                }
                if (e.clientX - nekoL > document.body.offsetWidth - nekoW - 5) {
                    neko.direction = 'right';
                }
                if (e.clientY - nekoT > document.body.offsetHeight - nekoH - 5) {
                    neko.direction = 'bottom';
                }

                move(neko, 0, 0);
            }
        }
    }
    
    if (neko) {
        neko.onmouseover = function () {
            move(this, 0, 0);
            rate(this, 0)
        }

        neko.onmouseout = function () {
            move(this, nekoW / 2, 0);
        }

        neko.onmouseup = function () {
            document.onmousemove = null;
            this.style.transition = '.5s';
            move(this, nekoW / 2, 0);
        }
    }

    window.onresize = function () {
        var bodyH = document.body.offsetHeight;
        var nekoT = neko.offsetTop;
        var bodyW = document.body.offsetWidth;
        var nekoL = neko.offsetLeft;

        if (nekoT + nekoH > bodyH) {
            neko.style.top = bodyH - nekoH + 'px';
            cuntH++;
        }
        if (bodyH > nekoT && cuntH > 0) {
            neko.style.top = bodyH - nekoH + 'px';
        }
        if (nekoL + nekoW > bodyW) {
            neko.style.left = bodyW - nekoW + 'px';
            cuntW++;
        }
        if (bodyW > nekoL && cuntW > 0) {
            neko.style.left = bodyW - nekoW + 'px';
        }

        move(this, nekoW / 2, 0);
    }
}

// 信息显示功能
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

var key = ["ip","ip_port","domain","path","incomplete_path","url","static","sfz","mobile","mail","jwt","algorithm","secret"]

function show_info(result_data) {
    if(result_data){
        for (var k in key){
            if (result_data[key[k]]){
                let p="";
                for(var i in result_data[key[k]]){
                    p = p + result_data[key[k]][i] +'\n'
                }
                var element = document.getElementById("findsomething_"+key[k]);
                if (element) {
                    element.style.whiteSpace="pre";
                    element.textContent=p;
                }
            }
        }
    }
}

function getFloatInfo() {
    chrome.runtime.sendMessage({greeting: "get", current: window.location.href}, function(result_data) {
        let taskstatus = document.getElementById('findsomething_taskstatus');
        if(!taskstatus){
            return;
        }
        if(!result_data|| result_data['done']!='done'){
            if(result_data){
                show_info(result_data);
                taskstatus.textContent = "处理中.."+result_data['donetasklist'].length+"/"+result_data['tasklist'].length;
            }else{
                taskstatus.textContent = "处理中..";
            }
            sleep(100);
            getFloatInfo();
            return;
        }
        taskstatus.textContent = "处理完成："+result_data['donetasklist'].length+"/"+result_data['tasklist'].length;
        show_info(result_data);
        if(result_data['donetasklist'].length!=result_data['tasklist'].length){
            getFloatInfo();
        }
        return;
    });
}