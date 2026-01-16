const GRAVITY = 0.8;
const GROUND_Y = 450; 

const STATE = { IDLE: 0, RUN: 1, ATTACK: 2, BLOCK: 3, HIT: 4, DODGE: 5, DEAD: 6, SPECIAL: 7, RETREAT: 8, WIN: 9 };

function drawEllipse(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
}

class ChibiFighter {
    constructor(x, y, isP1, name, type, customStats) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.isP1 = isP1;
        this.name = name;
        this.type = type || 'wolf'; 
        
        this.level = 1;
        this.stats = { str: 10, agi: 10, tec: 10 };
        this.exp = 0;
        this.maxExp = 100;
        this.points = 0;
        
        this.initStatsByType();

        if (customStats) {
            this.level = customStats.level;
            this.exp = customStats.exp;
            this.maxExp = customStats.maxExp;
            this.points = customStats.points;
            this.stats = { ...customStats.stats };
            this.isBoss = customStats.isBoss || false;
        }

        this.maxHp = 100 + (this.stats.str * 5) + (this.level * 20);
        if (this.isBoss) {
            this.maxHp *= 2;
        }
        this.hp = this.maxHp;
        
        this.facing = isP1 ? 1 : -1;
        this.state = STATE.IDLE;
        this.vx = 0;
        this.vy = 0;
        this.width = 60;
        this.height = 90;
        this.animFrame = 0;
        this.alpha = 1.0;
        this.isCrit = false;
        
        // Buffs system
        this.buffs = {
            forceCombo: false,
            forceCrit: false,
            forceBlock: false,
            forceDodge: false,
            atkMultiplier: 1.0, // New base stat
            agiMultiplier: 1.0, // New AGI stat
            strBonusMultiplier: 0 // 力量傷害加成 (e.g., 0.5 for 50%)
        };
        
        this.holdingWeapon = null; // New: Weapon holding state
    }

    initStatsByType() {
        if (this.type === 'wolf') {
            this.stats = { str: 18, agi: 25, tec: 15 }; 
        } else if (this.type === 'girl') {
            this.stats = { str: 28, agi: 12, tec: 10 }; 
        } 
        else if (this.type === 'villain_1') {
            this.level = 3;
            this.stats = { str: 12, agi: 15, tec: 12 };
        } else if (this.type === 'villain_2') {
            this.level = 6;
            this.stats = { str: 22, agi: 10, tec: 18 };
        } else if (this.type === 'villain_3') {
            this.level = 10;
            this.stats = { str: 25, agi: 35, tec: 30 };
        }
        else if (this.type === 'goblin') {
            this.stats = { str: 8, agi: 12, tec: 8 };
        }
        else if (this.type === 'wild_boar') {
            this.stats = { str: 12, agi: 6, tec: 10 };
        }
        else if (this.type === 'treant') {
            this.stats = { str: 15, agi: 5, tec: 15 };
        }
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.hp = this.maxHp;
        this.state = STATE.IDLE;
        this.facing = this.isP1 ? 1 : -1;
        this.alpha = 1.0;
        this.isCrit = false;
        this.vx = 0;
        this.vy = 0;
        this.buffs = { forceCombo: false, forceCrit: false, forceBlock: false, forceDodge: false, atkMultiplier: 1.0, agiMultiplier: 1.0, strBonusMultiplier: 0 }; // 重設 buffs
        this.holdingWeapon = null;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += GRAVITY;
        
        if (this.y > GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
        }

        if (this.state === STATE.IDLE || this.state === STATE.HIT || this.state === STATE.DODGE || this.state === STATE.DEAD || this.state === STATE.WIN) {
            this.vx *= 0.8;
        }

        this.animFrame++;
        
        if (this.state === STATE.DODGE) {
            this.alpha = 0.5;
        } else {
            this.alpha = 1.0;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.state !== STATE.DODGE && this.state !== STATE.DEAD) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, GROUND_Y + 5, 25, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(this.x, this.y);
        if (this.state === STATE.DEAD) {
            ctx.rotate(this.facing * Math.PI / 2);
            ctx.translate(0, -20);
        }
        ctx.scale(this.facing, 1);

        let bobY = 0;
        if (this.state === STATE.IDLE) bobY = Math.sin(this.animFrame * 0.1) * 2;
        if (this.state === STATE.RUN) bobY = Math.sin(this.animFrame * 0.5) * 5;
        if (this.state === STATE.WIN) bobY = Math.sin(this.animFrame * 0.2) * 5;

        // Q版风格配色
        let colors = { pants: '#37474f', body: '#546e7a', skin: '#ffccbc', hair: '#c4a75b', detail: '#cfd8dc', acc: '#fff', eye: '#2c2c2c' };

        if (this.type === 'girl') {
            colors = { pants: '#1565c0', body: '#ff7043', skin: '#ffccbc', hair: '#e8632c', detail: '#fff', acc: '#d84315', eye: '#3e2723' };
        } else if (this.type.startsWith('villain')) {
            colors = { pants: '#212121', body: '#000000', skin: '#e0e0e0', hair: '#424242', detail: '#757575', acc: '#212121', eye: '#d50000' };
            if (this.type === 'villain_2') colors.hair = '#3e2723'; 
            if (this.type === 'villain_3') colors.body = '#1a237e'; 
        } else if (this.type === 'goblin') {
            colors = { pants: '#5d4037', body: '#4caf50', skin: '#8bc34a', hair: '#33691e', detail: '#a1887f', acc: '#fbc02d', eye: '#000' };
        } else if (this.type === 'wild_boar') {
            colors = { pants: '#4e342e', body: '#795548', skin: '#a1887f', hair: '#4e342e', detail: '#d7ccc8', acc: '#fff', eye: '#000' };
        } else if (this.type === 'treant') {
            colors = { pants: '#3e2723', body: '#5d4037', skin: '#8d6e63', hair: '#4caf50', detail: '#a1887f', acc: '#cddc39', eye: '#cddc39' };
        }

        // --- BOSS Aura ---
        if (this.isBoss) {
            const auraAlpha = 0.4 + Math.sin(this.animFrame * 0.1) * 0.3;
            const auraSize = 35 + Math.sin(this.animFrame * 0.1) * 5;
            drawEllipse(ctx, 0, -45, auraSize, 80, `rgba(211, 47, 47, ${auraAlpha})`);
            drawEllipse(ctx, 0, -45, auraSize * 0.7, 60, `rgba(255, 205, 210, ${auraAlpha * 0.8})`);
        }

        // Define which models use which base
        const isGirlModel = (this.type === 'girl' || this.type === 'villain_2' || this.type === 'treant');
        const isBoarModel = (this.type === 'wild_boar');
        // Default is Wolf/Goblin model

        if (!isGirlModel) {
            // == WOLF - Q版风格 ==
            ctx.translate(0, bobY);
            
            // Legs - 圆形
            ctx.fillStyle = colors.pants;
            if (this.state === STATE.RUN || this.state === STATE.WIN) {
                let lOffset = (this.state===STATE.WIN) ? 0 : Math.sin(this.animFrame * 0.5) * 10;
                // Left leg
                ctx.beginPath(); ctx.ellipse(-9 + lOffset, -8, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
                // Right leg
                ctx.beginPath(); ctx.ellipse(11 - lOffset, -8, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
            } else {
                // Left leg
                ctx.beginPath(); ctx.ellipse(-9, -8, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
                // Right leg
                ctx.beginPath(); ctx.ellipse(11, -8, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
            }

            // Body - 圆润的梯形
            const bodyGrad = ctx.createLinearGradient(0, -50, 0, -15);
            bodyGrad.addColorStop(0, colors.body);
            bodyGrad.addColorStop(1, '#2c3e50');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(-18, -48);
            ctx.quadraticCurveTo(-22, -35, -15, -10);
            ctx.lineTo(15, -10);
            ctx.quadraticCurveTo(22, -35, 18, -48);
            ctx.quadraticCurveTo(0, -55, -18, -48);
            ctx.closePath();
            ctx.fill();
            // Body outline
            ctx.strokeStyle = 'rgba(26, 37, 47, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Head - 大圆头
            const headGrad = ctx.createRadialGradient(-1, -72, 10, 0, -68, 32);
            headGrad.addColorStop(0, '#fff0e6');
            headGrad.addColorStop(0.5, '#ffe0d2');
            headGrad.addColorStop(1, colors.skin);
            ctx.fillStyle = headGrad;
            ctx.beginPath(); ctx.arc(-1, -68, 28, 0, Math.PI * 2); ctx.fill();
            // Head shadow
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.arc(-1, -65, 28, 0, Math.PI * 2); ctx.fill();

            // Hair - 蓬松
            ctx.fillStyle = colors.hair;
            ctx.beginPath();
            ctx.arc(-1, -75, 32, Math.PI, Math.PI * 2.2);
            ctx.lineTo(25, -50);
            ctx.lineTo(-25, -50);
            ctx.fill();
            
            // Hair shine
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath(); ctx.arc(-12, -85, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.arc(6, -92, 8, 0, Math.PI * 2); ctx.fill();
            
            // Hair strands
            ctx.fillStyle = colors.hair;
            ctx.beginPath(); ctx.moveTo(-20, -90); ctx.lineTo(-28, -100); ctx.lineTo(-10, -95); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, -95); ctx.lineTo(20, -100); ctx.lineTo(16, -90); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-24, -80); ctx.lineTo(-32, -90); ctx.lineTo(-22, -85); ctx.fill();
            ctx.beginPath(); ctx.moveTo(24, -80); ctx.lineTo(32, -90); ctx.lineTo(22, -85); ctx.fill();

            // Goblin ears
            if (this.type === 'goblin') {
                ctx.fillStyle = colors.skin;
                ctx.beginPath(); ctx.moveTo(-22, -75); ctx.lineTo(-37, -80); ctx.lineTo(-32, -65); ctx.fill();
                ctx.beginPath(); ctx.moveTo(22, -75); ctx.lineTo(37, -80); ctx.lineTo(32, -65); ctx.fill();
            }

            // Eyes & Mouth
            if (this.state === STATE.HIT || this.state === STATE.DEAD) {
                ctx.fillStyle = colors.eye;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(3, -72); ctx.lineTo(9, -66); ctx.moveTo(9, -72); ctx.lineTo(3, -66);
                ctx.moveTo(13, -72); ctx.lineTo(19, -66); ctx.moveTo(19, -72); ctx.lineTo(13, -66);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(11, -58, 4, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
            } else if (this.state === STATE.BLOCK) {
                ctx.fillStyle = colors.eye;
                ctx.fillRect(3, -70, 5, 2);
                ctx.fillRect(13, -70, 5, 2);
            } else if (this.state === STATE.WIN) {
                ctx.fillStyle = colors.eye;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(6, -70, 4, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(16, -70, 4, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(11, -60, 5, 0, Math.PI); ctx.stroke();
            } else if (this.state === STATE.ATTACK) {
                ctx.fillStyle = colors.eye;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(2, -74); ctx.lineTo(10, -72); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(12, -72); ctx.lineTo(20, -74); ctx.stroke();
                // Eyes with pupils
                ctx.fillStyle = colors.eye;
                ctx.beginPath(); ctx.arc(6, -70, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(16, -70, 3.5, 0, Math.PI * 2); ctx.fill();
                // Pupils
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(6, -71, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(16, -71, 2, 0, Math.PI * 2); ctx.fill();
            } else {
                // Normal eyes - 大眼睛
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.beginPath();
                ctx.arc(5, -70, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(17, -70, 5, 0, Math.PI * 2);
                ctx.fill();
                // Pupils
                ctx.fillStyle = colors.eye;
                ctx.beginPath();
                ctx.arc(6, -69, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(18, -69, 3, 0, Math.PI * 2);
                ctx.fill();
                // Eye shine
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(7, -71, 1.3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(19, -71, 1.3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(5, -67, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(17, -67, 1, 0, Math.PI * 2); ctx.fill();
                
                // Mouth
                ctx.strokeStyle = colors.eye;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(11, -55, 4, 0.2, Math.PI - 0.2);
                ctx.stroke();
                
                // Blush
                ctx.fillStyle = 'rgba(255, 130, 180, 0.35)';
                ctx.beginPath(); ctx.arc(-5, -61, 5.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(27, -61, 5.5, 0, Math.PI * 2); ctx.fill();
            }

            // Arms
            if (this.state === STATE.ATTACK) {
                ctx.save();
                if (this.isCrit) { ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700'; }
                let swing = Math.sin(this.animFrame * 0.2);
                ctx.translate(8, -55);
                ctx.rotate(swing - 0.5);
                
                // Arm drawing
                ctx.fillStyle = colors.skin;
                ctx.beginPath();
                ctx.ellipse(15, 0, 16, 8, 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                // Hand
                ctx.fillStyle = '#d4a574';
                ctx.beginPath();
                ctx.ellipse(35, 0, 7, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            } else if (this.state === STATE.BLOCK) {
                ctx.save();
                ctx.translate(15, -55);
                ctx.rotate(-1.5);
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(10, 5, 11, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (this.state === STATE.WIN) {
                // Both arms up
                ctx.save();
                ctx.translate(-12, -60);
                ctx.rotate(-2.5);
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(12, 5, 12, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(12, -60);
                ctx.rotate(-0.5);
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(12, 5, 12, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (this.state === STATE.SPECIAL) {
                const shake = Math.sin(this.animFrame * 0.8) * 2;
                ctx.translate(shake, 0);
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#ffcc00';
                
                // Arms up
                ctx.save();
                ctx.translate(-12, -60);
                ctx.rotate(-2.5);
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(12, 5, 12, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(12, -60);
                ctx.rotate(-0.5);
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(12, 5, 12, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Mouth
                ctx.fillStyle = colors.eye;
                ctx.beginPath();
                ctx.arc(11, -60, 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.state === STATE.DEAD) {
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(-5, -40, 6, 12, -0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Rest arms
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(-8, -37, 6, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(8, -37, 6, 14, 0, 0, Math.PI * 2);
                ctx.fill();
            }

        } else {
            // == GIRL - Q版风格 ==
            ctx.translate(0, bobY);
            
            // Legs
            ctx.fillStyle = colors.pants;
            if (this.state === STATE.RUN || this.state === STATE.WIN) {
                let lOffset = (this.state===STATE.WIN) ? 0 : Math.sin(this.animFrame * 0.5) * 10;
                ctx.beginPath(); ctx.ellipse(-9 + lOffset, -8, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(11 - lOffset, -8, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(-9, -8, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(11, -8, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
            }

            // Body - Girl版
            const girlBodyGrad = ctx.createLinearGradient(0, -50, 0, -15);
            girlBodyGrad.addColorStop(0, colors.body);
            girlBodyGrad.addColorStop(1, '#c0392b');
            ctx.fillStyle = girlBodyGrad;
            ctx.beginPath();
            ctx.moveTo(-16, -48);
            ctx.quadraticCurveTo(-20, -35, -13, -10);
            ctx.lineTo(13, -10);
            ctx.quadraticCurveTo(20, -35, 16, -48);
            ctx.quadraticCurveTo(0, -55, -16, -48);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(160, 39, 30, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Head - Girl
            const girlHeadGrad = ctx.createRadialGradient(-1, -72, 10, 0, -68, 30);
            girlHeadGrad.addColorStop(0, '#fff0e6');
            girlHeadGrad.addColorStop(0.5, '#ffe0d2');
            girlHeadGrad.addColorStop(1, colors.skin);
            ctx.fillStyle = girlHeadGrad;
            ctx.beginPath(); ctx.arc(-1, -68, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.arc(-1, -65, 26, 0, Math.PI * 2); ctx.fill();

            // Hair - Girl
            ctx.fillStyle = colors.hair;
            ctx.beginPath();
            ctx.arc(-1, -75, 30, Math.PI * 0.8, Math.PI * 2.2);
            ctx.fill();
            
            // Hair shine
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath(); ctx.arc(-10, -85, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.arc(5, -91, 7, 0, Math.PI * 2); ctx.fill();
            
            // Hair side pieces
            if (this.type === 'treant') {
                ctx.fillStyle = '#689f38';
                drawEllipse(ctx, -20, -88, 17, 13, '#689f38');
                drawEllipse(ctx, 0, -93, 18, 15, '#7cb342');
                drawEllipse(ctx, 20, -88, 17, 13, '#8bc34a');
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                drawEllipse(ctx, -18, -91, 10, 8, 'rgba(255,255,255,0.25)');
                drawEllipse(ctx, 2, -95, 10, 9, 'rgba(255,255,255,0.25)');
            } else {
                drawEllipse(ctx, -22, -77, 13, 13, colors.hair);
                drawEllipse(ctx, 14, -79, 11, 11, colors.hair);
                // Ribbons
                ctx.fillStyle = colors.detail;
                ctx.fillRect(15, -77, 4, 13);
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fillRect(15, -75, 3, 5);
            }

            // Eyes - Girl (bigger)
            if (this.state === STATE.HIT || this.state === STATE.DEAD) {
                ctx.fillStyle = colors.eye;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(3, -70); ctx.lineTo(9, -64); ctx.lineTo(3, -58);
                ctx.moveTo(13, -70); ctx.lineTo(19, -64); ctx.lineTo(13, -58);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(11, -56, 4, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
            } else if (this.state === STATE.BLOCK) {
                ctx.fillStyle = colors.eye;
                ctx.fillRect(4, -69, 5, 2);
                ctx.fillRect(13, -69, 5, 2);
            } else if (this.state === STATE.WIN) {
                ctx.fillStyle = colors.eye;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(7, -67, 3.5, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, -67, 3.5, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(11, -60, 4.5, 0, Math.PI); ctx.stroke();
            } else {
                // Normal eyes - Girl
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.beginPath(); ctx.arc(5, -68, 5.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(17, -68, 5.5, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = colors.eye;
                ctx.beginPath(); ctx.arc(6, -67, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(18, -67, 3, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(7.5, -69, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(19.5, -69, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(5, -66, 1.1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(17, -66, 1.1, 0, Math.PI * 2); ctx.fill();
                
                // Eyelashes
                ctx.strokeStyle = colors.eye;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(2, -73); ctx.lineTo(0, -75); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(8, -73); ctx.lineTo(10, -75); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(12, -73); ctx.lineTo(10, -75); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(18, -73); ctx.lineTo(20, -75); ctx.stroke();
                
                // Mouth
                ctx.strokeStyle = colors.eye;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(11, -56, 3.5, 0.2, Math.PI - 0.2);
                ctx.stroke();
                
                // Blush - Girl
                ctx.fillStyle = 'rgba(255, 130, 180, 0.4)';
                ctx.beginPath(); ctx.arc(-4, -62, 6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(26, -62, 6, 0, Math.PI * 2); ctx.fill();
            }

            // Girl Arms
            if (this.state === STATE.ATTACK) {
                ctx.save();
                if (this.isCrit) { ctx.shadowBlur = 20; ctx.shadowColor = '#ff5252'; }
                let swing = Math.sin(this.animFrame * 0.2);
                ctx.translate(12, -55);
                ctx.rotate(swing - 0.5);
                
                const armGrad = ctx.createLinearGradient(0, 0, 20, 8);
                armGrad.addColorStop(0, colors.skin);
                armGrad.addColorStop(1, '#d7a896');
                ctx.fillStyle = armGrad;
                ctx.beginPath();
                ctx.ellipse(10, 4, 11, 6, 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            } else if (this.state === STATE.BLOCK) {
                ctx.save();
                ctx.translate(15, -55);
                ctx.rotate(-1.5);
                const armGrad = ctx.createLinearGradient(0, 0, 20, 8);
                armGrad.addColorStop(0, colors.skin);
                armGrad.addColorStop(1, '#d7a896');
                ctx.fillStyle = armGrad;
                ctx.beginPath();
                ctx.ellipse(10, 4, 11, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (this.state === STATE.WIN) {
                ctx.save();
                ctx.translate(15, -65);
                ctx.rotate(-2.0);
                const armGrad = ctx.createLinearGradient(0, 0, 20, 8);
                armGrad.addColorStop(0, colors.skin);
                armGrad.addColorStop(1, '#d7a896');
                ctx.fillStyle = armGrad;
                ctx.beginPath();
                ctx.ellipse(10, 4, 11, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (this.state === STATE.SPECIAL) {
                const shake = Math.sin(this.animFrame * 1.2) * 3;
                ctx.translate(shake, 0);
                ctx.shadowBlur = 40;
                ctx.shadowColor = '#ff5252';
                
                const armGrad = ctx.createLinearGradient(0, -45, 0, -35);
                armGrad.addColorStop(0, colors.skin);
                armGrad.addColorStop(1, '#d7a896');
                ctx.fillStyle = armGrad;
                
                ctx.save();
                ctx.translate(-10, -45);
                ctx.rotate(0.8);
                ctx.beginPath();
                ctx.ellipse(-7, 4, 11, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(10, -45);
                ctx.rotate(-0.8);
                ctx.beginPath();
                ctx.ellipse(7, 4, 11, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                drawEllipse(ctx, 0, 5, 30 + shake, 10, 'rgba(255, 82, 82, 0.3)');
                drawEllipse(ctx, 0, 5, 20 + shake, 6, 'rgba(255, 204, 188, 0.5)');
            } else if (this.state === STATE.DEAD) {
                ctx.fillStyle = colors.body;
                ctx.beginPath();
                ctx.ellipse(-5, -40, 6, 12, -0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Rest arms - Girl
                ctx.fillStyle = colors.skin;
                ctx.fillRect(-12, -47, 5, 18);
                ctx.fillRect(7, -47, 5, 18);
                // Hands
                ctx.fillStyle = '#d4a574';
                ctx.fillRect(-12, -30, 5, 4);
                ctx.fillRect(7, -30, 5, 4);
            }
        }

        ctx.restore();
    }
}
