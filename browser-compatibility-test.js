// 浏览器兼容性测试脚本
// Browser Compatibility Test Suite

const BrowserCompatibilityTests = {
    
    // 测试不同浏览器的兼容性
    runCompatibilityTests() {
        console.log('🧪 开始浏览器兼容性测试...');
        
        const results = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            tests: []
        };
        
        // 基本功能测试
        results.tests.push(...this.testBasicFeatures());
        
        // Vue.js 兼容性测试
        results.tests.push(...this.testVueCompatibility());
        
        // ES6+ 特性测试
        results.tests.push(...this.testES6Features());
        
        // Fetch API 测试
        results.tests.push(...this.testFetchAPI());
        
        // WebSocket 测试
        results.tests.push(...this.testWebSocket());
        
        // 路由功能测试
        results.tests.push(...this.testRouterFeatures());
        
        return results;
    },
    
    // 基本功能测试
    testBasicFeatures() {
        const tests = [];
        
        // DOM 操作测试
        try {
            const div = document.createElement('div');
            div.textContent = 'test';
            tests.push({
                name: 'DOM操作',
                passed: true,
                details: 'DOM创建和文本设置正常'
            });
        } catch (error) {
            tests.push({
                name: 'DOM操作',
                passed: false,
                details: error.message
            });
        }
        
        // 事件监听测试
        try {
            const div = document.createElement('div');
            let called = false;
            div.addEventListener('click', () => { called = true; });
            
            // 模拟点击事件
            const event = new MouseEvent('click');
            div.dispatchEvent(event);
            
            tests.push({
                name: '事件监听',
                passed: called,
                details: called ? '事件监听和触发正常' : '事件监听失效'
            });
        } catch (error) {
            tests.push({
                name: '事件监听',
                passed: false,
                details: error.message
            });
        }
        
        return tests;
    },
    
    // Vue.js 兼容性测试
    testVueCompatibility() {
        const tests = [];
        
        // 检查 Vue 构造函数
        tests.push({
            name: 'Vue构造函數',
            passed: typeof Vue !== 'undefined',
            details: typeof Vue !== 'undefined' ? 'Vue对象可用' : 'Vue对象不可用'
        });
        
        // 检查 Vue Router
        tests.push({
            name: 'Vue Router',
            passed: typeof VueRouter !== 'undefined',
            details: typeof VueRouter !== 'undefined' ? 'VueRouter可用' : 'VueRouter不可用'
        });
        
        // 检查 Vuex/Pinia
        const hasStore = typeof Vuex !== 'undefined' || typeof Pinia !== 'undefined';
        tests.push({
            name: '状态管理',
            passed: hasStore,
            details: hasStore ? '状态管理库可用' : '状态管理库不可用'
        });
        
        return tests;
    },
    
    // ES6+ 特性测试
    testES6Features() {
        const tests = [];
        
        // 箭头函数
        try {
            const arrow = () => 42;
            tests.push({
                name: '箭头函数',
                passed: arrow() === 42,
                details: '箭头函数支持正常'
            });
        } catch (error) {
            tests.push({
                name: '箭头函数',
                passed: false,
                details: error.message
            });
        }
        
        // 解构赋值
        try {
            const {a, b} = {a: 1, b: 2};
            tests.push({
                name: '解构赋值',
                passed: a === 1 && b === 2,
                details: '解构赋值支持正常'
            });
        } catch (error) {
            tests.push({
                name: '解构赋值',
                passed: false,
                details: error.message
            });
        }
        
        // Promise
        try {
            return new Promise((resolve) => resolve(42));
        } catch (error) {
            tests.push({
                name: 'Promise',
                passed: false,
                details: error.message
            });
        }
        
        // async/await
        tests.push({
            name: 'async/await',
            passed: (async () => true)() instanceof Promise,
            details: 'async/await支持正常'
        });
        
        return tests;
    },
    
    // Fetch API 测试
    testFetchAPI() {
        const tests = [];
        
        tests.push({
            name: 'Fetch API',
            passed: typeof fetch !== 'undefined',
            details: typeof fetch !== 'undefined' ? 'Fetch API可用' : 'Fetch API不可用'
        });
        
        tests.push({
            name: 'Fetch JSON',
            passed: typeof fetch !== 'undefined' && typeof Response !== 'undefined',
            details: typeof fetch !== 'undefined' ? 'Fetch JSON支持正常' : 'Fetch JSON不可用'
        });
        
        return tests;
    },
    
    // WebSocket 测试
    testWebSocket() {
        const tests = [];
        
        tests.push({
            name: 'WebSocket',
            passed: typeof WebSocket !== 'undefined',
            details: typeof WebSocket !== 'undefined' ? 'WebSocket可用' : 'WebSocket不可用'
        });
        
        return tests;
    },
    
    // 路由功能测试
    testRouterFeatures() {
        const tests = [];
        
        // History API
        tests.push({
            name: 'History API',
            passed: typeof history !== 'undefined' && typeof history.pushState !== 'undefined',
            details: typeof history !== 'undefined' ? 'History API可用' : 'History API不可用'
        });
        
        // Location 对象
        tests.push({
            name: 'Location对象',
            passed: typeof location !== 'undefined' && typeof location.pathname !== 'undefined',
            details: 'Location对象可用'
        });
        
        return tests;
    },
    
    // 生成测试报告
    generateReport(results) {
        const total = results.tests.length;
        const passed = results.tests.filter(t => t.passed).length;
        const failed = total - passed;
        
        const report = `
🎯 浏览器兼容性测试报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 测试时间: ${results.timestamp}
🌐 用户代理: ${results.userAgent}

📊 测试结果:
✅ 通过: ${passed}/${total}
❌ 失败: ${failed}/${total}
📈 成功率: ${Math.round((passed/total) * 100)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 详细测试项目:

${results.tests.map((test, index) => {
    const icon = test.passed ? '✅' : '❌';
    return `${index + 1}. ${icon} ${test.name}: ${test.details}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        return report;
    },
    
    // 保存测试结果
    saveResults(results) {
        try {
            localStorage.setItem('browser-compatibility-results', JSON.stringify(results, null, 2));
            return true;
        } catch (error) {
            console.warn('无法保存测试结果到localStorage:', error);
            return false;
        }
    },
    
    // 导出测试结果
    exportResults(results, format = 'json') {
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(results, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `browser-compatibility-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'text') {
            const report = this.generateReport(results);
            const blob = new Blob([report], {type: 'text/plain;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `browser-compatibility-report-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
};

// 导出到全局对象
window.BrowserCompatibilityTests = BrowserCompatibilityTests;

// 自动运行测试
console.log('🚀 浏览器兼容性测试套件已加载');

// 测试 Vue 应用兼容性
if (typeof Vue !== 'undefined') {
    Vue.config.errorHandler = function (err, vm, info) {
        console.error('Vue 错误:', err, info);
        window.vueErrors = window.vueErrors || [];
        window.vueErrors.push({error: err, info, timestamp: new Date().toISOString()});
    };
}