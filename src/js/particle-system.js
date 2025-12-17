/**
 * CCBalance - 粒子系统模块
 */

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.running = false;
        this.settings = {
            maxParticles: 200,
            particleSize: { min: 2, max: 6 },
            speed: { min: 0.5, max: 2 },
            colors: {
                reactant: ['#00d4ff', '#7b2dff', '#00ff88'],
                product: ['#ff00aa', '#ff4466', '#ffaa00'],
                neutral: ['#ffffff', '#aaaaaa']
            }
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    setMaxParticles(count) {
        this.settings.maxParticles = count;
    }

    /**
     * 创建粒子
     */
    createParticle(options = {}) {
        const defaults = {
            x: Utils.random(0, this.width),
            y: Utils.random(0, this.height),
            vx: Utils.random(-1, 1),
            vy: Utils.random(-1, 1),
            size: Utils.random(this.settings.particleSize.min, this.settings.particleSize.max),
            color: Utils.randomChoice(this.settings.colors.reactant),
            alpha: Utils.random(0.5, 1),
            life: Utils.random(100, 300),
            maxLife: 300,
            type: 'default',
            glow: true
        };
        
        return { ...defaults, ...options };
    }

    /**
     * 添加粒子
     */
    addParticle(options = {}) {
        if (this.particles.length < this.settings.maxParticles) {
            this.particles.push(this.createParticle(options));
        }
    }

    /**
     * 添加多个粒子
     */
    addParticles(count, options = {}) {
        for (let i = 0; i < count; i++) {
            this.addParticle(options);
        }
    }

    /**
     * 创建反应物粒子流
     */
    createReactantFlow(species, direction = 'left') {
        const color = Utils.randomChoice(this.settings.colors.reactant);
        const startX = direction === 'left' ? 0 : this.width;
        const targetX = this.centerX;
        
        for (let i = 0; i < 10; i++) {
            this.addParticle({
                x: startX + Utils.random(-20, 20),
                y: Utils.random(this.height * 0.3, this.height * 0.7),
                vx: direction === 'left' ? Utils.random(1, 3) : Utils.random(-3, -1),
                vy: Utils.random(-0.5, 0.5),
                color: color,
                type: 'reactant',
                species: species,
                targetX: targetX
            });
        }
    }

    /**
     * 创建产物粒子流
     */
    createProductFlow(species, direction = 'right') {
        const color = Utils.randomChoice(this.settings.colors.product);
        
        for (let i = 0; i < 10; i++) {
            this.addParticle({
                x: this.centerX + Utils.random(-20, 20),
                y: Utils.random(this.height * 0.3, this.height * 0.7),
                vx: direction === 'right' ? Utils.random(1, 3) : Utils.random(-3, -1),
                vy: Utils.random(-0.5, 0.5),
                color: color,
                type: 'product',
                species: species
            });
        }
    }

    /**
     * 创建平衡指示粒子
     */
    createBalanceParticles(balance) {
        // balance: -1 到 1, 负数表示逆向，正数表示正向
        const direction = balance > 0 ? 1 : -1;
        const intensity = Math.abs(balance);
        const count = Math.floor(intensity * 20);
        
        for (let i = 0; i < count; i++) {
            const isForward = balance > 0;
            this.addParticle({
                x: this.centerX,
                y: Utils.random(this.height * 0.2, this.height * 0.8),
                vx: direction * Utils.random(1, 3) * intensity,
                vy: Utils.random(-1, 1),
                color: isForward ? 
                    Utils.randomChoice(this.settings.colors.product) : 
                    Utils.randomChoice(this.settings.colors.reactant),
                type: 'balance',
                size: Utils.random(3, 6)
            });
        }
    }

    /**
     * 创建曼陀罗图案
     */
    createMandalaPattern() {
        const rings = 4;
        const particlesPerRing = 12;
        
        for (let r = 0; r < rings; r++) {
            const radius = 50 + r * 40;
            for (let i = 0; i < particlesPerRing; i++) {
                const angle = (i / particlesPerRing) * Math.PI * 2;
                const speed = 0.01 * (r + 1);
                
                this.addParticle({
                    x: this.centerX + Math.cos(angle) * radius,
                    y: this.centerY + Math.sin(angle) * radius,
                    vx: 0,
                    vy: 0,
                    color: Utils.randomChoice([...this.settings.colors.reactant, ...this.settings.colors.product]),
                    type: 'mandala',
                    radius: radius,
                    angle: angle,
                    angularSpeed: speed * (r % 2 === 0 ? 1 : -1),
                    size: 4
                });
            }
        }
    }

    /**
     * 创建爆发效果
     */
    burst(x, y, count = 30, color = null) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Utils.random(2, 5);
            
            this.addParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color || Utils.randomChoice([...this.settings.colors.reactant, ...this.settings.colors.product]),
                type: 'burst',
                life: 50,
                maxLife: 50,
                size: Utils.random(2, 5)
            });
        }
    }

    /**
     * 创建沉淀效果
     */
    createPrecipitate(x, y) {
        for (let i = 0; i < 20; i++) {
            this.addParticle({
                x: x + Utils.random(-30, 30),
                y: y,
                vx: Utils.random(-0.5, 0.5),
                vy: Utils.random(1, 3),
                color: '#ffaa00',
                type: 'precipitate',
                size: Utils.random(3, 6),
                gravity: 0.05
            });
        }
    }

    /**
     * 创建气泡效果
     */
    createBubbles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.addParticle({
                x: x + Utils.random(-30, 30),
                y: y,
                vx: Utils.random(-0.3, 0.3),
                vy: Utils.random(-2, -4),
                color: 'rgba(255, 255, 255, 0.8)',
                type: 'bubble',
                size: Utils.random(3, 8),
                wobble: Utils.random(0.5, 1.5)
            });
        }
    }

    /**
     * 更新粒子
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // 更新位置
            switch (p.type) {
                case 'mandala':
                    p.angle += p.angularSpeed;
                    p.x = this.centerX + Math.cos(p.angle) * p.radius;
                    p.y = this.centerY + Math.sin(p.angle) * p.radius;
                    break;
                    
                case 'bubble':
                    p.x += p.vx + Math.sin(p.y * 0.1) * p.wobble * 0.5;
                    p.y += p.vy;
                    break;
                    
                case 'precipitate':
                    p.vy += p.gravity || 0;
                    p.x += p.vx;
                    p.y += p.vy;
                    break;
                    
                default:
                    p.x += p.vx;
                    p.y += p.vy;
            }
            
            // 更新生命值
            p.life--;
            p.alpha = (p.life / p.maxLife) * (p.type === 'mandala' ? 1 : 0.8);
            
            // 移除死亡粒子
            if (p.life <= 0 || p.x < -50 || p.x > this.width + 50 || 
                p.y < -50 || p.y > this.height + 50) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 渲染粒子
     */
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            
            // 发光效果
            if (p.glow) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = p.color;
            }
            
            // 绘制粒子
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
            
            // 粒子尾迹
            if (p.type === 'balance' || p.type === 'burst') {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = p.size * 0.5;
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
    }

    /**
     * 动画循环
     */
    animate() {
        if (!this.running) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }

    /**
     * 启动系统
     */
    start() {
        this.running = true;
        this.animate();
    }

    /**
     * 停止系统
     */
    stop() {
        this.running = false;
    }

    /**
     * 清除所有粒子
     */
    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * 设置平衡状态可视化
     */
    visualizeBalance(balance, forwardRate, reverseRate) {
        // 清除旧粒子
        this.particles = this.particles.filter(p => p.type === 'mandala');
        
        // 创建流动粒子
        const intensity = Math.abs(balance);
        
        if (balance > 0.1) {
            // 正向反应占优
            this.createBalanceParticles(balance);
        } else if (balance < -0.1) {
            // 逆向反应占优
            this.createBalanceParticles(balance);
        }
        
        // 保持曼陀罗图案
        if (this.particles.filter(p => p.type === 'mandala').length < 48) {
            this.createMandalaPattern();
        }
    }
}

/**
 * 背景粒子系统
 */
class BackgroundParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.running = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.color = '#00d4ff';
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

    setMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    setColor(hex) {
        const value = String(hex || '').trim();
        this.color = value || '#00d4ff';
    }

    _hexToRgb(hex) {
        const raw = String(hex || '').trim().replace('#', '');
        const value = raw.length === 3
            ? raw.split('').map(ch => ch + ch).join('')
            : raw;
        if (!/^[0-9a-fA-F]{6}$/.test(value)) return { r: 0, g: 212, b: 255 };
        return {
            r: parseInt(value.slice(0, 2), 16),
            g: parseInt(value.slice(2, 4), 16),
            b: parseInt(value.slice(4, 6), 16)
        };
    }

    burst(x, y, strength = 36) {
        // 在点击点附近“冲散”粒子（仅改变已有粒子的速度/透明度）
        const radius = 220;
        const push = 0.06;

        for (const p of this.particles) {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= 0.001 || dist > radius) continue;

            const t = 1 - dist / radius;
            const nx = dx / dist;
            const ny = dy / dist;

            p.vx += nx * push * t * strength;
            p.vy += ny * push * t * strength;
            p.alpha = Math.min(0.9, p.alpha + 0.15 * t);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    init(count = 80) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Utils.random(0, this.width),
                y: Utils.random(0, this.height),
                vx: Utils.random(-0.3, 0.3),
                vy: Utils.random(-0.3, 0.3),
                size: Utils.random(1, 3),
                alpha: Utils.random(0.3, 0.7)
            });
        }
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            
            // 边界反弹
            if (p.x < 0 || p.x > this.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.height) p.vy *= -1;
            
            // 鼠标交互
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 150) {
                p.x -= dx * 0.01;
                p.y -= dy * 0.01;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        const { r, g, b } = this._hexToRgb(this.color);
        
        // 绘制连接线
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.12)`;
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dist = Utils.distance(p1.x, p1.y, p2.x, p2.y);
                
                if (dist < 120) {
                    this.ctx.globalAlpha = (1 - dist / 120) * 0.3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
        
        // 绘制粒子
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = this.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }

    animate() {
        if (!this.running) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }

    start() {
        this.running = true;
        this.init();
        this.animate();
    }

    stop() {
        this.running = false;
    }
}

// 导出
window.ParticleSystem = ParticleSystem;
window.BackgroundParticleSystem = BackgroundParticleSystem;
