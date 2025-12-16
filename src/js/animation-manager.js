/**
 * CCBalance - 动画管理模块
 */

const AnimationManager = {
    animations: new Map(),
    
    /**
     * 初始化动画管理器
     */
    init() {
        // 初始化监听全局动画需求
        // 可以在这里设置全局动画配置
    },
    
    /**
     * 创建动画
     */
    create(id, options) {
        const animation = {
            id: id,
            startTime: performance.now(),
            duration: options.duration || 1000,
            easing: options.easing || 'easeOutQuad',
            from: options.from,
            to: options.to,
            onUpdate: options.onUpdate,
            onComplete: options.onComplete,
            running: true
        };
        
        this.animations.set(id, animation);
        this.tick(animation);
        
        return animation;
    },

    /**
     * 缓动函数
     */
    easings: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 :
                Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },
        easeOutBounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },

    /**
     * 动画帧
     */
    tick(animation) {
        if (!animation.running) return;
        
        const now = performance.now();
        const elapsed = now - animation.startTime;
        let progress = Math.min(elapsed / animation.duration, 1);
        
        // 应用缓动
        const easingFn = this.easings[animation.easing] || this.easings.linear;
        const easedProgress = easingFn(progress);
        
        // 计算当前值
        let currentValue;
        if (typeof animation.from === 'number') {
            currentValue = animation.from + (animation.to - animation.from) * easedProgress;
        } else if (typeof animation.from === 'object') {
            currentValue = {};
            for (const key in animation.from) {
                currentValue[key] = animation.from[key] + 
                    (animation.to[key] - animation.from[key]) * easedProgress;
            }
        }
        
        // 回调更新
        if (animation.onUpdate) {
            animation.onUpdate(currentValue, easedProgress);
        }
        
        // 完成检测
        if (progress >= 1) {
            animation.running = false;
            this.animations.delete(animation.id);
            if (animation.onComplete) {
                animation.onComplete();
            }
        } else {
            requestAnimationFrame(() => this.tick(animation));
        }
    },

    /**
     * 停止动画
     */
    stop(id) {
        const animation = this.animations.get(id);
        if (animation) {
            animation.running = false;
            this.animations.delete(id);
        }
    },

    /**
     * 停止所有动画
     */
    stopAll() {
        for (const [id, animation] of this.animations) {
            animation.running = false;
        }
        this.animations.clear();
    },

    /**
     * 数值动画
     */
    animateValue(element, from, to, duration = 500, suffix = '') {
        const id = Utils.generateId();
        this.create(id, {
            duration: duration,
            easing: 'easeOutQuad',
            from: from,
            to: to,
            onUpdate: (value) => {
                element.textContent = Math.round(value) + suffix;
            }
        });
    },

    /**
     * 滑块动画
     */
    animateSlider(slider, targetValue, duration = 300) {
        const id = 'slider_' + Utils.generateId();
        const startValue = parseFloat(slider.value);
        
        this.create(id, {
            duration: duration,
            easing: 'easeOutQuad',
            from: startValue,
            to: targetValue,
            onUpdate: (value) => {
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
    },

    /**
     * 平衡指针动画
     */
    animateBalancePointer(pointer, targetPosition, duration = 500) {
        const id = 'balance_pointer';
        this.stop(id);
        
        const currentLeft = parseFloat(pointer.style.left) || 50;
        
        this.create(id, {
            duration: duration,
            easing: 'easeOutElastic',
            from: currentLeft,
            to: targetPosition,
            onUpdate: (value) => {
                pointer.style.left = value + '%';
            }
        });
    },

    /**
     * 进度条动画
     */
    animateProgress(element, targetPercentage, duration = 500) {
        if (!element) return;
        
        const currentWidth = parseFloat(element.style.width) || 0;
        const id = 'progress_' + Utils.generateId();
        
        this.create(id, {
            duration: duration,
            easing: 'easeOutQuad',
            from: currentWidth,
            to: targetPercentage,
            onUpdate: (value) => {
                element.style.width = value + '%';
            }
        });
    },

    /**
     * 震动效果
     */
    shake(element, intensity = 5, duration = 500) {
        const id = 'shake_' + Utils.generateId();
        const startTime = performance.now();
        
        const shakeFrame = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= duration) {
                element.style.transform = '';
                return;
            }
            
            const progress = elapsed / duration;
            const currentIntensity = intensity * (1 - progress);
            const x = (Math.random() - 0.5) * 2 * currentIntensity;
            const y = (Math.random() - 0.5) * 2 * currentIntensity;
            
            element.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shakeFrame);
        };
        
        shakeFrame();
    },

    /**
     * 脉冲效果
     */
    pulse(element, scale = 1.1, duration = 300) {
        element.style.transition = `transform ${duration / 2}ms ease-out`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            setTimeout(() => {
                element.style.transition = '';
            }, duration / 2);
        }, duration / 2);
    },

    /**
     * 高亮闪烁
     */
    highlight(element, color = '#00d4ff', duration = 500) {
        const originalBoxShadow = element.style.boxShadow;
        element.style.transition = `box-shadow ${duration / 2}ms ease-out`;
        element.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
        
        setTimeout(() => {
            element.style.boxShadow = originalBoxShadow;
            setTimeout(() => {
                element.style.transition = '';
            }, duration / 2);
        }, duration / 2);
    },

    /**
     * 屏幕切换动画
     */
    async transitionScreen(fromScreen, toScreen) {
        return new Promise(resolve => {
            // 淡出当前屏幕
            fromScreen.classList.add('leaving');
            
            setTimeout(() => {
                fromScreen.classList.remove('active', 'leaving');
                
                // 淡入新屏幕
                toScreen.classList.add('active', 'entering');
                
                setTimeout(() => {
                    toScreen.classList.remove('entering');
                    resolve();
                }, 500);
            }, 300);
        });
    },

    /**
     * 胜利特效
     */
    playVictoryEffect(container) {
        // 创建胜利粒子
        const colors = ['#00ff88', '#00d4ff', '#7b2dff', '#ffaa00'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'burst-particle';
                particle.style.cssText = `
                    left: ${50 + Utils.random(-20, 20)}%;
                    top: ${50 + Utils.random(-20, 20)}%;
                    width: ${Utils.random(5, 15)}px;
                    height: ${Utils.random(5, 15)}px;
                    background: ${Utils.randomChoice(colors)};
                    --dx: ${Utils.random(-100, 100)}px;
                    --dy: ${Utils.random(-150, -50)}px;
                `;
                container.appendChild(particle);
                
                setTimeout(() => particle.remove(), 1000);
            }, i * 30);
        }
    },

    /**
     * 点击扩散特效
     */
    playClickBurstEffect(x, y) {
        const layer = document.getElementById('effects-layer');
        if (!layer) return;

        const burst = document.createElement('div');
        burst.className = 'burst-container';
        burst.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 1px;
            height: 1px;
            z-index: 9998;
        `;
        layer.appendChild(burst);

        const colors = ['var(--primary-color)', 'var(--secondary-color)', 'var(--accent-color)', 'var(--success-color)'];
        const count = 28;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'burst-particle';

            const angle = (i / count) * Math.PI * 2;
            const radius = 60 + Utils.random(-10, 90);
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            const size = Utils.random(4, 12);

            p.style.cssText = `
                left: 0px;
                top: 0px;
                width: ${size}px;
                height: ${size}px;
                background: ${Utils.randomChoice(colors)};
                --dx: ${dx}px;
                --dy: ${dy}px;
                box-shadow: 0 0 12px ${Utils.randomChoice(colors)};
            `;
            burst.appendChild(p);
        }

        // 轻微二次环
        setTimeout(() => {
            for (let i = 0; i < 10; i++) {
                const p = document.createElement('div');
                p.className = 'burst-particle';
                const dx = Utils.random(-140, 140);
                const dy = Utils.random(-140, 140);
                const size = Utils.random(2, 6);
                p.style.cssText = `
                    left: 0px;
                    top: 0px;
                    width: ${size}px;
                    height: ${size}px;
                    background: ${Utils.randomChoice(colors)};
                    --dx: ${dx}px;
                    --dy: ${dy}px;
                    opacity: 0.9;
                `;
                burst.appendChild(p);
            }
        }, 60);

        setTimeout(() => burst.remove(), 1100);
    },

    /**
     * 失败特效
     */
    playDefeatEffect(container) {
        // 震动效果
        this.shake(container, 10, 500);
        
        // 红色闪烁
        const flash = document.createElement('div');
        flash.className = 'fullscreen-effect';
        flash.style.cssText = `
            background: rgba(255, 68, 102, 0.3);
            animation: flash 0.5s ease-out forwards;
        `;
        container.appendChild(flash);
        
        setTimeout(() => flash.remove(), 500);
    },

    /**
     * 能力卡牌激活特效
     */
    playCardEffect(card, type) {
        // 发光效果
        this.highlight(card, '#00ff88', 500);
        
        // 粒子爆发
        const rect = card.getBoundingClientRect();
        const burst = document.createElement('div');
        burst.className = 'burst-container';
        burst.style.cssText = `
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
        `;
        document.body.appendChild(burst);
        
        setTimeout(() => burst.remove(), 1000);
    },

    /**
     * 回合切换动画
     */
    async playTurnTransition(roundNumber) {
        const overlay = document.createElement('div');
        overlay.className = 'turn-overlay';
        overlay.innerHTML = `
            <div class="turn-content">
                <span class="turn-label">回合</span>
                <span class="turn-number">${roundNumber}</span>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const content = overlay.querySelector('.turn-content');
        content.style.cssText = `
            text-align: center;
            transform: scale(0.5);
            transition: transform 0.3s ease;
        `;
        
        const label = overlay.querySelector('.turn-label');
        label.style.cssText = `
            display: block;
            font-size: 24px;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 8px;
        `;
        
        const number = overlay.querySelector('.turn-number');
        number.style.cssText = `
            display: block;
            font-size: 72px;
            font-weight: 700;
            color: #00d4ff;
            text-shadow: 0 0 30px #00d4ff;
        `;
        
        document.body.appendChild(overlay);
        
        await Utils.nextFrame();
        overlay.style.opacity = '1';
        content.style.transform = 'scale(1)';
        
        await Utils.sleep(1000);
        
        overlay.style.opacity = '0';
        await Utils.sleep(300);
        overlay.remove();
    }
};

// 导出
window.AnimationManager = AnimationManager;
