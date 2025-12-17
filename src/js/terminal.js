/**
 * CCBalance - 终端系统
 * T 键交互终端，命令解析和执行
 */

const Terminal = {
    // 终端元素
    overlay: null,
    output: null,
    input: null,
    suggestions: null,
    
    // 命令历史
    history: [],
    historyIndex: -1,
    
    // 当前输入
    currentInput: '',
    
    // 命令定义
    commands: {
        help: {
            desc: '显示帮助信息',
            usage: 'help [command]',
            execute: function(args) {
                if (args.length > 0) {
                    const cmd = Terminal.commands[args[0]];
                    if (cmd) {
                        return `命令: ${args[0]}\n用法: ${cmd.usage}\n说明: ${cmd.desc}`;
                    } else {
                        return `错误: 未知命令 "${args[0]}"`;
                    }
                }
                
                let help = '可用命令:\n\n';
                for (const [name, cmd] of Object.entries(Terminal.commands)) {
                    help += `  ${name.padEnd(15)} - ${cmd.desc}\n`;
                }
                help += '\n输入 "help <命令>" 查看详细用法';
                return help;
            }
        },
        
        clear: {
            desc: '清空终端输出',
            usage: 'clear',
            execute: function() {
                Terminal.clearOutput();
                return '';
            }
        },
        
        play: {
            desc: '启动指定关卡',
            usage: 'play <level_id>',
            execute: function(args) {
                if (args.length === 0) {
                    return '错误: 缺少关卡 ID\n用法: play <level_id>';
                }
                const levelId = parseInt(args[0]);
                if (isNaN(levelId)) {
                    return `错误: 无效的关卡 ID "${args[0]}"`;
                }
                
                const level = LevelData?.levels?.find(l => l.id === levelId);
                if (!level) {
                    return `错误: 关卡 ${levelId} 不存在`;
                }
                
                const progress = StorageManager.getProgress();
                if (!progress.unlockedLevels.includes(levelId)) {
                    return `错误: 关卡 ${levelId} 未解锁`;
                }
                
                Terminal.hide();
                setTimeout(() => {
                    UIManager?.showScreen?.('game');
                    Game?.startLevel?.(level);
                    AudioManager?.playGameBgm?.({ fadeMs: 500 });
                }, 200);
                
                return `启动关卡 ${levelId}: ${level.name}`;
            }
        },
        
        pass: {
            desc: '解锁指定关卡或全部关卡',
            usage: 'pass <level_id|all>',
            execute: function(args) {
                if (args.length === 0) {
                    return '错误: 缺少参数\n用法: pass <level_id|all>';
                }
                
                if (args[0] === 'all') {
                    const totalLevels = LevelData?.levels?.length || 0;
                    for (let i = 1; i <= totalLevels; i++) {
                        StorageManager.unlockLevel(i);
                    }
                    UIManager?.renderLevels?.();
                    return `已解锁全部 ${totalLevels} 个关卡`;
                }
                
                const levelId = parseInt(args[0]);
                if (isNaN(levelId)) {
                    return `错误: 无效的关卡 ID "${args[0]}"`;
                }
                
                StorageManager.unlockLevel(levelId + 1);
                UIManager?.renderLevels?.();
                return `已解锁关卡 ${levelId + 1}`;
            }
        },
        
        validate: {
            desc: '验证 CCB 文件',
            usage: 'validate <url_or_data>',
            execute: function(args) {
                if (args.length === 0) {
                    return '错误: 缺少参数\n用法: validate <url_or_data>';
                }
                
                try {
                    const dataStr = args.join(' ');
                    const data = JSON.parse(dataStr);
                    const result = WorkshopManager?.validateCCBData?.(data);
                    
                    if (result.valid) {
                        return `验证通过\n版本: ${data.version}\n关卡: ${data.metadata?.name || '未命名'}`;
                    } else {
                        return `验证失败:\n${result.errors.join('\n')}`;
                    }
                } catch (error) {
                    return `错误: ${error.message}`;
                }
            }
        },
        
        fetch: {
            desc: '从 URL 下载 CCB 文件',
            usage: 'fetch <url>',
            execute: async function(args) {
                if (args.length === 0) {
                    return '错误: 缺少 URL\n用法: fetch <url>';
                }
                
                try {
                    const result = await WorkshopManager?.downloadFromURL?.(args[0]);
                    WorkshopManager?.addLevel?.(result.data);
                    return `下载成功\n关卡: ${result.data.metadata?.name || '未命名'}\n版本: ${result.data.version}`;
                } catch (error) {
                    return `下载失败: ${error.message}`;
                }
            }
        },
        
        ls: {
            desc: '列出关卡或创意工坊内容',
            usage: 'ls [workshop]',
            execute: function(args) {
                if (args.length > 0 && args[0] === 'workshop') {
                    const levels = WorkshopManager?.getAllLevels?.() || [];
                    if (levels.length === 0) {
                        return '创意工坊暂无关卡';
                    }
                    let output = `创意工坊关卡 (${levels.length}):\n\n`;
                    levels.forEach(level => {
                        output += `  ${level.id.padEnd(20)} ${level.metadata?.name || '未命名'}\n`;
                    });
                    return output;
                }
                
                const progress = StorageManager.getProgress();
                const unlockedCount = progress.unlockedLevels.length;
                const totalCount = LevelData?.levels?.length || 0;
                
                let output = `关卡列表 (${unlockedCount}/${totalCount} 已解锁):\n\n`;
                LevelData?.levels?.forEach(level => {
                    const unlocked = progress.unlockedLevels.includes(level.id);
                    const status = unlocked ? '✓' : '✗';
                    output += `  ${status} ${String(level.id).padStart(2)} - ${level.name}\n`;
                });
                return output;
            }
        },
        
        status: {
            desc: '显示游戏状态',
            usage: 'status',
            execute: function() {
                const progress = StorageManager.getProgress();
                const settings = StorageManager.getSettings();
                
                let output = '游戏状态:\n\n';
                output += `  已解锁关卡: ${progress.unlockedLevels.length}\n`;
                output += `  掌握方程式: ${progress.masteredEquations.length}\n`;
                output += `  难度设置: ${['简单', '普通', '困难', 'C·C'][settings.difficulty - 1]}\n`;
                output += `  粒子效果: ${settings.particleCount}\n`;
                output += `  音效音量: ${settings.sfxVolume}%\n`;
                output += `  背景音量: ${settings.bgmVolume}%\n`;
                
                return output;
            }
        },
        
        version: {
            desc: '显示版本信息',
            usage: 'version',
            execute: async function() {
                if (window.electronAPI?.getAppInfo) {
                    const info = await window.electronAPI.getAppInfo();
                    let output = 'CCBalance v0.1.1\n\n';
                    output += `Electron: ${info.runtime.electron}\n`;
                    output += `Chrome: ${info.runtime.chrome}\n`;
                    output += `Node: ${info.runtime.node}\n`;
                    return output;
                } else {
                    return 'CCBalance v0.1.1\n运行环境: 浏览器';
                }
            }
        },
        
        exit: {
            desc: '关闭终端',
            usage: 'exit',
            execute: function() {
                Terminal.hide();
                return '';
            }
        }
    },
    
    /**
     * 初始化终端
     */
    init() {
        this.overlay = document.getElementById('terminal-overlay');
        this.output = document.getElementById('terminal-output');
        this.input = document.getElementById('terminal-input');
        this.suggestions = document.getElementById('terminal-suggestions');
        
        if (!this.overlay || !this.output || !this.input) {
            console.warn('Terminal elements not found');
            return;
        }
        
        this.bindEvents();
        
        // 显示欢迎信息
        this.printWelcome();
    },
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // T 键打开终端
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                // 避免在输入框中触发
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                this.show();
            }
        });
        
        // 关闭按钮
        document.getElementById('btn-terminal-close')?.addEventListener('click', () => {
            this.hide();
        });
        
        // ESC 关闭终端
        this.overlay?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        });
        
        // 输入事件
        this.input?.addEventListener('keydown', (e) => {
            this.handleInput(e);
        });
        
        // 实时建议
        this.input?.addEventListener('input', () => {
            this.updateSuggestions();
        });
        
        // 点击遮罩关闭
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
    },
    
    /**
     * 显示终端
     */
    show() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('hidden');
        setTimeout(() => {
            this.input?.focus();
        }, 100);
        
        AudioManager?.playSound?.('click');
    },
    
    /**
     * 隐藏终端
     */
    hide() {
        if (!this.overlay) return;
        
        this.overlay.classList.add('hidden');
        this.input.value = '';
        this.suggestions.classList.remove('show');
        
        AudioManager?.playSound?.('click');
    },
    
    /**
     * 打印欢迎信息
     */
    printWelcome() {
        const welcome = `
CCBalance Terminal v0.1.1
Type "help" for available commands
        `.trim();
        
        this.printOutput(welcome, 'success');
    },
    
    /**
     * 处理输入
     */
    handleInput(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.executeCommand();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory(1);
                break;
                
            case 'Tab':
                e.preventDefault();
                this.autoComplete();
                break;
        }
    },
    
    /**
     * 执行命令
     */
    async executeCommand() {
        const commandLine = this.input.value.trim();
        if (!commandLine) return;
        
        // 添加到历史
        this.history.push(commandLine);
        this.historyIndex = this.history.length;
        
        // 显示命令
        this.printOutput(`$ ${commandLine}`, 'command');
        
        // 解析命令
        const parts = commandLine.split(/\s+/);
        const cmdName = parts[0];
        const args = parts.slice(1);
        
        // 执行命令
        const cmd = this.commands[cmdName];
        if (cmd) {
            try {
                const result = await cmd.execute(args);
                if (result) {
                    const type = result.startsWith('错误:') ? 'error' : 'output';
                    this.printOutput(result, type);
                }
            } catch (error) {
                this.printOutput(`错误: ${error.message}`, 'error');
            }
        } else {
            this.printOutput(`错误: 未知命令 "${cmdName}"\n输入 "help" 查看可用命令`, 'error');
        }
        
        // 清空输入
        this.input.value = '';
        this.suggestions.classList.remove('show');
    },
    
    /**
     * 输出内容
     */
    printOutput(text, type = 'output') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        this.output.appendChild(line);
        
        // 滚动到底部
        this.output.scrollTop = this.output.scrollHeight;
    },
    
    /**
     * 清空输出
     */
    clearOutput() {
        this.output.innerHTML = '';
    },
    
    /**
     * 导航历史记录
     */
    navigateHistory(direction) {
        if (this.history.length === 0) return;
        
        this.historyIndex += direction;
        this.historyIndex = Math.max(0, Math.min(this.historyIndex, this.history.length));
        
        if (this.historyIndex < this.history.length) {
            this.input.value = this.history[this.historyIndex];
        } else {
            this.input.value = '';
        }
    },
    
    /**
     * 自动补全
     */
    autoComplete() {
        const input = this.input.value.trim();
        if (!input) return;
        
        const matches = Object.keys(this.commands).filter(cmd => cmd.startsWith(input));
        if (matches.length === 1) {
            this.input.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            this.printOutput(`可能的命令: ${matches.join(', ')}`, 'output');
        }
    },
    
    /**
     * 更新建议
     */
    updateSuggestions() {
        const input = this.input.value.trim();
        
        if (!input) {
            this.suggestions.classList.remove('show');
            return;
        }
        
        const matches = Object.entries(this.commands)
            .filter(([cmd]) => cmd.startsWith(input))
            .slice(0, 5);
        
        if (matches.length === 0) {
            this.suggestions.classList.remove('show');
            return;
        }
        
        this.suggestions.innerHTML = matches.map(([cmd, info]) => `
            <div class="terminal-suggestion-item">
                <span class="terminal-suggestion-cmd">${cmd}</span>
                <span class="terminal-suggestion-desc">${info.desc}</span>
            </div>
        `).join('');
        
        this.suggestions.classList.add('show');
        
        // 绑定点击事件
        this.suggestions.querySelectorAll('.terminal-suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.input.value = matches[index][0] + ' ';
                this.input.focus();
                this.suggestions.classList.remove('show');
            });
        });
    }
};

// 导出
window.Terminal = Terminal;
