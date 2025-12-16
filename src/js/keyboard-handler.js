/**
 * CCBalance - 键盘控制模块
 * 处理所有键盘输入
 */

const KeyboardHandler = {
    // 按键映射
    keyMap: {
        // WASD - 选择参数卡片
        'w': { action: 'paramPrev', code: 'KeyW' },
        's': { action: 'paramNext', code: 'KeyS' },
        'a': { action: 'paramPrev', code: 'KeyA' },
        'd': { action: 'paramNext', code: 'KeyD' },
        
        // 数字键 - 能力卡牌
        '1': { action: 'ability1', code: 'Digit1' },
        '2': { action: 'ability2', code: 'Digit2' },
        '3': { action: 'ability3', code: 'Digit3' },
        '4': { action: 'ability4', code: 'Digit4' },
        
        // 功能键
        'Tab': { action: 'cycleAction', code: 'Tab' },
        'Escape': { action: 'pause', code: 'Escape' },
        'r': { action: 'reset', code: 'KeyR' },
        'f': { action: 'fullscreen', code: 'KeyF' },

        // 确认操作
        'Enter': { action: 'activateAction', code: 'Enter' },
        ' ': { action: 'activateAction', code: 'Space' },
        
        // 方向键 - 备选参数选择
        'ArrowUp': { action: 'paramPrev', code: 'ArrowUp' },
        'ArrowDown': { action: 'paramNext', code: 'ArrowDown' },
        'ArrowLeft': { action: 'paramPrev', code: 'ArrowLeft' },
        'ArrowRight': { action: 'paramNext', code: 'ArrowRight' }
    },

    // 当前选中的参数
    currentParam: 'concentration',
    
    // 参数列表
    params: ['concentration', 'temperature', 'pressure'],

    // 当前参数卡片内的“选中按钮”索引
    focusedActionIndex: {},
    
    // 是否启用
    enabled: true,

    // 按键状态
    keyStates: {},

    /**
     * 初始化键盘处理
     */
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // 阻止某些默认行为
        document.addEventListener('keydown', (e) => {
            if (['Tab', 'Space'].includes(e.code) && this.isGameScreen()) {
                e.preventDefault();
            }
        });

        // 初始化高亮
        if (UIManager?.highlightParam) {
            UIManager.highlightParam(this.currentParam);
        }
    },

    /**
     * 检查是否在游戏界面
     */
    isGameScreen() {
        const gameScreen = document.getElementById('game-screen');
        return gameScreen && gameScreen.classList.contains('active');
    },

    /**
     * 处理按键按下
     */
    handleKeyDown(e) {
        if (!this.enabled) return;
        
        // 如果在输入框中，不处理
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = e.key.toLowerCase();
        const mapping = this.keyMap[key] || this.keyMap[e.key];
        
        if (!mapping) return;

        // 防止重复触发
        if (this.keyStates[mapping.action]) return;
        this.keyStates[mapping.action] = true;

        // 执行对应操作
        this.executeAction(mapping.action, e);
    },

    /**
     * 处理按键释放
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        const mapping = this.keyMap[key] || this.keyMap[e.key];
        
        if (mapping) {
            this.keyStates[mapping.action] = false;
        }
    },

    /**
     * 执行操作
     */
    executeAction(action, e) {
        // 全局操作
        switch (action) {
            case 'fullscreen':
                window.electronAPI?.toggleFullscreen();
                return;
            
            case 'pause':
                if (this.isGameScreen()) {
                    Game.togglePause();
                } else {
                    // 在其他界面按ESC返回主菜单
                    UIManager.showScreen('mainMenu');
                }
                return;
        }

        // 游戏界面操作
        if (!this.isGameScreen()) return;
        if (Game.isPaused) {
            // 暂停状态只响应特定按键
            if (action === 'pause') {
                Game.togglePause();
            }
            return;
        }

        switch (action) {
            case 'paramPrev':
                this.switchParam(-1);
                break;

            case 'paramNext':
                this.switchParam(1);
                break;

            case 'cycleAction':
                this.cycleAction(e.shiftKey ? -1 : 1);
                e.preventDefault();
                break;

            case 'activateAction':
                this.activateFocusedAction();
                e.preventDefault();
                break;
            
            case 'reset':
                Game.resetTurn();
                break;
            
            case 'ability1':
                this.useAbility('catalyst');
                break;
            
            case 'ability2':
                this.useAbility('buffer');
                break;
            
            case 'ability3':
                this.useAbility('heatexchange');
                break;
            
            case 'ability4':
                this.useAbility('quantum');
                break;
        }
    },

    getParamGroupElement(param) {
        return document.querySelector(`.param-group[data-param="${param}"]`);
    },

    getActionButtonsForParam(param) {
        const group = this.getParamGroupElement(param);
        if (!group) return [];

        // 投料按钮是动态生成到 #concentration-buttons
        if (param === 'concentration') {
            const container = document.getElementById('concentration-buttons');
            if (!container) return [];
            return Array.from(container.querySelectorAll('button'))
                .filter(btn => !btn.disabled && btn.offsetParent !== null);
        }

        return Array.from(group.querySelectorAll('button.param-btn'))
            .filter(btn => !btn.disabled && btn.offsetParent !== null);
    },

    clearActionFocus() {
        document.querySelectorAll('.kbd-focus').forEach(el => el.classList.remove('kbd-focus'));
    },

    focusActionButton(param, index) {
        const buttons = this.getActionButtonsForParam(param);
        if (buttons.length === 0) return;

        const clampedIndex = ((index % buttons.length) + buttons.length) % buttons.length;
        this.focusedActionIndex[param] = clampedIndex;

        this.clearActionFocus();
        const btn = buttons[clampedIndex];
        btn.classList.add('kbd-focus');
        btn.focus?.({ preventScroll: true });
    },

    cycleAction(direction) {
        const param = this.currentParam;
        const buttons = this.getActionButtonsForParam(param);
        if (buttons.length === 0) return;

        const currentIndex = this.focusedActionIndex[param] ?? 0;
        this.focusActionButton(param, currentIndex + direction);
    },

    activateFocusedAction() {
        const param = this.currentParam;
        const buttons = this.getActionButtonsForParam(param);
        if (buttons.length === 0) return;

        const index = this.focusedActionIndex[param] ?? 0;
        const btn = buttons[Math.max(0, Math.min(buttons.length - 1, index))];
        btn?.click?.();
    },

    switchParam(direction) {
        const currentIndex = this.params.indexOf(this.currentParam);
        const nextIndex = ((currentIndex + direction) % this.params.length + this.params.length) % this.params.length;
        this.currentParam = this.params[nextIndex];

        if (UIManager?.highlightParam) {
            UIManager.highlightParam(this.currentParam);
        }

        // 切换卡片时，默认聚焦该卡片的第一个可用按钮
        this.focusActionButton(this.currentParam, this.focusedActionIndex[this.currentParam] ?? 0);
    },

    /**
     * 使用能力卡牌
     */
    useAbility(ability) {
        Game.useAbility(ability);
    },

    /**
     * 显示调整反馈
     */
    showAdjustmentFeedback(element, delta) {
        const indicator = document.createElement('span');
        indicator.className = 'adjustment-indicator';
        indicator.textContent = delta > 0 ? '+' : '-';
        indicator.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: ${delta > 0 ? '#00ff88' : '#ff4444'};
            font-weight: bold;
            animation: fadeOut 0.5s ease-out forwards;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 500);
    },

    /**
     * 启用键盘控制
     */
    enable() {
        this.enabled = true;
    },

    /**
     * 禁用键盘控制
     */
    disable() {
        this.enabled = false;
        this.keyStates = {};
    },

    /**
     * 重置状态
     */
    reset() {
        this.currentParam = 'concentration';
        this.focusedActionIndex = {};
        this.keyStates = {};
        if (UIManager?.highlightParam) {
            UIManager.highlightParam(this.currentParam);
        }
    },

    /**
     * 获取按键提示文本
     */
    getKeyHints() {
        return {
            movement: 'W/A/S/D 或方向键切换卡片',
            switchParam: 'Tab 切换卡片内按钮',
            confirm: 'Space/Enter 确认操作',
            abilities: '1-4 使用能力卡牌',
            reset: 'R 重置当前回合',
            pause: 'ESC 暂停游戏',
            fullscreen: 'F 切换全屏'
        };
    }
};

// 添加fadeOut动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(-50%); }
        to { opacity: 0; transform: translateY(-100%); }
    }
`;
document.head.appendChild(style);

// 导出
window.KeyboardHandler = KeyboardHandler;
